> Última actualización: 2026-04-29 · Schema: v2.3

# 06 — Triggers y funciones SQL

El schema usa triggers en dos casos:

1. **Mantener `updated_at` automáticamente** en tablas que llevan auditoría temporal.
2. **Sincronizar campos derivados (caché)** cuando la fuente cambia.

Los triggers viven 100% en SQL para que **la integridad esté garantizada incluso si alguien escribe directo a la DB (psql, dashboard de Supabase, función Edge)**, sin pasar por el API. La regla es: si el invariante es importante a nivel de datos, vive en la DB; si es lógica de orquestación de negocio, vive en la capa de aplicación.

## Función `update_updated_at()`

Función trigger genérica para mantener `updated_at` en sync automáticamente.

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Cuándo se ejecuta**: BEFORE UPDATE, FOR EACH ROW.

**Triggers que la usan**:

| Trigger | Tabla |
|---|---|
| `trg_veterinarians_updated` | `veterinarians` |
| `trg_patients_updated` | `patients` |
| `trg_consultations_updated` | `consultations` |
| `trg_sections_updated` | `consultation_sections` |
| `trg_appointments_updated` | `appointments` |
| `trg_orders_updated` | `medical_orders` |
| `trg_hospitalizations_updated` | `hospitalizations` |

**Notas**:
- Tablas sin `updated_at` (ej. `patient_alerts`, `vet_favorite_patients`, `consultation_attachments`, `patient_measurements`, `treatment_events`, `order_medications`, `files`) **no** llevan este trigger porque sus rows son inmutables después de creadas o porque `created_at` es suficiente para auditoría.
- Si añades una columna `updated_at` a una tabla nueva, recuerda crear el trigger correspondiente.

## Función `sync_patient_weight_cache()`

Mantiene `patients.weight_kg` como **caché del último peso conocido**, derivado de `patient_measurements`. Permite que el código existente que lee `patient.weight_kg` siga funcionando sin saber del modelo de mediciones.

```sql
CREATE OR REPLACE FUNCTION sync_patient_weight_cache()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.weight_kg IS NOT NULL THEN
    UPDATE patients
       SET weight_kg = NEW.weight_kg
     WHERE id = NEW.patient_id
       AND NOT EXISTS (
         SELECT 1 FROM patient_measurements
          WHERE patient_id = NEW.patient_id
            AND weight_kg IS NOT NULL
            AND measured_at > NEW.measured_at
            AND id <> NEW.id
       );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Trigger**:

```sql
CREATE TRIGGER trg_sync_patient_weight
  AFTER INSERT OR UPDATE ON patient_measurements
  FOR EACH ROW EXECUTE FUNCTION sync_patient_weight_cache();
```

**Semántica**:

1. Si la nueva fila no trae `weight_kg`, la función retorna sin hacer nada (la medición es de temperatura/FC/BCS, no toca el caché).
2. Si trae `weight_kg`, comprueba que no exista una medición **más reciente con peso** para ese paciente. Solo si esta es la más reciente, actualiza `patients.weight_kg`.
3. Esta lógica es importante para casos como **backfill** o **inserción de mediciones antiguas**: si alguien sube una medición vieja, no debe sobreescribir el caché actual.

**Por qué AFTER y no BEFORE**: queremos que la fila ya esté insertada (con ID propio) cuando comparamos contra el resto. El `id <> NEW.id` en el `NOT EXISTS` solo aplica en UPDATE — en INSERT el row ya está con ID nuevo, así que se autoexcluye correctamente.

**Casos cubiertos**:

| Caso | Comportamiento |
|---|---|
| INSERT con peso, no hay mediciones más recientes | Actualiza `patients.weight_kg` |
| INSERT con peso, ya existe una medición más reciente | No hace nada (no sobreescribe caché actual) |
| INSERT sin peso (solo temp/FC/BCS) | No hace nada |
| UPDATE de medición existente (cambia el peso) | Si sigue siendo la más reciente, actualiza caché |
| Ediciones post-firma de vitals (re-sync desde `sectionsRepo`) | Se actualiza vía upsert en mismo row → trigger UPDATE → caché ajustado |

## Cómo agregar un trigger nuevo

1. **Define la función**: `CREATE OR REPLACE FUNCTION ... RETURNS TRIGGER`. Convención: `<accion>_<tabla>()`.
2. **Crea el trigger**: `CREATE TRIGGER ... BEFORE/AFTER ... FOR EACH ROW EXECUTE FUNCTION ...`.
3. **Aplica vía migración numerada** (`migrations/v2.X_<feature>.sql`).
4. **Espeja en `supabase_schema_v2.sql`** para mantener el schema consolidado.
5. **Documenta aquí** con: propósito, cuándo se ejecuta, código completo, semántica de los casos no obvios.
6. **Considera RLS**: los triggers ejecutan con los privilegios de quien hizo el statement, salvo que la función sea `SECURITY DEFINER`. En este proyecto **ningún trigger usa `SECURITY DEFINER`** — los triggers operan con los grants del invocador. Si necesitas escalar privilegios, hazlo explícito y documéntalo.

## Anti-patrones evitados

- **No hay triggers que envíen notificaciones a Supabase Realtime ni a webhooks**. La integración con servicios externos vive en la capa de aplicación (Node), no en SQL. Razones: testabilidad, transacciones explícitas, logs en un solo lugar.
- **No hay triggers que llamen a funciones HTTP** (`http_post`, `pg_net`). Misma razón.
- **No hay triggers que muten otra tabla del mismo dominio** salvo `sync_patient_weight_cache`, que es un caso explícito y aislado de caché derivado. Si te ves tentado a escribir un trigger que mute consultations cuando se inserta una section (por ejemplo, "actualizar `consultations.summary` cuando se firma `clinical_diagnosis`"), reconsidera y muévelo a la capa de aplicación.

## Referencias cruzadas

- [08-casos-especiales.md](08-casos-especiales.md) — Por qué `weight_kg` es caché y no atributo principal.
- [09-flujos.md](09-flujos.md) — Flujo end-to-end de sincronización al firmar consulta.
