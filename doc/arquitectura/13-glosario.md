> Última actualización: 2026-04-29 · Schema: v2.3

# 13 — Glosario

Términos clínicos veterinarios y técnicos del proyecto. Para que un dev sin background en medicina veterinaria entienda qué representa cada cosa.

## Términos clínicos

| Término | Significado |
|---|---|
| **Anamnesis** | Historia que cuenta el dueño sobre el paciente: cuándo empezó el problema, antecedentes, alimentación, vacunación, parásitos. Sección clínica `anamnesis`. |
| **Motivo de consulta** (chief complaint) | Razón inmediata por la que el dueño trajo al paciente. Se expresa en sus palabras (sección `chief_complaint`). |
| **Examen físico** | Exploración del paciente realizada por el vet: signos vitales, palpación, auscultación, etc. Sección `physical_exam`. |
| **Signos vitales** (vitals) | Mediciones objetivas: temperatura corporal, frecuencia cardíaca, frecuencia respiratoria, peso. Sección tap-only `vitals`. |
| **BCS** (Body Condition Score) | Escala 1/9 a 9/9 (caquexia → obesidad mórbida) que valora condición corporal. 5/9 es ideal. Se captura como string en `physical_exam.content.bcs`. |
| **TLLC** (Tiempo de llenado capilar) | Segundos que tarda el lecho capilar en re-llenarse tras presión. Indicador de perfusión. Campo `tllc_seconds`. |
| **TRCP** (Tiempo de retorno de la coloración pupilar) — usar el nombre que esté en el dominio | Otro indicador clínico. Campo `trcp_seconds`. |
| **Mucosa** | Color de la mucosa oral. Indicador de oxigenación/perfusión. Valores: `pink`/`pale`/`jaundiced`/`cyanotic`/`congested`. |
| **Anamnesis vs anamnesis remota** | El sistema modela una sola sección `anamnesis` (sin separar reciente/remota). Si crece la necesidad, se modelaría con sub-secciones. |
| **Diagnóstico presuntivo** | Hipótesis diagnóstica antes de confirmar con exámenes complementarios. Campo `presumptive_diagnosis` dentro de `clinical_diagnosis`. |
| **Diagnóstico definitivo** | Diagnóstico confirmado tras estudios. Campo `definitive_diagnosis` dentro de `clinical_diagnosis`. |
| **Pronóstico** | Predicción de evolución (favorable, reservado, grave). Sección `prognosis`. |
| **Pauta** / Receta / Prescripción | Indicación de medicamentos, dosis, vía, frecuencia, duración. Sección `prescription`. |
| **Hospitalización** vs **ambulatorio** | Si el paciente queda internado o vuelve a casa. Capturado en `treatment.content.modality`. |
| **Fluidoterapia** | Administración de fluidos IV. Tipo de orden `medical_orders.type='fluid'` (Fase 2). |
| **Polivalente (DHPPi-L)** | Vacuna combinada para perro: distemper, hepatitis, parvovirus, parainfluenza, leptospirosis. Mencionado en mockup de UI; no modelado todavía en backend. |
| **WSAVA** | World Small Animal Veterinary Association. Sus guías de vacunación se referencian en mockup; sin implementación backend hoy. |

## Términos técnicos del proyecto

| Término | Significado |
|---|---|
| **Sección clínica** (clinical_section) | Cada bloque en el que se descompone una consulta. Hay 12 valores en el enum (ver [04-enums.md](04-enums.md)). |
| **AI-backed section** | Sección que pasa por `POST /ai/process-section` (audio → texto → JSON). 9 secciones. |
| **Tap-only section** | Sección capturada como `content` estructurado desde la UI sin pasar por IA. 3 secciones (`food`, `vitals`, `treatment`). |
| **Lifecycle de consulta** | Estados que atraviesa: `in_progress → paused/in_progress → signed`. |
| **Firma de consulta** | Marcar `status='signed'`, registrar `signed_at`, `result`. Documento clínico cerrado. **Dispara sync a `patient_measurements`**. |
| **Hybrid storage** | Patrón en `consultation_sections` que mantiene transcripción cruda + JSON IA + texto editado + content estructurado. Ver [08-casos-especiales.md](08-casos-especiales.md). |
| **Caché derivado** (`patients.weight_kg`) | Campo poblado por trigger desde otra tabla. No se edita directamente. |
| **Source-of-truth** | Tabla/columna autoritativa. Ej: `patient_measurements` es source-of-truth de signos vitales históricos. `patients.weight_kg` es solo caché. |
| **Sync hook** | Punto donde el código (o trigger) propaga datos de una entidad a otra. Ej: `consultationsRepo.sign` invoca `measurementsRepo.syncFromConsultation`. |
| **Idempotencia** | Repetir una operación produce el mismo resultado. Garantizada por UNIQUE indexes parciales (ej: `uq_measurements_consultation`). |
| **Upsert parcial** | Insert si no existe, update solo de los campos provistos si existe. Patrón de `sectionsRepo.upsertPartial`. |
| **Decorate** (en repositorios) | Función que agrega campos derivados a una entidad antes de devolverla (ej: `age_years`, `last_visit`, `is_favorite` en `patientsRepo.decorate`). |
| **Promptrouter** | Mapeo `section → prompt` + helpers `isAiSection`/`isValidSection`. Centraliza la lista de secciones válidas. |
| **Flatten AI to text** | Función que convierte JSON del LLM en texto labelizado (en español) para mostrar al vet. `src/utils/flattenAiToText.js`. |
| **Section labels** | Mapping de keys inglesas del JSON IA a labels en español para UI. `src/utils/sectionLabels.js`. |
| **Service role** | Clave Supabase que bypassa RLS. Solo para uploads en Storage. Ver [07-rls.md](07-rls.md). |
| **anon key** | Clave Supabase pública del proyecto. Usada con o sin JWT del usuario. RLS aplica. |
| **`req.supabase`** | Cliente Supabase con el JWT del vet autenticado. Asignado por `authMiddleware`. RLS aplica con `auth.uid() = vet_id`. |
| **`req.veterinarianId`** | Convenience: ID del vet autenticado, igual a `auth.uid()`. Usado en filtros explícitos. |
| **AppError** | Clase de error del proyecto con `code`, `statusCode`, `details`. El `errorHandler` la convierte en respuesta uniforme. |
| **Response wrapper** | Middleware que adjunta `res.ok(data, meta?)` y `res.fail(code, msg, status?, details?)` para mantener la forma `{ data, meta, error }` consistente. |
| **Postman environment** | Archivo JSON con `base_url`, `access_token`, `patient_id`, etc. para no hardcodear en cada request. Hay uno para local y otro para producción. |
| **Cold start** | Primer request a Render tras inactividad (~30s). Mitigado con `GET /health` desde el splash de la app móvil. |

## Stack acrónimos

| Sigla | Significado |
|---|---|
| **RLS** | Row Level Security (Postgres feature de aislamiento por fila) |
| **JWT** | JSON Web Token (token de auth firmado) |
| **FK** | Foreign Key |
| **PK** | Primary Key |
| **UK** | Unique Key |
| **JSONB** | JSON Binary (Postgres tipo de columna JSON con índices) |
| **API** | Application Programming Interface |
| **REST** | Representational State Transfer |
| **CRUD** | Create / Read / Update / Delete |
| **MER** | Modelo Entidad-Relación |
| **ADR** | Architecture Decision Record |
| **EHR** | Electronic Health Record (historia clínica electrónica) |
| **LLM** | Large Language Model |
| **OAI** | OpenAI |

## Cómo extender este glosario

Cuando aparezca un término clínico o técnico que un dev nuevo no entendería sin contexto, agrégalo aquí con una definición de 1-2 líneas. Si la explicación crece más, **lleva el detalle al archivo correspondiente** (caso especial, flujo, etc.) y deja en el glosario solo un puntero corto.
