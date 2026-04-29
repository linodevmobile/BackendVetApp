> Última actualización: 2026-04-29 · Schema: v2.3

# 07 — Row Level Security (RLS)

Supabase usa Postgres RLS para aislar datos por usuario. **Cada veterinario solo ve sus propios pacientes, consultas, citas y mediciones** — el aislamiento se aplica a nivel SQL, no a nivel de aplicación. Eso significa que aunque el backend tuviera un bug y filtrara por el `vet_id` equivocado, la DB seguiría rechazando lecturas/escrituras fuera del ámbito del usuario autenticado.

## Modelo conceptual

- **`auth.uid()`** es la función que Postgres expone para obtener el ID del usuario autenticado. Devuelve el `sub` del JWT que validó Supabase.
- En este proyecto, **`veterinarians.id = auth.users.id`**. Es decir, `auth.uid()` es directamente el `vet_id`.
- El backend obtiene el JWT del header `Authorization: Bearer <token>` (middleware `authMiddleware`), y crea un cliente Supabase **con ese token** vía `supabaseForToken(token)`. Las queries que viajan en `req.supabase` heredan la identidad del vet → RLS aplica con `auth.uid() = vet_id`.
- Para operaciones que requieren omitir RLS (subida a Storage con service role, tareas administrativas), el backend usa `supabaseAdmin` con la `service_role` key. Esto se hace **explícitamente** en `storageService.js`. RLS se desactiva para `service_role`.

## Roles que tocan el schema

| Role | Origen | Permisos |
|---|---|---|
| `anon` | Cliente sin login | Solo `/auth/*` (rate-limited). RLS bloquea casi todo. |
| `authenticated` | Cliente con JWT válido | Lecturas/escrituras filtradas por RLS. La vasta mayoría de tráfico va por aquí. |
| `service_role` | Backend con clave privada | Bypassa RLS. Solo se usa para Storage uploads y tareas internas controladas. |
| `postgres` | Owner del schema | Solo en migraciones / dashboard de Supabase. |

> Después de un `DROP SCHEMA public CASCADE`, los grants se pierden. La sección 15 de `supabase_schema_v2.sql` los re-otorga. Si una query devuelve vacío y no entiendes por qué, **antes de pelear con RLS** verifica `role_table_grants` (ver [memory de Supabase Grants](../../CLAUDE.md)).

## Policies por tabla

Todas las tablas tienen RLS habilitado vía `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`. Las policies se aplican al rol `authenticated` (anon no llega aquí en lectura).

### `veterinarians`

Un vet ve y edita solo su propio perfil.

```sql
CREATE POLICY vet_self_select ON veterinarians
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY vet_self_update ON veterinarians
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
```

### `patients`

Un vet ve sus pacientes creados **o** los que tenga marcados como favoritos. Solo el creador puede modificarlos.

```sql
CREATE POLICY patients_vet_read ON patients
  FOR SELECT TO authenticated
  USING (
    created_by_vet_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM vet_favorite_patients f
      WHERE f.vet_id = auth.uid() AND f.patient_id = patients.id
    )
  );

CREATE POLICY patients_vet_write ON patients
  FOR ALL TO authenticated
  USING (created_by_vet_id = auth.uid())
  WITH CHECK (created_by_vet_id = auth.uid());
```

> El `FOR ALL` cubre INSERT/UPDATE/DELETE pero su `USING` se evalúa en SELECT/UPDATE/DELETE; el `WITH CHECK` se evalúa en INSERT/UPDATE. La doble policy (read + write) permite separar lectura cross-vet (vía favoritos) de escritura (solo creador).

### `patient_alerts`, `patient_measurements`

Heredan ownership del paciente. Lo ven los vets que pueden ver el paciente, lo escriben los vets dueños del paciente.

```sql
CREATE POLICY measurements_vet_all ON patient_measurements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients p
       WHERE p.id = patient_measurements.patient_id
         AND p.created_by_vet_id = auth.uid()
    )
  )
  WITH CHECK (...);
```

> Limitación: hoy solo el creador del paciente puede escribir alertas/mediciones, aunque otros vets lo tengan favorito. Si en el futuro un vet con favorito debería poder agregar alertas, ampliar el `EXISTS` para incluir `vet_favorite_patients`.

### `vet_favorite_patients`

Cada vet maneja sus propios favoritos.

```sql
CREATE POLICY favs_vet_all ON vet_favorite_patients
  FOR ALL TO authenticated
  USING (vet_id = auth.uid())
  WITH CHECK (vet_id = auth.uid());
```

### `consultations`

Solo el vet dueño de la consulta la ve y modifica. **No se comparte** vía favoritos del paciente — la consulta es privada al vet que la creó (decisión clínica: el documento clínico es responsabilidad de quien atendió).

```sql
CREATE POLICY consultations_vet_all ON consultations
  FOR ALL TO authenticated
  USING (veterinarian_id = auth.uid())
  WITH CHECK (veterinarian_id = auth.uid());
```

### `consultation_sections`, `consultation_attachments`

Heredan vía consulta.

```sql
CREATE POLICY sections_vet_all ON consultation_sections
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = consultation_sections.consultation_id
        AND c.veterinarian_id = auth.uid()
    )
  )
  WITH CHECK (...);
```

Misma forma para `consultation_attachments`.

### `appointments`

Owner-only (mismo patrón que consultations).

### Fase 2 (`medical_orders`, `order_medications`, `treatment_events`, `hospitalizations`, `files`)

Heredan vía consulta cuando aplica. `files` tiene una policy más permisiva: si el archivo no está atado a paciente ni a consulta (`patient_id IS NULL AND consultation_id IS NULL`), no aplica filtro — los archivos huérfanos no son accesibles vía estas policies, hay que adjuntarlos.

## Casos especiales

### Backend con service role

El upload de audio y attachments usa `supabaseAdmin` (service_role) porque RLS del lado de Storage bloquea uploads sin autenticación clara. La justificación: el backend ya validó el JWT del vet en el middleware, así que la subida en su nombre es legítima. **Evitar usar service_role para queries SELECT/INSERT en tablas — eso rompería el aislamiento entre vets**.

Ver [decisiones.md](decisiones.md) entrada sobre Storage uploads.

### Joins entre tablas con RLS

Las policies de tablas hijas (sections, attachments, alerts) hacen `EXISTS` contra la tabla padre. Esto significa que **si la policy de la tabla padre falla, la hija también falla** — la lectura cascada bien. Pero ten en cuenta que cada lookup hace su propia subquery, no es gratis. Para lecturas masivas considerar materializar joins con `select(... patient:patients(...))` que Supabase resuelve con una sola query.

### Función `auth.uid()` en queries

Cuando escribes una policy o una función SQL que necesita el ID del usuario, usa `auth.uid()`. Si la función se ejecuta fuera de un request HTTP (cron job, manual SQL), `auth.uid()` retorna NULL y las policies que dependan de ella bloquean todo. Esto es **deseado** por seguridad — si quieres bypassar, hazlo explícito con service_role.

## Cómo testear RLS

1. **Local con Supabase CLI**: `supabase start` levanta una instancia local; usa la API REST con `Authorization: Bearer <jwt>` de un usuario test.
2. **Postman**: el environment incluye un `access_token` que se rellena tras `POST /auth/login`. Cualquier request a un endpoint protegido implícitamente prueba RLS si la query es por id.
3. **psql con `SET ROLE`**: en SQL editor de Supabase puedes hacer `SET request.jwt.claims = '{"sub":"<vet_id>"}'; SET ROLE authenticated;` y correr queries — útil para depurar policies.

Si una query devuelve vacío sin error, los sospechosos son (en orden):
1. Grants del rol (ver memory de Supabase Grants).
2. RLS bloqueando el row.
3. La query en sí está mal (filtro extra, FK inválida).
