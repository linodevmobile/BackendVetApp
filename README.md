# BackendVetApp

API backend para gestión de historias clínicas veterinarias en pequeños animales. La IA procesa audio o texto por sección clínica como utilidad pura (sin tocar DB) y devuelve transcripción + texto sugerido. El cliente decide cuándo persistir vía endpoints incrementales sobre `consultation_sections`.

## Arquitectura

Tres responsabilidades separadas:

1. **Utilidad IA (stateless)** — `POST /ai/process-section` recibe audio/texto + sección, devuelve `{ transcription, ai_suggested, suggested_text }`. No toca DB ni Storage. Ideal para regenerar resultados sin contaminar el estado.
2. **Lifecycle de consulta** — `POST /consultations` crea la consulta vacía al inicio (habilita pausa desde el primer momento).
3. **Persistencia incremental** — `PATCH /consultation/:id/sections/:section` acepta cualquier subset de campos (`text`, `content`, `transcription`, `ai_suggested`) + audio opcional. Sirve como autosave / blur / pause desde el cliente.

```
[cliente Flutter]
  ├── grabar audio → POST /ai/process-section → {transcription, ai_suggested, suggested_text}
  ├── editar texto en UI (estado local)
  └── sync (debounce 2s / blur sección / pause / sign)
        └── PATCH /consultation/:id/sections/:section { text, [audio], [transcription], [ai_suggested] }
```

## Stack

- **Node.js + Express 5** — API
- **OpenAI** — `whisper-1` (transcripción) + `gpt-4o-mini` (extracción estructurada JSON)
- **Supabase** — PostgreSQL + Storage + Auth (JWT)
- **Multer** — multipart uploads
- **Zod** — validación de requests
- **express-rate-limit** — throttling en auth y endpoints AI

## Setup

```bash
npm install
cp .env.example .env  # completar keys
```

### Variables de entorno

```
OPENAI_API_KEY=...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # requerido para Storage uploads y registro
PORT=3000
```

### Base de datos

Ejecutar `supabase_schema_v2.sql` en el SQL Editor de Supabase. **Nota**: el script ejecuta `DROP SCHEMA public CASCADE` — solo aplicar en dev/fresh project.

Define:
- Enums: `consultation_type`, `consultation_status`, `consultation_result`, `consultation_pause_reason`, `clinical_section` (12 valores en inglés), `appointment_status`, `alert_severity`, `patient_species`, `patient_sex`
- Tablas: `veterinarians`, `patients`, `patient_alerts`, `vet_favorite_patients`, `consultations`, `consultation_sections` (modelo híbrido), `consultation_attachments`, `appointments` + tablas Fase 2 hospitalización
- RLS authenticated por vet
- Buckets `consultations-audio` y `consultation-attachments`

## Ejecución

```bash
npm start       # producción
npm run dev     # dev con --watch
```

## Autenticación

Todos los endpoints excepto `/auth/*` requieren `Authorization: Bearer <access_token>`. El middleware valida el token contra Supabase y deriva `veterinarian_id` del JWT. El cliente nunca debe enviar `veterinarian_id` en el body.

## Wrapper de respuesta

```json
{ "data": ..., "meta": {...}, "error": null }
```

Errores:

```json
{ "data": null, "meta": null, "error": { "code": "...", "message": "...", "details": ... } }
```

Códigos: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL`, `RATE_LIMIT`.

## Endpoints

### Health (warmup)
- `GET /health` — sin auth. Devuelve `{ status: 'ok' }`. Usar desde el splash del cliente Flutter en fire-and-forget para despertar el server (Render free tier duerme tras inactividad).
- `GET /` — sin auth. Catálogo completo de endpoints + `valid_sections`. Útil para discovery, payload más pesado.

### Auth
- `POST /auth/register` — `{ email, password, full_name, license_number?, phone?, salutation? }` → `veterinarian` con `salutation` autocalculada (`Dr. <Apellido>`) si no se envía.
- `POST /auth/login` — `{ email, password }` → `{ session: { access_token, refresh_token, expires_at }, veterinarian }`.

### Veterinarians
- `GET /veterinarians/me` — perfil del vet autenticado.

### Patients
- `GET /patients?search=&filter=(all|today_agenda|favorites|recent)&limit=&offset=`
- `POST /patients` — `{ name, species, breed?, sex, date_of_birth | age_years, weight_kg?, microchip?, owner_name, owner_phone?, owner_email?, owner_address? }`
- `GET /patients/:id` — incluye `age_years`, `last_visit`, `has_alert`, `is_favorite`.
- `PATCH /patients/:id`
- `GET /patients/favorites`
- `POST /patients/favorites/:patient_id`
- `DELETE /patients/favorites/:patient_id`
- `POST /patients/:patient_id/alerts`, `GET /patients/:patient_id/alerts`
- `PATCH /patient-alerts/:id/deactivate`, `DELETE /patient-alerts/:id`
- `GET /patients/:id/preventive-care?kind=&upcoming=&days=&limit=&offset=` — vacunas + desparasitaciones aplicadas o programadas. `upcoming=true` filtra por `next_due_at` dentro de `days` (default 90). Cada item trae `status` derivado: `ok|soon|overdue|pending|applied`.
- `POST /patients/:id/preventive-care` — `{ kind: vaccination|deworming_internal|deworming_external, name, product?, applied_at?, next_due_at?, mode: plan|manual, consultation_id?, notes? }`. Debe traer al menos una de `applied_at` o `next_due_at`. Si trae `applied_at`, `applied_by_vet_id` se setea desde JWT.
- `PATCH /patients/:id/preventive-care/:event_id` — actualiza `name`, `product`, `applied_at`, `next_due_at`, `mode`, `consultation_id`, `notes`.
- `GET /patients/:id/preventive-care/suggested-plan` — proyecta plan WSAVA + regional Colombia según `species` + life_stage del paciente, cruzado con su historial. Items incluyen `applied: bool` y `next_due_at` proyectado. Catálogo en `src/data/preventive_care_plans.json`.

### Appointments
- `GET /appointments/today`
- `POST /appointments` — `{ patient_id, scheduled_at, reason?, status?, urgent? }`
- `PATCH /appointments/:id`, `DELETE /appointments/:id`

### Consultations (collection)
- `GET /consultations/recent?limit=4` — firmadas recientes.
- `GET /consultations?status=(in_progress|paused|signed)`.
- `POST /consultations` — crea consulta vacía. `{ patient_id, type? }` → `{ id, status: 'in_progress', ... }`.

### AI utility (stateless)
- `POST /ai/process-section` — multipart con **una** de:
  - `audio` (file, máx 20MB)
  - `text_input` (string)

  Más `section` (enum). Devuelve `{ section, transcription, ai_suggested, suggested_text }`. No persiste nada.

### Consultation (item)
- `GET /consultation/:id` — consulta con `sections` y `attachments` embebidos.
- `PATCH /consultation/:id/sections/:section` — multipart con cualquier subset:
  - `text` (string), `content` (JSON), `transcription` (string), `ai_suggested` (JSON)
  - `audio` (file opcional — se sube a Storage y se persiste como `audio_url`)

  Upsert parcial: si la fila no existe, se crea; si existe, se actualizan solo los campos provistos.
- `PATCH /consultation/:id/pause` — `{ reason: labs|imaging|procedure|owner|other, note? }`
- `PATCH /consultation/:id/resume`
- `PATCH /consultation/:id/sign` — `{ result: discharge|hospitalization|deceased|referred, summary?, primary_diagnosis? }` (alias `/close`)
- `POST /consultation/:id/attachments` — multipart `{ file, section?, label? }`
- `GET /consultation/:id/attachments`
- `DELETE /consultation/:id/attachments/:attachmentId`

## Secciones clínicas (12)

Enum `clinical_section`, dividido en dos grupos según si pasan o no por la utilidad IA:

### Con IA (9 — aceptan `POST /ai/process-section`)
`chief_complaint`, `anamnesis`, `physical_exam`, `problems`, `diagnostic_approach`, `complementary_exams`, `clinical_diagnosis`, `prescription`, `prognosis`.

### Tap-only (3 — solo `PATCH`, sin IA)
`food`, `vitals`, `treatment`. La UI escribe `content` estructurado directamente (dropdowns / inputs numéricos); no hay prompt ni audio.

`clinical_diagnosis` reemplaza a las antiguas `presumptive_diagnosis` y `definitive_diagnosis` — es una sola sección cuyo `content`/`ai_suggested` tiene la forma `{ presumptive_diagnosis, definitive_diagnosis }`.

Cada sección con IA tiene un prompt en `src/prompts/`. Los identificadores de routing son inglés; los labels visibles al doctor (español) viven en `src/utils/sectionLabels.js`. La sección `chief_complaint` es la única alimentada por audio del **dueño** (no del veterinario) — su prompt evita reinterpretación médica.

### Shape de `content` por sección (lo que el frontend envía en el PATCH)

| Sección | Shape de `content` |
|---|---|
| `chief_complaint` | `{ main_complaint: string }` |
| `anamnesis` | claves de anamnesis (`previous_illnesses`, `vaccination`, …) |
| `physical_exam` | 8 campos manuales (`mucosa`, `dehydration_percent`, `bcs`, `attitude_owner`, `attitude_vet`, `pulse`, `tllc_seconds`, `trcp_seconds`) + `systems_affected` (texto editable derivado de la IA) — ver Postman |
| `problems` | claves de problems |
| `diagnostic_approach` | claves de diagnostic_approach |
| `complementary_exams` | claves de complementary_exams |
| `clinical_diagnosis` | `{ presumptive_diagnosis: string, definitive_diagnosis: string }` |
| `prescription` | `{ prescription: string }` |
| `prognosis` | `{ prognosis: string, evolution: string }` |
| `food` | `{ regime: 'concentrate'\|'barf'\|'homemade'\|'mixed'\|'other' }` |
| `vitals` | `{ temperature_c, heart_rate_bpm, respiratory_rate_rpm, weight_kg }` (numbers) |
| `treatment` | `{ modality: 'ambulatory'\|'hospitalization' }` |

## Modelo de datos `consultation_sections`

| Campo | Propósito |
|---|---|
| `transcription` | Texto crudo del audio |
| `ai_suggested` | JSONB con la salida estructurada del LLM — audit trail |
| `text` | Texto final editable por el vet, lo que muestra/guarda la UI |
| `content` | JSONB opcional (estructura paralela a `ai_suggested` para edición) |
| `audio_url` | Path en Storage |
| `processed_at` | Timestamp del último procesamiento |

Como la utilidad IA es pura, el cliente regenera cuantas veces quiera sin pisar nada. Solo cuando hace `PATCH .../sections/:section` se persiste, y solo lo que envía.

## Estructura del proyecto

```
src/
├── config/         # Supabase + OpenAI clients
├── middlewares/    # auth, responseWrapper, errorHandler, validate, upload, requestId, rateLimiters
├── validators/     # zod schemas por dominio
├── controllers/    # orquestación (incluye aiController y consultationController)
├── repositories/   # acceso a tablas Supabase
├── services/       # llmService, promptRouter, transcriptionService, storageService
├── prompts/        # 9 prompts clínicos (secciones con IA) + _shared/transcriptionRules.js
├── routes/         # Express routers
├── utils/          # AppError, logger, safeJsonParse, flattenAiToText, sectionLabels, salutation
├── app.js
└── server.js
```

## Deploy

Render auto-despliega desde la rama configurada. Antes del primer deploy contra la v2:
1. Completar `SUPABASE_SERVICE_ROLE_KEY` en Environment.
2. Ejecutar `supabase_schema_v2.sql` en Supabase (o aplicar migraciones incrementales si ya hay datos).
3. Verificar buckets creados.

## Migraciones incrementales

Para DBs existentes que no se pueden resetear, hay scripts en `migrations/`:
- `migrations/v2.2_sections.sql` — actualiza el enum `clinical_section`: elimina `presumptive_diagnosis`/`definitive_diagnosis`, agrega `clinical_diagnosis`, `food`, `vitals`, `treatment`. Migra filas existentes (merge automático cuando un mismo consultation tiene presuntivo + definitivo). Idempotente: aborta si ya se aplicó.
- `migrations/v2.3_patient_measurements.sql` — agrega tabla `patient_measurements` (peso, vitales, BCS) + trigger que sincroniza `patients.weight_kg` como caché de la última medición. Idempotente.
- `migrations/v2.4_attachments.sql` — renombra `consultation_attachments` → `attachments`, lifts NOT NULL de `consultation_id`, agrega `patient_id` (NOT NULL) + `category` enum, trigger que autorrellena `patient_id` desde `consultation_id`. Idempotente.
- `migrations/v2.5_preventive_care.sql` — agrega tabla `patient_preventive_care` (vacunas + desparasitaciones internas/externas unificadas) + enums `preventive_care_kind`, `preventive_care_mode`. RLS por paciente del vet. Catálogo de plan sugerido (no en DB) vive en `src/data/preventive_care_plans.json`. Idempotente.
