> Última actualización: 2026-04-29 · Schema: v2.5

# 11 — Endpoints (resumen)

Este apartado lista las rutas existentes con su propósito, body/query principales y nivel de auth. Para detalle de payloads, ejemplos y headers usar [Postman collection](../../BackendVetApp.postman_collection.json) (es la fuente de verdad detallada y se actualiza con cada cambio de contrato).

## Convenciones

- **Auth**: salvo `/auth/*` y `GET /health`, todos requieren `Authorization: Bearer <jwt>`.
- **Rate limit**: `/auth/*` con `authLimiter`; `/ai/*` y `/consultation/*` con `processLimiter`.
- **Respuesta estándar**: `{ data, meta, error }` (ver [10-capa-aplicacion.md](10-capa-aplicacion.md)).
- **Paginación**: `?limit=20&offset=0` (Zod coerce).

## Health

| Método | Ruta | Auth | Propósito |
|---|---|---|---|
| GET | `/health` | No | Warmup contra cold-start de Render. Responde `{ status: 'ok' }` |
| GET | `/` | No | Tabla de endpoints (descubrimiento), incluye `valid_sections` |

## Auth

| Método | Ruta | Body | Propósito |
|---|---|---|---|
| POST | `/auth/login` | `{ email, password }` | Login Supabase, devuelve `access_token` + `user` |
| POST | `/auth/register` | `{ email, password, full_name, ... }` | Registra vet (crea `auth.users` + fila en `veterinarians`) |

## Veterinarians

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/veterinarians/me` | Perfil del vet autenticado |
| GET | `/veterinarians/:id` | Perfil de un vet (uso interno: agenda compartida, derivaciones) |

## Patients

| Método | Ruta | Query / Body | Propósito |
|---|---|---|---|
| GET | `/patients` | `?search&filter&limit&offset` | Lista. `filter`: `all`/`favorites`/`recent`/`today_agenda` |
| POST | `/patients` | body con campos del paciente | Crea paciente. Si trae `weight_kg`, también inserta primera medición |
| GET | `/patients/:id` | — | Detalle decorado: `age_years`, `last_visit`, `has_alert`, `is_favorite`, `visits_count` |
| PATCH | `/patients/:id` | body parcial (sin `weight_kg`) | Actualiza paciente |
| GET | `/patients/:id/timeline` | `?type=all\|consultation\|attachment&limit&offset` | Timeline cronológico para tab Historia |
| GET | `/patients/:id/measurements` | `?metric=weight_kg\|temperature_c\|...&limit&offset` | Histórico para gráficas |
| GET | `/patients/:id/hospitalizations` | `?limit&offset` | Hospitalizaciones del paciente |
| GET | `/patients/:id/appointments` | `?upcoming&limit&offset` | Citas del paciente |
| GET | `/patients/:id/attachments` | `?category&limit&offset` | Adjuntos a nivel paciente |
| POST | `/patients/:id/attachments` | multipart: `file`, `category`, `label?` | Sube adjunto a nivel paciente |
| GET | `/patients/:id/preventive-care` | `?kind&upcoming&days&limit&offset` | Vacunas + desparasitaciones. `status` derivado: `ok\|soon\|overdue\|pending\|applied` |
| POST | `/patients/:id/preventive-care` | `{ kind, name, product?, applied_at?, next_due_at?, mode?, consultation_id?, notes? }` | Registra evento (debe traer `applied_at` o `next_due_at`) |
| PATCH | `/patients/:id/preventive-care/:event_id` | body parcial | Actualiza evento (re-programar, marcar aplicada) |
| GET | `/patients/:id/preventive-care/suggested-plan` | — | Plan WSAVA + regional CO según species + life_stage, cruzado con historial |
| GET | `/patients/favorites` | — | Pacientes favoritos del vet |
| POST | `/patients/favorites/:patient_id` | — | Marcar favorito |
| DELETE | `/patients/favorites/:patient_id` | — | Quitar favorito |
| GET | `/patients/:patient_id/alerts` | — | Alertas activas del paciente |
| POST | `/patients/:patient_id/alerts` | `{ label, severity? }` | Crea alerta |
| PATCH | `/patient-alerts/:id/deactivate` | — | Soft-disable de alerta |
| DELETE | `/patient-alerts/:id` | — | Borrado físico de alerta |

## Appointments

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/appointments/today` | Agenda del día del vet |
| POST | `/appointments` | Crea cita |
| PATCH | `/appointments/:id` | Actualiza cita (ej: marcar como `now`/`completed`) |
| DELETE | `/appointments/:id` | Cancela/borra cita |

## Consultations — collection

| Método | Ruta | Query / Body | Propósito |
|---|---|---|---|
| GET | `/consultations/recent` | — | Últimas N firmadas del vet |
| GET | `/consultations` | `?status=paused\|in_progress\|signed` | Filtra por status |
| POST | `/consultations` | `{ patient_id, type? }` | Crea consulta vacía con `status='in_progress'` |

## Consultations — item

Todas con `processLimiter` (más caras).

| Método | Ruta | Body / Form | Propósito |
|---|---|---|---|
| GET | `/consultation/:id` | — | Consulta + paciente embebido + secciones + adjuntos |
| PATCH | `/consultation/:id/sections/:section` | multipart: `text?`, `content?`, `transcription?`, `ai_suggested?`, `audio?` | Upsert parcial de sección. Acepta cualquier subset |
| PATCH | `/consultation/:id/pause` | `{ reason, note? }` | Pausa consulta |
| PATCH | `/consultation/:id/resume` | — | Reanuda consulta |
| PATCH | `/consultation/:id/sign` | `{ result, summary?, primary_diagnosis? }` | Firma consulta. **Dispara sync a `patient_measurements`** |
| PATCH | `/consultation/:id/close` | (alias de sign, legacy) | Misma lógica que sign |
| POST | `/consultation/:id/attachments` | multipart con `file`, `section?`, `label?` | Sube adjunto |
| GET | `/consultation/:id/attachments` | — | Lista adjuntos |
| DELETE | `/consultation/:id/attachments/:attachmentId` | — | Borra adjunto |

## AI utility

| Método | Ruta | Form / Body | Propósito |
|---|---|---|---|
| POST | `/ai/process-section` | multipart: `section` + (`audio` o `text`) | Transcribe (si audio) + extrae JSON con LLM. **Stateless**, no toca DB |

Sección debe estar en `AI_SECTIONS` (9 valores). Si es tap-only, devuelve 400.

## Códigos de error comunes

| Code | Status | Cuándo |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Body/query no pasa Zod |
| `UNAUTHORIZED` | 401 | Falta/expira/inválido el JWT |
| `FORBIDDEN` | 403 | Acceso a recurso ajeno (rara — RLS suele convertirlo en NOT_FOUND vacío) |
| `NOT_FOUND` | 404 | Recurso no existe o RLS lo oculta |
| `CONFLICT` | 409 | Estados incompatibles (ej: firmar consulta ya firmada) |
| `INTERNAL` | 500 | Bug, fallo de servicio externo no controlado |

Forma del error:

```json
{
  "data": null,
  "meta": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Requiere al menos un campo",
    "details": { ... }
  }
}
```

## Cómo mantener este apartado al día

Cuando cambia un endpoint:

1. Actualizar la fila en este archivo + ajustar fecha del frontmatter.
2. Actualizar Postman collection con el body/query/descripción reales.
3. Actualizar `app.js` si la ruta es nueva (incluye en el dict de descubrimiento de `GET /`).
4. Si la respuesta cambia shape, mencionar el cambio en [decisiones.md](decisiones.md) si es contractual.
