> Última actualización: 2026-04-29 · Schema: v2.3

# 04 — Tipos enumerados (ENUMs)

Postgres `CREATE TYPE ... AS ENUM` es preferido sobre `TEXT + CHECK` cuando el conjunto de valores está cerrado y es estable. Cambiar un enum en Postgres es **caro** (requiere migración con `ALTER TYPE ... ADD VALUE` y, si se elimina un valor, recrear el tipo y todas las columnas que lo usan).

> Excepción: `patient_measurements.source` usa `TEXT + CHECK` en vez de enum, porque es un dominio que puede crecer (mañana podría aparecer `home_self_report`, `wearable`, etc.) y no quiero pagar el costo de migración cada vez.

## Catálogo

### `patient_species`

| Valor | Significado |
|---|---|
| `dog` | Perro |
| `cat` | Gato |
| `exotic` | Exótico (aves, reptiles, roedores, etc.) |

### `patient_sex`

| Valor | Significado |
|---|---|
| `male` | Macho |
| `female` | Hembra |

> Sin valores castrado/esterilizado a nivel enum. Si esa información se vuelve relevante para reportes, se modela como columna boolean separada (`is_neutered`).

### `consultation_type`

| Valor | Significado |
|---|---|
| `routine` | Consulta rutinaria (chequeos, control) |
| `surgery` | Cirugía |
| `emergency` | Urgencia |

### `consultation_status`

Lifecycle de una consulta. Transiciones permitidas:

```
in_progress → paused → in_progress → signed
in_progress → signed
```

| Valor | Significado |
|---|---|
| `in_progress` | Captura activa, vet trabajando |
| `paused` | Esperando algo externo (lab, imagen, dueño). Requiere `pause_reason` y `paused_at` |
| `signed` | Firmada. Documento clínico cerrado e inmutable |

### `consultation_result`

Solo aplica cuando `status='signed'`. Cómo terminó la consulta.

| Valor | Significado |
|---|---|
| `discharge` | Alta (paciente vuelve a casa) |
| `hospitalization` | Queda hospitalizado |
| `deceased` | Falleció durante la consulta |
| `referred` | Derivado a especialista o centro externo |

### `consultation_pause_reason`

Por qué se pausa la consulta.

| Valor | Significado |
|---|---|
| `labs` | Esperando resultados de laboratorio |
| `imaging` | Esperando imagen (radiografía, ecografía) |
| `procedure` | Procedimiento intermedio (sedación, etc.) |
| `owner` | Esperando decisión o llegada del dueño |
| `other` | Otra razón (acompañar con `pause_note`) |

### `clinical_section`

**12 valores**. Son las secciones de la historia clínica. Están split en dos grupos lógicos (no separados a nivel enum, pero sí en código vía `promptRouter`):

#### AI-backed (9) — aceptan `POST /ai/process-section`

| Valor | UI label (ES) | Comentario |
|---|---|---|
| `chief_complaint` | Motivo de consulta | Voz del **dueño** (no del vet) |
| `anamnesis` | Anamnesis | |
| `physical_exam` | Examen físico | Shape mixto: 8 campos manuales + 1 AI editable |
| `problems` | Problemas | |
| `diagnostic_approach` | Abordaje diagnóstico | |
| `complementary_exams` | Exámenes complementarios | |
| `clinical_diagnosis` | Diagnóstico clínico | Consolida `presumptive_diagnosis` + `definitive_diagnosis` legacy |
| `prescription` | Receta | |
| `prognosis` | Pronóstico | |

#### Tap-only (3) — solo `PATCH`, sin IA

| Valor | UI label (ES) | Shape de `content` |
|---|---|---|
| `food` | Alimentación | `{ regime: 'concentrate'\|'barf'\|'homemade'\|'mixed'\|'other' }` |
| `vitals` | Signos vitales | `{ temperature_c, heart_rate_bpm, respiratory_rate_rpm, weight_kg }` (números) |
| `treatment` | Tratamiento | `{ modality: 'ambulatory'\|'hospitalization' }` |

> Ver [08-casos-especiales.md](08-casos-especiales.md) para por qué hay este split y cómo `vitals` + `physical_exam.content.bcs` alimentan `patient_measurements` al firmar.

### `appointment_status`

| Valor | Significado |
|---|---|
| `scheduled` | Agendada para el futuro |
| `now` | "En este momento" — vet la marca como activa |
| `completed` | Finalizada (paciente atendido) |
| `cancelled` | Cancelada (no llegó, reagendada, etc.) |

### `alert_severity`

| Valor | Significado |
|---|---|
| `info` | Informativa (preferencia, dato útil) |
| `warning` | Atención (alergia leve, condición a vigilar) |
| `critical` | Crítica (alergia anafiláctica, condición que altera el manejo) |

## Enums Fase 2 (sin endpoints aún)

| Enum | Valores |
|---|---|
| `order_type` | `medication` · `fluid` · `procedure` |
| `order_status` | `active` · `completed` · `cancelled` |
| `treatment_event_status` | `pending` · `applied` · `skipped` |
| `hospitalization_status` | `active` · `discharged` · `deceased` |
| `file_type` | `audio` · `image` · `pdf` · `other` |

## Cómo agregar / cambiar un enum

1. **Agregar valor**: `ALTER TYPE <enum> ADD VALUE '<nuevo>';` — barato, no bloquea.
2. **Renombrar valor**: `ALTER TYPE <enum> RENAME VALUE '<viejo>' TO '<nuevo>';`.
3. **Eliminar valor**: requiere recrear el tipo y todas las columnas que lo usan. Ejemplo en [migrations/v2.2_sections.sql](../../migrations/v2.2_sections.sql) (eliminó `presumptive_diagnosis` y `definitive_diagnosis`).
4. **Actualizar este archivo + el código**:
   - `04-enums.md` (este archivo): agregar fila a la tabla.
   - `src/services/promptRouter.js` si es `clinical_section`.
   - `src/utils/sectionLabels.js` si tiene UI label.
   - `src/validators/*.js` si Zod lo enumera explícitamente.
   - `supabase_schema_v2.sql` para mantener el schema consolidado.
