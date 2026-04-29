> Última actualización: 2026-04-29 · Schema: v2.3

# 01 — Visión general

## Qué hace el sistema

Backend API REST para una aplicación móvil (Flutter) de **historia clínica veterinaria de pequeños animales**. El veterinario dicta por audio durante la consulta y la app móvil envía esos audios al backend, que los transcribe y los procesa con un LLM para extraer información clínica estructurada por sección (anamnesis, examen físico, diagnóstico, etc.).

La historia clínica resultante queda persistida en Supabase (PostgreSQL) y se firma como documento clínico al cierre de la consulta.

## Stack tecnológico

| Capa | Tecnología | Notas |
|---|---|---|
| Runtime | **Node.js** (LTS) | CommonJS (`require`/`module.exports`), no ES modules |
| HTTP | **Express 5** | Middlewares estándar (cors, json), error-handler centralizado |
| Validación | **Zod** | Schemas en `src/validators/`, middleware `validate.js` |
| Auth | **Supabase Auth (JWT)** | El backend valida el token con `supabase.auth.getUser()` por cada request autenticado |
| DB | **PostgreSQL** (Supabase managed) | RLS activo, schema `public` |
| Storage | **Supabase Storage** | Buckets `consultations-audio` y `consultation-attachments` (privados) |
| Transcripción | **OpenAI `whisper-1`** | Audio → texto en español |
| LLM | **OpenAI `gpt-4o-mini`** | Texto → JSON estructurado por sección, `temperature=0.2`, `response_format=json_object` |
| Upload multipart | **Multer** | Archivos temporales en `uploads/` que luego se suben a Storage y se borran del disco |
| Rate limiting | **express-rate-limit** | Aplicado a `/auth/*` y endpoints de procesamiento |
| Hosting | **Render** | Cold-start mitigado con `GET /health` desde el splash de la app |

## Dominio: paciente, dueño, consulta

- **Paciente**: animal (perro, gato o exótico). Cada paciente pertenece al **veterinario que lo dio de alta** (`patients.created_by_vet_id`). Otros vets pueden ver el paciente solo si lo marcan como **favorito**.
- **Dueño** (owner): persona responsable del paciente. Sus datos viven embebidos en `patients` (`owner_name`, `owner_phone`, `owner_email`, `owner_address`). No hay tabla `owners` separada — un paciente tiene exactamente un dueño y la duplicación es controlada.
- **Consulta** (`consultations`): visita médica. Tiene un ciclo de vida: `in_progress → paused/in_progress → signed`. Una consulta firmada es un documento clínico inmutable (auditable).
- **Sección clínica** (`consultation_sections`): la consulta se descompone en 12 secciones (anamnesis, examen físico, diagnóstico, prescripción, etc.). Cada sección se captura, edita y guarda independientemente. Ver [casos especiales](08-casos-especiales.md) para la diferencia entre secciones AI-backed y tap-only.
- **Medición clínica** (`patient_measurements`): evento de medición de signos vitales (peso, temperatura, FC, FR, BCS) con fuente y timestamp. Permite gráficas evolutivas independientes del estado de la consulta.

## Principio arquitectónico clave

La IA es una **utilidad pura sin estado**. El endpoint `POST /ai/process-section` recibe audio o texto + sección y devuelve `{ transcription, ai_suggested, suggested_text }`. **No toca DB ni Storage**. La app móvil decide cuándo y qué persistir, vía endpoints incrementales sobre `consultation_sections`. Esto permite regenerar resultados de IA sin contaminar el estado.

Ver [decisiones.md](decisiones.md) para el contexto histórico de esta separación.

## Estructura del repositorio

```
BackendVetApp/
├── src/
│   ├── app.js                    # Express app: middlewares, rutas, error handler
│   ├── server.js                 # Bootstrap (port, listen)
│   ├── config/                   # Clientes externos (supabaseClient, openaiClient)
│   ├── middlewares/              # Auth, validate, errorHandler, responseWrapper, rateLimiters, requestId, upload
│   ├── routes/                   # Definición de rutas Express por dominio
│   ├── controllers/              # Handlers HTTP (parsing req → llamada a repo → res.ok / res.fail)
│   ├── services/                 # Lógica de aplicación: promptRouter, llmService, transcriptionService, storageService
│   ├── repositories/             # Acceso a Supabase / Postgres (consultas, upserts, joins)
│   ├── prompts/                  # Prompts de IA por sección (español, dominio clínico)
│   ├── validators/               # Schemas Zod por dominio
│   └── utils/                    # AppError, logger, sectionLabels, flattenAiToText, safeJsonParse, salutation
├── migrations/                   # SQL versionado (v2.X_<feature>.sql)
├── doc/
│   ├── arquitectura/             # Esta documentación
│   ├── desing/                   # Diseño UI (Flutter handoff, mockups)
│   └── RestructuracionBackend.md
├── supabase_schema_v2.sql        # Schema consolidado (espejo de migraciones)
├── BackendVetApp.postman_collection.json
├── BackendVetApp.postman_environment*.json
├── README.md                     # Quick start
├── GUIA_DESARROLLO.md            # Workflow de desarrollo
├── API_SPEC_DASHBOARD_PATIENTS.md  # Spec de un endpoint específico
├── CLAUDE.md                     # Instrucciones para asistentes de IA
└── package.json
```

### Capas y responsabilidades

```
[ HTTP request ]
       ↓
   middlewares  (auth, validate, rate-limit, requestId, multer)
       ↓
   routes       (definición Express, conecta path → controller)
       ↓
   controllers  (parsea req, orquesta servicios/repos, devuelve res.ok / res.fail)
       ↓
   services     (lógica de aplicación: promptRouter, llmService, transcriptionService, storageService)
       ↓
   repositories (queries a Supabase: select, insert, upsert, joins)
       ↓
   PostgreSQL   (RLS + triggers)
```

Reglas:

- **Controllers no hablan con Supabase directo**: pasan por repositorios.
- **Repositorios no construyen respuestas HTTP**: devuelven datos puros o lanzan errores. El wrapping `{ data, meta, error }` lo hace el controller con `res.ok` / `res.fail`.
- **Services** son lógica que no cabe en un repo (procesar IA, transcribir, subir archivos). Llamados desde controllers.
- **Middlewares** son cross-cutting: corren para todas (o muchas) rutas. Validación de body es middleware Zod (`validate.js`).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm install` | Instala dependencias |
| `npm start` | Arranca el server (`node src/server.js`) |
| `npm run dev` | Arranca con `--watch` (recarga automática en cambios) |

## Variables de entorno

Listado completo en [12-servicios-externos.md](12-servicios-externos.md). Las críticas:

- `OPENAI_API_KEY`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `PORT`
- `NODE_ENV` (afecta verbosidad de errores: en producción no se devuelve `details` de errores no-AppError).
