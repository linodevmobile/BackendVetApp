# Spec de Backend — Vistas Dashboard (Hoy) y Pacientes

> **Nota histórica (2026-04-26)**: este documento fue el handoff inicial del cliente Flutter al backend. Casi todo lo que pide ya está implementado. Para la API actual ir al `README.md` (endpoints) y `GUIA_DESARROLLO.md` (cómo agregar/cambiar). Las diferencias relevantes contra esta spec:
>
> - `vet_favorite_patients` usa `vet_id` (no `veterinarian_id`).
> - `patients` ya tiene `owner_address` (no listado abajo).
> - Las secciones clínicas migraron a inglés y crecieron a 12 (`v2.2`): con IA — `chief_complaint`, `anamnesis`, `physical_exam`, `problems`, `diagnostic_approach`, `complementary_exams`, `clinical_diagnosis`, `prescription`, `prognosis`. Tap-only (sin IA) — `food`, `vitals`, `treatment`. `clinical_diagnosis` reemplazó a `presumptive_diagnosis` + `definitive_diagnosis`.
> - El endpoint `POST /consultation/process` fue eliminado y reemplazado por: `POST /ai/process-section` (utilidad pura IA, sin DB) + `POST /consultations` (crear) + `PATCH /consultation/:id/sections/:section` (autosave/blur/pause).

Documento de handoff al backend con los **endpoints requeridos** y los **gaps de schema** detectados tras implementar las pantallas de Dashboard y Pacientes en el cliente Flutter.

Fuente del análisis: `supabase_schema_v2.sql` + colección Postman actual + entities Riverpod ya construidas en el cliente.

---

## 1. Gaps detectados en el schema actual

| Concepto | Estado actual | Acción sugerida |
|---|---|---|
| **Appointments (agenda diaria)** | No existe tabla | Crear `appointments` |
| **Tipo de consulta** (`routine / surgery / emergency`) | No existe. Hay `consultation_result` (desenlace ≠ tipo) | Nuevo enum `consultation_type` + columna en `consultations` |
| **Summary/resumen de consulta** (tarjeta dashboard) | No existe | Columna `summary TEXT` en `consultations`, generada al cerrar |
| **Alerta clínica en paciente** | No existe | Tabla `patient_alerts` (plural: alergias, contraindicaciones, condiciones crónicas). Alternativa rápida: columna `patients.has_alert BOOLEAN` |
| **Favoritos por veterinario** | No existe | Tabla `vet_favorite_patients` (relación M:N) |
| **Recent views por vet** | Derivable | Query sobre `consultations` (no requiere tabla nueva) |
| **Task checklist de hospitalización del día** | Derivable de `treatment_events` | Query agregada — no requiere tabla nueva |

### 1.1 Detalle: `appointments`

```sql
CREATE TYPE appointment_status AS ENUM ('scheduled', 'now', 'completed', 'cancelled');

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  veterinarian_id UUID NOT NULL REFERENCES veterinarians(id) ON DELETE RESTRICT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  status appointment_status NOT NULL DEFAULT 'scheduled',
  urgent BOOLEAN NOT NULL DEFAULT false,
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointments_vet_day ON appointments(veterinarian_id, scheduled_at);
CREATE INDEX idx_appointments_status ON appointments(status);
```

`consultation_id` permite vincular la cita cuando la consulta efectivamente inicia (flujo "Iniciar consulta" desde la agenda).

### 1.2 Detalle: `consultation_type`

```sql
CREATE TYPE consultation_type AS ENUM ('routine', 'surgery', 'emergency');

ALTER TABLE consultations
  ADD COLUMN type consultation_type NOT NULL DEFAULT 'routine',
  ADD COLUMN summary TEXT;
```

`summary` es el texto corto que se muestra en la tarjeta de "Registros recientes" del dashboard.

### 1.3 Detalle: `patient_alerts`

```sql
CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');

CREATE TABLE patient_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  label TEXT NOT NULL,            -- ej "Alérgico a penicilina"
  severity alert_severity NOT NULL DEFAULT 'warning',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_patient_active ON patient_alerts(patient_id, active);
```

El flag `has_alert` del listado de pacientes se deriva de `EXISTS(SELECT 1 FROM patient_alerts WHERE patient_id = p.id AND active = true)`.

### 1.4 Detalle: `vet_favorite_patients`

```sql
CREATE TABLE vet_favorite_patients (
  veterinarian_id UUID NOT NULL REFERENCES veterinarians(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (veterinarian_id, patient_id)
);
```

---

## 2. Enriquecer la respuesta de `POST /auth/login`

**Contexto**: el cliente necesita mostrar en el header del dashboard el saludo personalizado (`Dr. Mena`, `Dra. Rivas`) sin hacer un `GET /me` adicional. La respuesta actual del login debería incluir el perfil completo del veterinario.

### Respuesta sugerida

```json
{
  "data": {
    "session": {
      "access_token": "eyJhbGc...",
      "refresh_token": "v1.MRv...",
      "expires_at": "2026-04-20T15:30:00Z",
      "token_type": "Bearer"
    },
    "veterinarian": {
      "id": "uuid",
      "full_name": "Andrés Mena",
      "email": "andres.mena@vetapp.com",
      "license_number": "MV-12345",
      "phone": "+573001234567",
      "salutation": "Dr. Mena"
    }
  }
}
```

`salutation` puede generarse en backend a partir de `full_name` + convención `Dr./Dra.` (requiere campo `title` o género opcional, o regla simple: `Dr. <apellido>`).

Aplicar el mismo enriquecimiento a `POST /auth/register` para evitar un fetch extra tras el alta.

---

## 3. Endpoints Dashboard (pantalla "Hoy")

El cliente consume estos endpoints en paralelo al montar la vista. Cada uno alimenta un provider de Riverpod independiente — conviene mantenerlos separados (cache individual, loading states por sección).

### 3.1 `GET /appointments/today`

Agenda del veterinario autenticado, sólo el día actual en su timezone.

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "scheduled_at": "2026-04-19T15:30:00Z",
      "reason": "Control post-quirúrgico · 8 días",
      "status": "now",
      "urgent": false,
      "patient": {
        "id": "uuid",
        "name": "Luna Martínez",
        "species": "dog"
      }
    }
  ]
}
```

Enum `status`: `scheduled | now | completed | cancelled`.
`species`: `dog | cat | exotic` (ver nota en §5).

### 3.2 `GET /hospitalizations/active`

Pacientes actualmente hospitalizados por el vet autenticado, con progreso de tareas del día.

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "day": 3,
      "critical": true,
      "note": "Mejoría leve. Continuar protocolo.",
      "tasks_completed": 3,
      "tasks_total": 5,
      "patient": {
        "id": "uuid",
        "name": "Kira Vargas",
        "species": "dog"
      }
    }
  ]
}
```

`day` = días desde `admission_date`.
`tasks_completed` / `tasks_total` = agregado de `treatment_events` del día actual (`status='applied'` vs total).
`critical` = flag operativo (puede derivarse de alerta activa del paciente o columna en `hospitalizations`).

**Variante opcional**: en lugar de contadores, devolver el array de bools (`"tasks": [true,true,false,true,true]`) si se quiere renderizar la barra segmentada del dashboard pixel-perfect. Decidir según si se va a permitir tap sobre cada segmento (drill-in) o sólo progreso global.

### 3.3 `GET /consultations/recent?limit=4`

Últimas consultas cerradas del vet autenticado.

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "summary": "Vacunación refuerzo + desparasitación",
      "performed_at": "2026-04-18T10:00:00Z",
      "type": "routine",
      "patient": {
        "id": "uuid",
        "name": "Max Mendoza",
        "species": "dog"
      }
    }
  ]
}
```

`performed_at` = `consultations.signed_at` (o `created_at` si no cerrada).
`type` requiere la columna agregada en §1.2.

### 3.4 (Opcional) `GET /dashboard/today` — respuesta agregada

Si se prefiere 1 sola llamada al abrir la app, agregar las tres respuestas anteriores:

```json
{
  "data": {
    "appointments": [ ... ],
    "hospitalizations": [ ... ],
    "recent_consultations": [ ... ]
  }
}
```

**Trade-off**: ahorra 2 roundtrips pero dificulta refetch independiente por sección. El cliente ya está preparado para 3 providers separados — recomendamos mantener los 3 endpoints individuales y considerar el agregado solo si se ven problemas de latencia en conexiones lentas.

---

## 4. Endpoints Pacientes (pantalla "Nueva consulta" / búsqueda)

### 4.1 `GET /patients`

Listado paginable con búsqueda y filtros aplicados server-side.

**Query params**
| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `search` | string | `null` | Fulltext sobre `name`, `owner_name`, `breed` (usar `pg_trgm` o `tsvector`) |
| `filter` | enum | `all` | `all \| today_agenda \| hospitalized \| favorites \| recent` |
| `limit` | int | 50 | Máximo 100 |
| `offset` | int | 0 | Paginación offset-based |

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Luna Martínez",
      "species": "dog",
      "breed": "Golden Retriever",
      "age_years": 4,
      "owner_name": "Ana Martínez",
      "last_visit": "2026-04-11T10:00:00Z",
      "has_alert": false,
      "is_hospitalized": false
    }
  ],
  "meta": {
    "total": 128,
    "limit": 50,
    "offset": 0
  }
}
```

### 4.2 Reglas de filtrado server-side

| Filtro | Query base |
|---|---|
| `all` | sin filtro adicional |
| `today_agenda` | JOIN `appointments` WHERE `vet = authUser AND DATE(scheduled_at) = CURRENT_DATE` |
| `hospitalized` | JOIN `hospitalizations` WHERE `status = 'active'` |
| `favorites` | JOIN `vet_favorite_patients` WHERE `veterinarian_id = authUser` |
| `recent` | JOIN `consultations` WHERE `veterinarian_id = authUser ORDER BY created_at DESC LIMIT 20` (los últimos 20 pacientes atendidos por el vet) |

### 4.3 Campos derivados (no almacenados, calculados en query)

- `age_years` = `EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth))` cuando `date_of_birth` no es null. Si es null, backend puede devolver null y el cliente mostrará "edad desconocida".
- `last_visit` = `MAX(consultations.created_at) WHERE patient_id = p.id`
- `has_alert` = `EXISTS(SELECT 1 FROM patient_alerts WHERE patient_id = p.id AND active = true)`
- `is_hospitalized` = `EXISTS(SELECT 1 FROM hospitalizations WHERE patient_id = p.id AND status = 'active')`

### 4.4 `POST /patients/favorites/:patient_id` / `DELETE`

Toggle de favoritos. Requiere `vet_favorite_patients` (ver §1.4).

---

## 5. Convenciones de datos

### 5.1 Enum `species`

El cliente maneja `dog | cat | exotic`. El schema actual guarda `species TEXT` libre con valores como `"canino"`, `"felino"`. Se sugiere:

- **Opción A (recomendada)** — normalizar a enum:
  ```sql
  CREATE TYPE patient_species AS ENUM ('dog', 'cat', 'exotic');
  ALTER TABLE patients ALTER COLUMN species TYPE patient_species USING (
    CASE lower(species)
      WHEN 'canino' THEN 'dog'::patient_species
      WHEN 'felino' THEN 'cat'::patient_species
      ELSE 'exotic'::patient_species
    END
  );
  ```

- **Opción B** — mantener TEXT libre y mapear en el API layer (`canino → dog` en la serialización). Menos tipado pero retrocompatible.

### 5.2 Wrapper de respuesta

Mantener el formato ya usado en auth:

```json
{ "data": ..., "meta": {...}, "error": null }
```

Errores:

```json
{ "data": null, "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

### 5.3 Timestamps

Todos en ISO 8601 con timezone (`TIMESTAMPTZ`). El cliente formatea en zona del usuario.

---

## 6. Orden de implementación sugerido

1. **Enriquecer `POST /auth/login`** con objeto `veterinarian` — desbloquea header del dashboard inmediato.
2. **Tabla `appointments` + CRUD** — bloqueante para agenda del dashboard (hoy el cliente tiene mock).
3. **Agregar `consultation_type` + `summary`** — bloqueante para tarjetas de "Registros recientes".
4. **Tabla `patient_alerts`** — bloqueante para chips de alerta en lista de pacientes.
5. **`GET /patients` con filtros + fulltext search** — reemplaza mock del feature pacientes.
6. **Endpoints agregados de dashboard** (`/hospitalizations/active`, `/consultations/recent`).
7. **Favoritos + filtro `favorites`** — no bloqueante, se puede diferir.

---

## 7. TODOs del cliente bloqueados por este spec

Los siguientes `TODO` del código Flutter esperan estos endpoints:

- `features/appointments/presentation/controllers/today_appointments.dart` — `TODO(api)` reemplazar mock
- `features/consultations/presentation/controllers/recent_consultations.dart` — `TODO(api)` reemplazar mock
- `features/hospitalization/presentation/controllers/active_hospitalizations.dart` — `TODO(api)` reemplazar mock
- `features/patients/presentation/controllers/all_patients.dart` — `TODO(api)` reemplazar mock
- `features/patients/presentation/controllers/filtered_patients.dart` — `TODO(filters)` wire `today_agenda` / `favorites` / `recent` contra backend real
- `features/auth/presentation/controllers/current_user.dart` — `TODO(auth)` leer del `AuthSession` real cuando login devuelva `veterinarian`
