> Última actualización: 2026-04-29 · Schema: v2.3

# 05 — Índices

Cada índice existe para soportar un patrón de consulta concreto. Si agregas un índice nuevo, documenta aquí **qué query lo justifica** — un índice sin caso de uso claro es coste sin beneficio (cada índice ralentiza inserts y ocupa espacio).

## `patients`

| Índice | Definición | Caso de uso |
|---|---|---|
| `idx_patients_vet` | `(created_by_vet_id)` | Listado de pacientes del vet. `WHERE created_by_vet_id = auth.uid()` |
| `idx_patients_name` | `(name)` | Búsqueda parcial por nombre del paciente (combinada con `ilike`) |

> No hay índice en `microchip` aunque la búsqueda lo soporta vía `or(...)`. La cardinalidad esperada es baja (un microchip único por paciente registrado) y el patrón típico es búsqueda por nombre primero. Si el volumen crece, considerar `idx_patients_microchip`.

## `patient_alerts`

| Índice | Definición | Caso de uso |
|---|---|---|
| `idx_alerts_patient_active` | `(patient_id, active)` | "¿Tiene este paciente alertas activas?" — la query incluye filtro por `active=true` |

## `vet_favorite_patients`

| Índice | Definición | Caso de uso |
|---|---|---|
| `idx_favs_vet` | `(vet_id)` | "¿Qué pacientes tiene como favoritos este vet?" |

> El PK compuesto `(vet_id, patient_id)` ya cubre lookups por vet+paciente; el índice extra optimiza el listado completo de favoritos por vet.

## `consultations`

| Índice | Definición | Caso de uso |
|---|---|---|
| `idx_consultations_patient` | `(patient_id)` | Historia clínica del paciente (consultas firmadas) |
| `idx_consultations_vet_status` | `(veterinarian_id, status)` | "Mis consultas pausadas / en curso" en el dashboard |
| `idx_consultations_signed_at` | `(signed_at DESC) WHERE status='signed'` | "Últimas consultas firmadas" — índice **parcial** porque solo las firmadas tienen `signed_at` |

## `consultation_sections`

| Índice | Definición | Caso de uso |
|---|---|---|
| `idx_sections_consultation` | `(consultation_id)` | Cargar todas las secciones de una consulta |
| `idx_sections_consultation_section` | `(consultation_id, section)` | Lookup directo de una sección concreta de una consulta |

> El UNIQUE `(consultation_id, section)` ya ofrece índice — `idx_sections_consultation_section` es redundante con el UNIQUE pero queda explícito. La query principal lo aprovecha igual.

## `consultation_attachments`

| Índice | Definición | Caso de uso |
|---|---|---|
| `idx_attachments_consultation` | `(consultation_id)` | Listar adjuntos de una consulta |

## `appointments`

| Índice | Definición | Caso de uso |
|---|---|---|
| `idx_appointments_vet_date` | `(veterinarian_id, scheduled_at)` | "Mi agenda del día / próximos días" |
| `idx_appointments_status` | `(status)` | Filtros por estado en dashboards |

## `patient_measurements`

| Índice | Definición | Caso de uso |
|---|---|---|
| `idx_measurements_patient_date` | `(patient_id, measured_at DESC)` | Histórico cronológico del paciente (cualquier métrica) |
| `idx_measurements_weight` | `(patient_id, measured_at DESC) WHERE weight_kg IS NOT NULL` | **Parcial**: gráfica de peso. Solo se indexan filas con peso registrado, evitando ruido cuando hay muchas mediciones de solo temperatura/FC |
| `uq_measurements_consultation` | `UNIQUE (consultation_id) WHERE source='consultation'` | **Parcial UNIQUE**: garantiza que cada consulta firmada tenga máximo una fila canónica de medición. Permite el upsert idempotente en `measurementsRepo.syncFromConsultation()` con `onConflict: 'consultation_id'` |

## Fase 2 (hospitalización)

| Índice | Definición | Caso de uso |
|---|---|---|
| `idx_orders_consultation` | `(consultation_id)` | Órdenes emitidas en una consulta |
| `idx_orders_patient` | `(patient_id)` | Historial de órdenes del paciente |
| `idx_medications_order` | `(order_id)` | Detalle de medicamentos por orden |
| `idx_events_order` | `(order_id)` | Cronograma de aplicación |
| `idx_events_scheduled` | `(scheduled_at)` | "¿Qué hay que aplicar ahora?" |
| `idx_hospitalizations_patient` | `(patient_id)` | Historial de hospitalizaciones del paciente |
| `idx_hospitalizations_status` | `(status)` | "Pacientes activos en hospitalización" |
| `idx_files_patient`, `idx_files_consultation` | `(patient_id)`, `(consultation_id)` | Lookups de archivos |

## Patrones de índice usados

- **Índices parciales** (`WHERE ...`): se usan cuando la mayoría de filas tienen el campo NULL o falso. Reducen el tamaño del índice y aceleran las queries que sí filtran por la condición. Ejemplos: `idx_consultations_signed_at`, `idx_measurements_weight`, `uq_measurements_consultation`.
- **Índices ordenados** (`DESC`): se usan cuando la query siempre lee desc por ese campo. Permite a Postgres saltarse el sort. Ejemplos: `idx_consultations_signed_at`, `idx_measurements_patient_date`.
- **Índices compuestos**: el orden de las columnas importa — la primera columna es la más selectiva o la del filtro `WHERE`. Ej: `(veterinarian_id, status)` permite filtrar por vet y luego por status.

## Cómo evaluar si un índice nuevo se justifica

1. ¿Hay una query que se ejecuta con frecuencia y filtra/ordena por estas columnas?
2. ¿La tabla tiene volumen suficiente para que un seq scan sea lento? (en Supabase, asumir miles de filas como mínimo).
3. ¿`EXPLAIN ANALYZE` confirma que el planner lo usaría?
4. ¿El costo de inserts/updates es aceptable? (cada índice ralentiza writes).

Si dudas, no agregues el índice todavía. Es más fácil agregar índices después que quitarlos.
