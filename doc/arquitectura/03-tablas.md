> Última actualización: 2026-04-29 · Schema: v2.3

# 03 — Catálogo de tablas

Las tablas del schema `public` están agrupadas por dominio. Las marcadas como **Fase 2** existen pero aún no tienen endpoints (placeholders para hospitalización).

## Núcleo del sistema

### `veterinarians`

Perfil del usuario veterinario. Es 1:1 con `auth.users` (Supabase Auth), por eso el PK es FK contra `auth.users(id)`.

| Columna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | UUID | PK · FK `auth.users(id) ON DELETE CASCADE` | = `auth.uid()` |
| `full_name` | TEXT | NOT NULL | |
| `email` | TEXT | NOT NULL · UNIQUE | Espejo del email de auth |
| `license_number` | TEXT | | Cédula profesional |
| `phone` | TEXT | | |
| `salutation` | TEXT | | "Dr.", "Dra.", etc. |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | `updated_at` mantenido por trigger |

### `patients`

Paciente animal. El dueño está embebido (no hay tabla `owners`).

| Columna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | |
| `name` | TEXT | NOT NULL | |
| `species` | `patient_species` | NOT NULL | enum: `dog`/`cat`/`exotic` |
| `breed` | TEXT | | |
| `sex` | `patient_sex` | NOT NULL | enum: `male`/`female` |
| `date_of_birth` | DATE | | Si se desconoce, el FE puede mandar `age_years` y el repo lo deriva |
| `weight_kg` | DECIMAL(6,2) | | **Caché** del último peso conocido. Sincronizado por trigger `trg_sync_patient_weight` desde `patient_measurements` |
| `microchip` | TEXT | | |
| `owner_name` | TEXT | NOT NULL | |
| `owner_phone`, `owner_email`, `owner_address` | TEXT | | |
| `created_by_vet_id` | UUID | NOT NULL · FK `veterinarians(id) ON DELETE RESTRICT` | Determina ownership |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

> Ver [08-casos-especiales.md](08-casos-especiales.md) para por qué `weight_kg` es caché y no se actualiza vía PATCH.

### `consultations`

Visita médica. Documento clínico que pasa por un lifecycle controlado.

| Columna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | UUID | PK | |
| `patient_id` | UUID | NOT NULL · FK `patients(id) ON DELETE RESTRICT` | |
| `veterinarian_id` | UUID | NOT NULL · FK `veterinarians(id) ON DELETE RESTRICT` | |
| `type` | `consultation_type` | NOT NULL DEFAULT `'routine'` | enum: `routine`/`surgery`/`emergency` |
| `status` | `consultation_status` | NOT NULL DEFAULT `'in_progress'` | enum: `in_progress`/`paused`/`signed` |
| `summary` | TEXT | | Texto libre, resumen final |
| `primary_diagnosis` | TEXT | | Diagnóstico principal mostrado en listados |
| `result` | `consultation_result` | | enum: `discharge`/`hospitalization`/`deceased`/`referred`. Solo cuando `status='signed'` |
| `pause_reason` | `consultation_pause_reason` | | enum: `labs`/`imaging`/`procedure`/`owner`/`other`. Requerido si `status='paused'` |
| `pause_note` | TEXT | | Texto libre acompañando la pausa |
| `paused_at`, `signed_at` | TIMESTAMPTZ | | |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

**Constraint compuesto**:

```sql
CONSTRAINT chk_paused_fields CHECK (
  status <> 'paused' OR (pause_reason IS NOT NULL AND paused_at IS NOT NULL)
)
```

Garantiza que una consulta marcada como `paused` siempre tenga razón y timestamp.

### `consultation_sections`

Una fila por (consulta, sección). Modelo **híbrido**: convive transcripción cruda, output JSON de IA, texto editable y `content` estructurado.

| Columna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | UUID | PK | |
| `consultation_id` | UUID | NOT NULL · FK ON DELETE CASCADE | |
| `section` | `clinical_section` | NOT NULL | 12 valores válidos (ver [04-enums.md](04-enums.md)) |
| `transcription` | TEXT | | Texto crudo de Whisper (audit trail) |
| `ai_suggested` | JSONB | NOT NULL DEFAULT `'{}'` | Output del LLM, **inmutable** una vez escrito |
| `text` | TEXT | | **Texto final editable** por el vet — lo que se imprime en la historia |
| `content` | JSONB | | Forma estructurada para secciones tap-only o post-edición de la IA |
| `audio_url` | TEXT | | Path en `consultations-audio` bucket |
| `processed_at` | TIMESTAMPTZ | | Última vez que se actualizó el row |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

**UNIQUE** `(consultation_id, section)`: una sección como mucho una vez por consulta.

### `consultation_attachments`

Archivos asociados a una consulta (lab, imagen, recetas, otros). Sin categoría clínica todavía (Fase 3).

| Columna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | UUID | PK | |
| `consultation_id` | UUID | NOT NULL · FK ON DELETE CASCADE | |
| `section` | `clinical_section` | NULLABLE | Si el adjunto es de una sección específica |
| `storage_path` | TEXT | NOT NULL | Path en bucket `consultation-attachments` |
| `mime_type`, `label` | TEXT | | |
| `size_bytes` | BIGINT | | |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

### `patient_measurements`

**Eventos de medición clínica** (peso + signos vitales + BCS). Source-of-truth del histórico evolutivo del paciente.

| Columna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | UUID | PK | |
| `patient_id` | UUID | NOT NULL · FK ON DELETE CASCADE | |
| `consultation_id` | UUID | FK ON DELETE SET NULL | Mediciones sobreviven aunque la consulta se borre |
| `hospitalization_id` | UUID | FK ON DELETE SET NULL | |
| `measured_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | Timestamp del evento clínico (no del row) |
| `measured_by_vet_id` | UUID | FK `veterinarians(id)` | |
| `source` | TEXT | NOT NULL · CHECK IN (`'consultation'`,`'manual'`,`'hospitalization'`) | |
| `weight_kg` | DECIMAL(6,2) | | |
| `temperature_c` | DECIMAL(4,1) | | |
| `heart_rate_bpm` | INTEGER | | |
| `respiratory_rate_rpm` | INTEGER | | |
| `bcs` | TEXT | | Body Condition Score (`5/9`, etc.) |
| `notes` | TEXT | | |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

**Constraint**: al menos un valor de medición presente:

```sql
CONSTRAINT chk_measurement_at_least_one CHECK (
  weight_kg IS NOT NULL OR temperature_c IS NOT NULL
  OR heart_rate_bpm IS NOT NULL OR respiratory_rate_rpm IS NOT NULL
  OR bcs IS NOT NULL
)
```

**UNIQUE parcial** (ver [05-indices.md](05-indices.md)): `consultation_id WHERE source='consultation'` — una sola medición canónica por consulta firmada.

## Soporte y agenda

### `patient_alerts`

Alertas clínicas (alergias, condiciones crónicas).

| Columna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | UUID | PK | |
| `patient_id` | UUID | NOT NULL · FK ON DELETE CASCADE | |
| `label` | TEXT | NOT NULL | Descripción corta |
| `severity` | `alert_severity` | NOT NULL DEFAULT `'info'` | enum: `info`/`warning`/`critical` |
| `active` | BOOLEAN | NOT NULL DEFAULT `true` | Soft-disable |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

### `vet_favorite_patients` (M:N)

| Columna | Tipo | Constraints |
|---|---|---|
| `vet_id` | UUID | NOT NULL · FK ON DELETE CASCADE |
| `patient_id` | UUID | NOT NULL · FK ON DELETE CASCADE |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |

PK compuesta `(vet_id, patient_id)`.

### `appointments`

Cita programada. Puede materializar en una consulta.

| Columna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | UUID | PK | |
| `patient_id` | UUID | NOT NULL · FK ON DELETE RESTRICT | |
| `veterinarian_id` | UUID | NOT NULL · FK ON DELETE RESTRICT | |
| `scheduled_at` | TIMESTAMPTZ | NOT NULL | |
| `reason` | TEXT | | |
| `status` | `appointment_status` | NOT NULL DEFAULT `'scheduled'` | enum: `scheduled`/`now`/`completed`/`cancelled` |
| `urgent` | BOOLEAN | NOT NULL DEFAULT `false` | |
| `consultation_id` | UUID | FK `consultations(id) ON DELETE SET NULL` | |

## Fase 2 (hospitalización — placeholders)

Estas tablas existen en el schema pero **no tienen rutas/controladores** todavía. Cuando se construya el módulo de hospitalización, se crearán los repos correspondientes.

### `medical_orders`

Órdenes médicas (medicación, fluidoterapia, procedimientos).

Columnas clave: `consultation_id`, `patient_id`, `type` (`order_type`), `instructions`, `start_date`, `end_date`, `status` (`order_status`).

### `order_medications`

Detalle de medicamentos por orden: `name`, `dose_mg_kg`, `patient_weight_kg` (snapshot inmutable), `calculated_dose`, `route`, `frequency`, `duration_days`, `start_time`.

> `patient_weight_kg` se snapshotea al momento de crear la orden, leyendo de `patients.weight_kg` (caché) o recibido del frontend. Inmutable: si el paciente cambia de peso, la dosis ya prescrita no cambia.

### `treatment_events`

Eventos calendarizados de aplicación de tratamiento: `scheduled_at`, `status` (`treatment_event_status`), `executed_by`, `executed_at`.

### `hospitalizations`

Estancia hospitalaria. `consultation_id` requerido (la hospitalización nace de una consulta). `status`: `hospitalization_status`.

### `files`

Archivos genéricos a nivel paciente o consulta. Distintos de `consultation_attachments` — `files` es más amplio (Fase 2, soporte para hospitalización con archivos no atados a consulta firmada).
