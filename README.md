# BackendVetApp

API backend para gestión de historias clínicas veterinarias en pequeños animales. Recibe audio (o texto) por cada sección clínica, lo transcribe con OpenAI, extrae datos estructurados vía LLM y los persiste en Supabase con una capa editable por el vet.

## Flujo por sección

```
audio → transcripción (Whisper) → LLM (GPT) → ai_suggested (JSONB auditoría)
                                            → text (editable por vet, lo que UI muestra/guarda)
                                            → audio_url, processed_at
```

Alternativa: la misma ruta acepta `text_input` sin audio cuando el vet prefiere tipear.

## Stack

- **Node.js + Express 5** — API
- **OpenAI** — `whisper-1` (transcripción) + `gpt-4o-mini` (extracción estructurada)
- **Supabase** — PostgreSQL + Storage + Auth (JWT)
- **Multer** — multipart uploads
- **Zod** — validación de requests
- **express-rate-limit** — throttling en auth y process

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
SUPABASE_SERVICE_ROLE_KEY=...   # requerido para rollback en registro
PORT=3000
```

### Base de datos

Ejecutar `supabase_schema_v2.sql` en el SQL Editor de Supabase. **Nota**: el script ejecuta `DROP SCHEMA public CASCADE` — solo aplicar en dev/fresh project.

Define:
- Enums: `consultation_type`, `consultation_status`, `consultation_result`, `consultation_pause_reason`, `clinical_section` (9 valores), `appointment_status`, `alert_severity`, `patient_species`, `patient_sex`
- Tablas: `veterinarians`, `patients`, `patient_alerts`, `vet_favorite_patients`, `consultations`, `consultation_sections` (hybrid), `consultation_attachments`, `appointments` + tablas Fase 2 hospitalización
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

## Endpoints principales

### Auth
- `POST /auth/register` — `{ email, password, full_name, license_number?, phone?, salutation? }` → devuelve `veterinarian` con `salutation` (auto-calculada como `Dr. <Apellido>` si no se envía).
- `POST /auth/login` — `{ email, password }` → `{ session: { access_token, refresh_token, expires_at }, veterinarian }`.

### Veterinarians
- `GET /veterinarians/me` — perfil del vet autenticado.

### Patients
- `GET /patients?search=&filter=(all|today_agenda|favorites|recent)&limit=&offset=`
- `POST /patients` — acepta `age_years` (alternativa a `date_of_birth`).
- `GET /patients/:id` — incluye `age_years`, `last_visit`, `has_alert`, `is_favorite`.
- `PATCH /patients/:id`
- `GET /patients/favorites`
- `POST /patients/favorites/:patient_id`
- `DELETE /patients/favorites/:patient_id`
- `POST /patients/:patient_id/alerts`, `GET /patients/:patient_id/alerts`
- `PATCH /patient-alerts/:id/deactivate`, `DELETE /patient-alerts/:id`

### Appointments
- `GET /appointments/today`
- `POST /appointments` — `{ patient_id, scheduled_at, reason?, status?, urgent? }`
- `PATCH /appointments/:id`, `DELETE /appointments/:id`

### Consultation (dashboard views)
- `GET /consultations/recent?limit=4` — firmadas recientes.
- `GET /consultations?status=(in_progress|paused|signed)`.

### Consultation (flujo)
- `POST /consultation/process` — multipart con **una** de:
  - `audio` (file, máx 20MB)
  - `text_input` (string)

  Campos adicionales: `section` (enum), `consultation_id` (UUID — si se omite se crea), `patient_id` (requerido en primera llamada), `consultation_type` (routine|surgery|emergency), `chief_complaint` (string), `overwrite_text` (boolean — default false para preservar edición manual).
- `GET /consultation/:id` — consulta con `sections` y `attachments` embebidos.
- `PATCH /consultation/:id/sections/:section` — `{ text?, content? }` — solo muta lo editable; `ai_suggested` se preserva intacto.
- `PATCH /consultation/:id/pause` — `{ reason: labs|imaging|procedure|owner|other, note? }`
- `PATCH /consultation/:id/resume`
- `PATCH /consultation/:id/sign` — `{ result: discharge|hospitalization|deceased|referred, summary?, primary_diagnosis? }` (alias `/close`)
- `POST /consultation/:id/attachments` — multipart `{ file, section?, label? }`
- `GET /consultation/:id/attachments`
- `DELETE /consultation/:id/attachments/:attachmentId`

## Secciones clínicas (9)

`anamnesis`, `examen_fisico`, `problemas`, `abordaje_diagnostico`, `examenes_complementarios`, `diagnostico_presuntivo`, `diagnostico_definitivo`, `plan_terapeutico`, `pronostico_evolucion`.

Cada sección tiene un prompt propio en `src/prompts/`.

## Hybrid sections — modelo de datos

| Campo | Propósito |
|---|---|
| `transcription` | Texto crudo del audio |
| `ai_suggested` | JSONB con la salida estructurada del LLM — audit trail inmutable |
| `text` | Texto final editable por el vet, lo que muestra/guarda la UI |
| `content` | JSONB opcional (mirror estructurado si se parsea edición) |
| `audio_url` | Path en Storage |
| `processed_at` | Timestamp del último procesamiento |

Política: al re-procesar una sección que ya tiene `text` editado, el valor editado se **preserva** salvo `overwrite_text=true`.

## Estructura del proyecto

```
src/
├── config/         # Supabase + OpenAI clients
├── middlewares/    # auth, responseWrapper, errorHandler, validate, upload, requestId, rateLimiters
├── validators/     # zod schemas por dominio
├── controllers/    # orquestación
├── repositories/   # acceso a tablas Supabase
├── services/       # llmService, promptRouter, transcriptionService, storageService
├── prompts/        # 9 prompts clínicos
├── routes/         # Express routers
├── utils/          # AppError, logger, safeJsonParse, flattenAiToText, salutation
├── app.js
└── server.js
```

## Deploy

Render auto-despliega desde la rama configurada. Antes del primer deploy contra la v2:
1. Completar `SUPABASE_SERVICE_ROLE_KEY` en Environment.
2. Ejecutar `supabase_schema_v2.sql` en Supabase.
3. Verificar buckets creados.
