# Guía de Desarrollo — BackendVetApp

Backend v2 (reestructurado). Arquitectura en capas: `middlewares → routes → controllers → repositories → services`. La IA es ahora una utilidad pura desacoplada del lifecycle de la consulta.

---

## 1. Servidor local

```bash
npm run dev     # con --watch, reinicia al guardar
npm start       # modo producción
```

URL: `http://localhost:3000`. Detener con `Ctrl+C`.

Primer setup en máquina nueva:
```bash
npm install
cp .env.example .env   # rellenar keys
```

---

## 2. Probar cambios

Todos los endpoints (excepto `/auth/*`) exigen `Authorization: Bearer <access_token>`. Obtener token con `POST /auth/login`.

### Postman
1. Collection actualizada: `BackendVetApp.postman_collection.json`.
2. Environment `base_url=http://localhost:3000`. Scripts de test guardan `access_token` automáticamente en login.
3. Requests protegidos usan `{{access_token}}` en el header.

### curl

```bash
# Warmup (sin auth) — usar desde el splash de Flutter para despertar Render
curl http://localhost:3000/health

# Login
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"vet@example.com","password":"secret123"}'

# Crear consulta vacía (al iniciar)
curl -X POST http://localhost:3000/consultations \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"patient_id":"<uuid>","type":"routine"}'

# Procesar audio con IA (sin persistir nada)
curl -X POST http://localhost:3000/ai/process-section \
  -H "Authorization: Bearer $TOKEN" \
  -F "audio=@mi-audio.mp3" \
  -F "section=anamnesis"

# Procesar texto (sin audio) con IA
curl -X POST http://localhost:3000/ai/process-section \
  -H "Authorization: Bearer $TOKEN" \
  -F "section=physical_exam" \
  -F "text_input=Mucosas rosadas, FC 120, peso 8.2 kg."

# Guardar sección (autosave / blur / pause). Cualquier subset:
curl -X PATCH http://localhost:3000/consultation/<consultation_id>/sections/anamnesis \
  -H "Authorization: Bearer $TOKEN" \
  -F "text=Texto editado por el doctor"

# Guardar sección con audio + transcripción + ai_suggested
curl -X PATCH http://localhost:3000/consultation/<consultation_id>/sections/anamnesis \
  -H "Authorization: Bearer $TOKEN" \
  -F "audio=@mi-audio.mp3" \
  -F "text=Texto final" \
  -F "transcription=Texto crudo de Whisper" \
  -F 'ai_suggested={"previous_illnesses":"..."}'
```

---

## 3. Ajustar un prompt

1. Editar el archivo correspondiente en `src/prompts/` (ej: `prescriptionPrompt.js`).
2. Guardar — `npm run dev` auto-reinicia.
3. Probar vía Postman/curl contra `POST /ai/process-section`.

Los 10 prompts viven en español (instrucciones al LLM); claves JSON en inglés (identificadores). El bloque común de corrección de transcripción vive en `src/prompts/_shared/transcriptionRules.js` y se importa por concatenación. La sección `chief_complaint` NO incluye este bloque (su voz es la del dueño, no del veterinario).

Para cambiar los labels que ve el doctor (español), editar `src/utils/sectionLabels.js`.

---

## 4. Agregar una sección clínica nueva

1. Crear `src/prompts/miNuevaSeccionPrompt.js` (importar `_shared/transcriptionRules` si aplica).
2. Registrar en `src/services/promptRouter.js` con la clave exacta del enum.
3. Agregar el valor al enum `clinical_section`:
   ```sql
   ALTER TYPE clinical_section ADD VALUE 'mi_nueva_seccion';
   ```
4. Agregar el diccionario de labels ES en `src/utils/sectionLabels.js` para que la UI muestre el JSON con etiquetas en español.

La tabla `consultation_sections` ya guarda cualquier sección válida sin cambios adicionales.

---

## 5. Agregar un recurso/endpoint nuevo

Patrón por capa:

1. **SQL** — tabla + RLS en `supabase_schema_v2.sql`.
2. **Repository** — `src/repositories/xRepo.js` (funciones puras que reciben `supabase` como primer arg).
3. **Validator** — `src/validators/xSchema.js` con zod.
4. **Controller** — `src/controllers/xController.js` con `res.ok(...)` / `next(err)`.
5. **Routes** — `src/routes/xRoutes.js` con `validate({ body, query, params })`.
6. **app.js** — `app.use('/x', authMiddleware, xRoutes)`.

Todo controller usa `req.supabase` (cliente scope-del-token) y `req.veterinarianId`.

---

## 6. Tabla `consultation_sections`

Modelo híbrido: `transcription` (raw) + `ai_suggested` (JSONB audit) + `text` (editable, mostrado en UI) + `content` (JSONB opcional) + `audio_url` + `processed_at`.

`PATCH /consultation/:id/sections/:section` hace upsert parcial: solo escribe los campos provistos. Si la fila no existe, se crea. Como la IA es ahora pura (no escribe), no hay riesgo de pisar ediciones manuales: el cliente decide qué mandar.

---

## 7. Errores

Usar `AppError.validation()`, `.unauthorized()`, `.forbidden()`, `.notFound()`, `.conflict()`, `.internal()`. El `errorHandler` los convierte en el wrapper `{ error: { code, message, details } }`.

---

## 8. Logs

`src/utils/logger.js` imprime con timestamp. Cada request tiene un `x-request-id` inyectado por `middlewares/requestId.js`, devuelto en el header de la respuesta — útil para correlacionar logs de cliente vs servidor.

---

## 9. Rate limits

- `/auth/*` — 20 req / 15 min por IP.
- `/consultation/*` y `/ai/*` — 30 req / min por IP.

Configurable en `src/middlewares/rateLimiters.js`.

---

## 10. Variables de entorno

| Variable | Uso |
|---|---|
| `OPENAI_API_KEY` | Transcripción + LLM |
| `SUPABASE_URL` | URL del proyecto |
| `SUPABASE_ANON_KEY` | Cliente público + validación JWT |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin ops (Storage uploads, rollback register) |
| `PORT` | Puerto HTTP, default 3000 |

Producción: Render dashboard → Environment. Nunca commit `.env`.

---

## 11. Git

- Rama principal: `master`. Rama de desarrollo activa: `backV2`.
- Render despliega la rama configurada al push.

```bash
git checkout -b feature/x
# cambios + commit
git push origin feature/x
# merge via PR cuando esté listo
```

---

## 12. Estructura rápida

```
src/
├── config/           # supabaseClient (anon/admin/token-scoped), openaiClient
├── middlewares/      # auth, responseWrapper, errorHandler, validate, upload, requestId, rateLimiters
├── validators/       # authSchema, patientSchema, consultationSchema, aiSchema, appointmentSchema, alertSchema, attachmentSchema
├── controllers/      # auth, veterinarian, patient, consultation, ai, appointment, dashboard, attachment, alert
├── repositories/     # patientsRepo, consultationsRepo, sectionsRepo, appointmentsRepo, favoritesRepo, alertsRepo, attachmentsRepo
├── services/         # llmService, promptRouter, transcriptionService, storageService
├── prompts/          # 10 prompts clínicos + _shared/transcriptionRules.js
├── routes/           # authRoutes, patientRoutes, consultationRoutes, consultationsCollectionRoutes, aiRoutes, appointmentRoutes, veterinarianRoutes, alertRoutes
├── utils/            # AppError, logger, safeJsonParse, flattenAiToText, sectionLabels, salutation
├── app.js
└── server.js
```

### Qué archivo tocar según lo que quieras

| Tarea | Archivos |
|---|---|
| Ajustar prompt | `src/prompts/[seccion]Prompt.js` |
| Cambiar reglas de corrección compartidas | `src/prompts/_shared/transcriptionRules.js` |
| Cambiar label visible al doctor | `src/utils/sectionLabels.js` |
| Agregar sección clínica | prompt + `promptRouter.js` + `ALTER TYPE` en SQL + entrada en `sectionLabels.js` |
| Agregar recurso nuevo | repo + validator + controller + routes + `app.js` |
| Cambiar modelo LLM | `src/services/llmService.js` |
| Cambiar modelo transcripción | `src/services/transcriptionService.js` |
| Ajustar rate limit | `src/middlewares/rateLimiters.js` |
| Cambiar RLS policy | `supabase_schema_v2.sql` + reaplicar |
