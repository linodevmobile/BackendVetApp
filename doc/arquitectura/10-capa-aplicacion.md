> Última actualización: 2026-04-29 · Schema: v2.3

# 10 — Capa de aplicación (Node)

## Topología

```
src/
├── app.js          # Express app: middlewares, routes, error handler
├── server.js       # Bootstrap: app.listen(PORT)
├── config/
│   ├── supabaseClient.js   # supabase (anon), supabaseAdmin (service_role), supabaseForToken(jwt)
│   └── openaiClient.js     # OpenAI SDK instance
├── middlewares/
│   ├── authMiddleware.js   # Bearer JWT → req.user, req.veterinarianId, req.supabase
│   ├── validate.js         # Zod schema → 400 si falla
│   ├── errorHandler.js     # Captura AppError + errores no controlados
│   ├── responseWrapper.js  # res.ok / res.fail
│   ├── rateLimiters.js     # authLimiter, processLimiter
│   ├── requestId.js        # X-Request-ID por request
│   └── upload.js           # Multer config
├── routes/                 # Definiciones Express por dominio
├── controllers/            # Handlers HTTP
├── services/               # Lógica externa (LLM, Whisper, Storage, promptRouter)
├── repositories/           # Queries Supabase
├── prompts/                # Prompts IA por sección (texto en español)
├── validators/             # Zod schemas
└── utils/                  # AppError, logger, sectionLabels, etc.
```

## Capas y responsabilidades

| Capa | Responsabilidad | NO debe |
|---|---|---|
| **routes** | Conectar path → controller, aplicar middlewares (validate, multer) | Tener lógica de negocio |
| **controllers** | Parsear req, orquestar servicios/repos, devolver `res.ok` / `res.fail` | Hablar con Supabase directo, construir queries SQL |
| **services** | Lógica externa o transversal (IA, Storage, prompt routing) | Conocer el formato HTTP (req/res) |
| **repositories** | Queries CRUD a Supabase con filtros/joins | Construir respuestas HTTP, llamar IA, etc. |
| **validators** | Schemas Zod por dominio | Lógica de negocio o queries |
| **utils** | Helpers puros sin estado (AppError, logger, parsing) | I/O |

## `app.js` — orden de middlewares y rutas

```js
app.use(cors());
app.use(express.json());
app.use(requestId);          // X-Request-ID en cada request
app.use(responseWrapper);    // expone res.ok / res.fail

app.get('/health', ...);     // warmup, sin auth

app.use('/auth', authLimiter, authRoutes);                              // rate-limited login/register
app.use('/veterinarians', authMiddleware, veterinarianRoutes);
app.use('/appointments', authMiddleware, appointmentRoutes);
app.use('/consultations', authMiddleware, consultationsCollectionRoutes);
app.use('/consultation', authMiddleware, processLimiter, consultationRoutes);
app.use('/ai', authMiddleware, processLimiter, aiRoutes);
app.use('/patients', authMiddleware, patientRoutes);
app.use(authMiddleware, alertRoutes);                                   // /patients/:id/alerts (mounted at root)

app.use(errorHandler);
```

> Nota: `/consultations` (collection — list, create) está separado de `/consultation/:id` (item — get, update sections, sign…) por convención que viene de iteraciones previas. Ambos están autenticados; el segundo lleva `processLimiter` por su volumen de IA.

## Middlewares

### `authMiddleware`

1. Lee `Authorization: Bearer <jwt>`.
2. Llama `supabase.auth.getUser(jwt)` (cliente anon).
3. Si OK, anota `req.user`, `req.veterinarianId`, `req.accessToken`, `req.supabase = supabaseForToken(jwt)`.
4. Si falla, lanza `AppError.unauthorized` → errorHandler responde 401.

### `validate({ body?, query?, params? })`

Recibe un objeto con uno o más schemas Zod (cualquier subset). Valida `req.body`, `req.query`, `req.params` contra ellos. Si falla, lanza `AppError.validation` con el `details` del error de Zod. Si pasa, mutates `req.<x>` con el resultado parseado (Zod hace coerción y defaults).

### `responseWrapper`

Adjunta dos métodos a `res`:

```js
res.ok(data, meta?, statusCode?)   // → { data, meta, error: null }
res.fail(code, message, statusCode?, details?)  // → { data: null, meta: null, error: {...} }
```

**Todos los endpoints devuelven la misma forma** `{ data, meta, error }`. Es un contrato estable para el cliente — `error===null` indica éxito.

### `errorHandler`

Captura cualquier `next(err)`:

- Si es `AppError`: log + respuesta con `{ code, message, details }`.
- Si es genérico: log + 500 con `code='INTERNAL'`. En no-producción, devuelve `details: err.message`; en producción, `details: null`.

### `rateLimiters`

- `authLimiter`: throttle a `/auth/*` (login/register), evita brute force.
- `processLimiter`: throttle a `/ai/*` y `/consultation/*`. Estos endpoints son caros (Whisper + GPT, varios MB de audio).

Configuración exacta en `src/middlewares/rateLimiters.js`.

### `requestId`

Genera `X-Request-ID` (UUID) por request si no viene del cliente. Logueado en `errorHandler` para correlacionar errores.

### `upload`

Multer config para multipart. Archivos temporales en `uploads/`. **No olvidar**: tras procesar (subir a Storage o transcribir), llamar `deleteLocalFile(file.path)` para no dejar disco lleno.

## Validators (Zod)

Un archivo por dominio en `src/validators/`. Patrón típico:

```js
const { z } = require('zod');

const createSchema = z.object({ ... });
const updateSchema = z.object({ ... }).refine(v => Object.keys(v).length > 0, {...});
const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

module.exports = { createSchema, updateSchema, listQuerySchema };
```

**Convenciones**:
- `z.coerce.number()` para query params (vienen como string desde URL).
- `.optional().default(...)` para defaults explícitos.
- `.refine(...)` para constraints multi-campo (ej: requiere uno de varios campos).

## Errores: `AppError`

```js
class AppError extends Error {
  constructor(code, message, statusCode, details) { ... }
}

AppError.validation(message, details)  // 400 VALIDATION_ERROR
AppError.unauthorized(message?)        // 401 UNAUTHORIZED
AppError.forbidden(message?)           // 403 FORBIDDEN
AppError.notFound(message?)            // 404 NOT_FOUND
AppError.conflict(message, details)    // 409 CONFLICT
AppError.internal(message?, details)   // 500 INTERNAL
```

Los controllers lanzan `AppError.x(...)` y dejan que `errorHandler` lo formatee. **No construyas respuestas de error a mano** — pasa por `AppError`.

## Repositorios

Cada repo expone funciones que reciben `(supabase, ...)`. El cliente Supabase viene del request (con JWT, RLS aplicada). Patrón:

```js
async function getById(supabase, vetId, id) {
  const { data, error } = await supabase.from('patients').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}
```

**Reglas**:
- **Nunca** importar `supabaseAdmin` directamente en un repo (eso bypassaría RLS). Excepción: `storageService` para uploads.
- Si una query devuelve `code: 'PGRST116'`, significa "no rows found" en `.single()`. El controller suele convertirlo a `AppError.notFound`.
- Para queries con relaciones, usar la sintaxis Supabase de embedding (`select('*, patient:patients(*)')`).

## Servicios

| Servicio | Función |
|---|---|
| `promptRouter` | Mapeo `section → prompt`, helpers `isAiSection`, `isValidSection`, listas `AI_SECTIONS`/`TAP_ONLY_SECTIONS`/`VALID_SECTIONS` |
| `llmService` | Llamada a OpenAI Chat Completions (`gpt-4o-mini`, JSON mode) |
| `transcriptionService` | Llamada a OpenAI Audio Transcriptions (`whisper-1`, `language: es`) |
| `storageService` | Uploads a Supabase Storage (audio, attachments) — usa `service_role` |

## Logger

`src/utils/logger.js`. Wrapper sobre console (info/warn/error) con timestamp y formato consistente. No hay integración con Sentry/Datadog hoy — si se agrega, encajarlo aquí.

## Cómo agregar un endpoint nuevo

1. **Validator**: define el schema Zod en `src/validators/<dominio>Schema.js`.
2. **Repo**: agrega la función en `src/repositories/<dominio>Repo.js`.
3. **Controller**: handler en `src/controllers/<dominio>Controller.js` que orquesta (validate → repo → res.ok).
4. **Route**: registra path en `src/routes/<dominio>Routes.js` con `validate({...})`.
5. **app.js**: si la subrouta es nueva, montarla con su middleware (auth, rate limiters).
6. **Postman**: agrega el request a `BackendVetApp.postman_collection.json` con descripción.
7. **Doc**: actualiza [11-endpoints.md](11-endpoints.md).

## Convenciones de código

- **CommonJS**, no ES modules. `require/module.exports`.
- **English** para identificadores, paths, columnas DB. **Español** solo para texto que ve el usuario o el modelo (mensajes de error en API, prompts).
- **No comentarios obvios**. Comentar solo el porqué no obvio (workaround, edge case, decisión de diseño).
- **Async/await**, no `.then().catch()`.
- **Errores siempre via `AppError`** o pasados a `next(err)`.
