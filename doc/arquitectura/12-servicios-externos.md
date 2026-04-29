> Última actualización: 2026-04-29 · Schema: v2.3

# 12 — Servicios externos

El backend depende de tres servicios externos: **OpenAI** (transcripción + LLM), **Supabase** (Postgres + Auth + Storage), y **Render** (hosting). Esta sección documenta cómo se usan y qué credenciales requieren.

## OpenAI

### Modelos usados

| Función | Modelo | Cuándo |
|---|---|---|
| Transcripción audio → texto | `whisper-1` | `POST /ai/process-section` cuando viene `audio` |
| Extracción texto → JSON | `gpt-4o-mini` | `POST /ai/process-section` siempre (con audio o solo texto) |

Configuración:

- Whisper: `language: 'es'` (español argentino/latinoamericano).
- GPT-4o-mini: `temperature: 0.2`, `response_format: { type: 'json_object' }`.

Code: `src/services/transcriptionService.js`, `src/services/llmService.js`.

### Prompts

Un prompt por sección AI-backed, en `src/prompts/`. Los prompts:

- Están en **español** (dominio clínico).
- Devuelven JSON **plano** (sin objetos anidados — la UI espera key/value para flatten).
- Las keys del JSON son inglés (`presumptive_diagnosis`) y las labels para UI viven en `src/utils/sectionLabels.js` (en español).
- `chief-complaintPrompt.js` instruye preservar la voz del dueño (caso especial — ver [08-casos-especiales.md](08-casos-especiales.md)).

### Costos y limits

- Whisper: ~$0.006 por minuto de audio.
- gpt-4o-mini: ~$0.15/M input tokens, $0.60/M output tokens.
- Limit aplicado vía `processLimiter` (express-rate-limit) en `/ai/*` y `/consultation/*`.
- En caso de fallo OpenAI: el controller propaga el error como `INTERNAL` (500). El cliente debe reintentar; no hay retry automático en el backend.

### Variables de entorno

```
OPENAI_API_KEY=sk-...
```

### Cómo cambiar de modelo

1. Edita `llmService.js` o `transcriptionService.js`.
2. Si el JSON de salida cambia shape, ajusta los prompts y posiblemente el `flattenAiToText` de la sección.
3. Documenta en `decisiones.md` el por qué del cambio (precio, calidad, latencia).

## Supabase

### Componentes usados

| Componente | Para qué |
|---|---|
| **Postgres** | Toda la persistencia (`public` schema) |
| **Auth** | Login/register, JWTs |
| **Storage** | Buckets `consultations-audio` y `consultation-attachments` |
| **PostgREST** | API REST automática usada por el SDK de Supabase desde el backend |

> **No** usamos: Realtime, Edge Functions, Vector store. Si en el futuro se agregan, encajar aquí.

### Clientes

`src/config/supabaseClient.js` exporta tres clientes:

```js
const supabase = createClient(URL, ANON_KEY);                    // anon — para validar JWTs
const supabaseAdmin = createClient(URL, SERVICE_ROLE_KEY);       // service_role — Storage uploads
const supabaseForToken = (jwt) => createClient(URL, ANON_KEY,
  { global: { headers: { Authorization: `Bearer ${jwt}` } } });  // anon + JWT del usuario
```

| Cliente | Cuándo usar | Bypassa RLS |
|---|---|---|
| `supabase` | Solo en `authMiddleware` para `getUser(jwt)` | No |
| `supabaseAdmin` | Solo en `storageService` para uploads | **Sí** |
| `supabaseForToken(jwt)` | Toda query de negocio (asignado a `req.supabase`) | No (RLS aplica) |

> Regla: **un repo nunca importa `supabaseAdmin`**. Si lo necesita, repensar la solución.

### Storage

Dos buckets privados (no públicos):

- `consultations-audio`: audios de las secciones AI-backed.
- `consultation-attachments`: archivos adjuntos a la consulta (lab, imagen, recetas, otros).

**Path naming**: `<uuid>.<ext>` — sin estructura por carpetas. La asociación con paciente/consulta vive en la tabla (`consultation_sections.audio_url`, `consultation_attachments.storage_path`).

**Acceso**: las URLs son privadas. Para servir un archivo al cliente, generar **signed URL** con tiempo de expiración (no implementado en endpoints actuales — pendiente para Fase 2 cuando el cliente necesite descargar adjuntos).

**Upload**: vía `supabaseAdmin` (service_role) — RLS de Storage requiere autenticación distinta a JWT del usuario. Decisión documentada en [decisiones.md](decisiones.md).

### Auth

- Vet hace login en `POST /auth/login` con email + password.
- Supabase devuelve `access_token` (JWT) y `refresh_token`.
- El frontend guarda y reenvía `Authorization: Bearer <access_token>` en cada request.
- `authMiddleware` valida con `supabase.auth.getUser(token)` por cada request (sin cache — Supabase hace el lookup local).

**Refresh**: el cliente debe manejar refresh de tokens. El backend no implementa endpoint de refresh — usa el SDK de Supabase del lado cliente.

**Linkeo con `veterinarians`**: cuando se registra un usuario, se inserta una fila en `veterinarians` con el mismo `id` que `auth.users`. Si esto no ocurre (usuario creado en Supabase Dashboard manualmente), las queries fallarán por FK violation. Hay que crear ambas filas.

### Migraciones

Archivos en `migrations/` con naming `v<X.Y>_<feature>.sql`. **Aplicación manual** vía SQL Editor de Supabase Dashboard (no hay CLI ni framework de migrations integrado todavía).

**Idempotencia**: cada migración tiene un guard `DO $guard$ ... RAISE EXCEPTION ...` al inicio que detecta si ya se aplicó. Permite re-correr el archivo sin errores.

`supabase_schema_v2.sql` es el **schema consolidado** (espejo de migraciones aplicadas). Se usa para:
- Bootstrap de un entorno nuevo desde cero (DROP SCHEMA + recrear).
- Referencia rápida de la estructura sin tener que leer todas las migraciones.

### Variables de entorno

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> ⚠️ La `SERVICE_ROLE_KEY` bypassa RLS — **nunca** subir a git ni exponer al cliente. Vive solo en `.env` del backend.

## Render (hosting)

- Despliegue automático desde rama `master` (configurable).
- Cold-start ~30s tras inactividad → mitigado con `GET /health` desde el splash de la app móvil.
- Variables de entorno se configuran en Render Dashboard (no `.env` en producción).
- Logs centralizados en Render; no hay integración con Sentry/Datadog hoy.

## Variables de entorno (resumen completo)

| Variable | Requerida | Notas |
|---|---|---|
| `OPENAI_API_KEY` | Sí | Whisper + GPT |
| `SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Sí | Cliente público |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Backend (Storage uploads) |
| `PORT` | No (default 3000) | Puerto del server |
| `NODE_ENV` | No | `production` / `development`. Afecta verbosidad de errores |

`.env.example` en el repo lista todas con valores de ejemplo.

## Cómo agregar un servicio externo nuevo

1. **Cliente**: crear archivo en `src/config/<servicio>Client.js` con SDK + creds desde `process.env`.
2. **Service**: lógica en `src/services/<servicio>Service.js` con interfaz limpia.
3. **Variables**: documentar en este archivo + `.env.example`.
4. **Decisión**: agregar entrada en `decisiones.md` explicando por qué se eligió.
5. **Failure mode**: definir qué pasa si el servicio falla (timeout, retry, fallback).
