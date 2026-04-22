# Guía de Desarrollo — BackendVetApp

Backend v2 (reestructurado). Arquitectura en capas: `middlewares → routes → controllers → repositories → services`.

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
# Login
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"vet@example.com","password":"secret123"}'

# Procesar sección con audio
curl -X POST http://localhost:3000/consultation/process \
  -H "Authorization: Bearer $TOKEN" \
  -F "audio=@mi-audio.mp3" \
  -F "section=anamnesis" \
  -F "patient_id=<uuid>"

# Procesar sección con texto
curl -X POST http://localhost:3000/consultation/process \
  -H "Authorization: Bearer $TOKEN" \
  -F "section=examen_fisico" \
  -F "consultation_id=<uuid>" \
  -F "text_input=Mucosas rosadas, FC 120, peso 8.2 kg."
```

---

## 3. Ajustar un prompt

1. Editar el archivo correspondiente en `src/prompts/` (ej: `treatment-planPrompt.js`).
2. Guardar — `npm run dev` auto-reinicia.
3. Probar vía Postman/curl.

Los 9 prompts viven en español; claves JSON flat para mantener rendering simple en UI. No anidar más de un nivel.

---

## 4. Agregar una sección clínica nueva

**Requiere 3 cambios** (el 4to, la DB, ya está cubierto si se agregó al enum antes):

1. Crear `src/prompts/miNuevaSeccionPrompt.js`.
2. Registrar en `src/services/promptRouter.js` con la clave exacta del enum.
3. Agregar el valor al enum `clinical_section` en `supabase_schema_v2.sql` (si aún no está) y aplicar:
   ```sql
   ALTER TYPE clinical_section ADD VALUE 'mi_nueva_seccion';
   ```

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

## 6. Tabla híbrida `consultation_sections`

Nunca mutar `ai_suggested` en edits manuales. `PATCH /consultation/:id/sections/:section` solo toca `text` y/o `content`. Si se reprocesa audio/texto, `overwrite_text=false` (default) preserva la edición del vet.

---

## 7. Errores

Usar `AppError.validation()`, `.unauthorized()`, `.forbidden()`, `.notFound()`, `.conflict()`, `.internal()`. El `errorHandler` los convierte en el wrapper `{ error: { code, message, details } }`.

---

## 8. Logs

`src/utils/logger.js` imprime con timestamp. Cada request tiene un `x-request-id` inyectado por `middlewares/requestId.js`, devuelto en el header de la respuesta — útil para correlacionar logs de cliente vs servidor.

---

## 9. Rate limits

- `/auth/*` — 20 req / 15 min por IP.
- `/consultation/process` — 30 req / min por IP.

Configurable en `src/middlewares/rateLimiters.js`.

---

## 10. Variables de entorno

| Variable | Uso |
|---|---|
| `OPENAI_API_KEY` | Transcripción + LLM |
| `SUPABASE_URL` | URL del proyecto |
| `SUPABASE_ANON_KEY` | Cliente público + validación JWT |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin ops (rollback register) |
| `PORT` | Puerto HTTP, default 3000 |

Producción: Render dashboard → Environment. Nunca commit `.env`.

---

## 11. Git

- Rama principal: `main` (antes `master`). Otras ramas son seguras para experimentar.
- Render despliega la rama configurada automáticamente al push.

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
├── validators/       # authSchema, patientSchema, consultationSchema, appointmentSchema, alertSchema, attachmentSchema
├── controllers/      # auth, veterinarian, patient, consultation, appointment, dashboard, attachment, alert
├── repositories/     # patientsRepo, consultationsRepo, sectionsRepo, appointmentsRepo, favoritesRepo, alertsRepo, attachmentsRepo
├── services/         # llmService, promptRouter, transcriptionService, storageService
├── prompts/          # 9 prompts clínicos
├── routes/           # authRoutes, patientRoutes, consultationRoutes, appointmentRoutes, dashboardRoutes, veterinarianRoutes, alertRoutes
├── utils/            # AppError, logger, safeJsonParse, flattenAiToText, salutation
├── app.js
└── server.js
```

### Qué archivo tocar según lo que quieras

| Tarea | Archivos |
|---|---|
| Ajustar prompt | `src/prompts/[seccion]Prompt.js` |
| Agregar sección clínica | prompt + `promptRouter.js` + `ALTER TYPE` en SQL |
| Agregar recurso nuevo | repo + validator + controller + routes + `app.js` |
| Cambiar modelo LLM | `src/services/llmService.js` |
| Cambiar modelo transcripción | `src/services/transcriptionService.js` |
| Ajustar rate limit | `src/middlewares/rateLimiters.js` |
| Cambiar RLS policy | `supabase_schema_v2.sql` + reaplicar |
