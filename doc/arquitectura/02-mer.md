> Última actualización: 2026-04-29 · Schema: v2.5

# 02 — Modelo Entidad-Relación (MER)

## Diagrama

```mermaid
erDiagram
    veterinarians ||--o{ patients : "creates"
    veterinarians ||--o{ vet_favorite_patients : "marks"
    veterinarians ||--o{ consultations : "owns"
    veterinarians ||--o{ appointments : "owns"
    veterinarians ||--o{ patient_measurements : "measures"
    veterinarians ||--o{ treatment_events : "executes"

    patients ||--o{ patient_alerts : "has"
    patients ||--o{ vet_favorite_patients : "favorited_by"
    patients ||--o{ consultations : "subject_of"
    patients ||--o{ appointments : "scheduled_for"
    patients ||--o{ patient_measurements : "measured"
    patients ||--o{ patient_preventive_care : "vaccinated_dewormed"
    patients ||--o{ medical_orders : "receives"
    patients ||--o{ hospitalizations : "admitted"
    patients ||--o{ files : "owns_files"

    consultations ||--o{ consultation_sections : "decomposed_in"
    consultations ||--o{ consultation_attachments : "has_files"
    consultations ||--o{ medical_orders : "issues"
    consultations ||--o{ hospitalizations : "may_open"
    consultations ||--o{ patient_measurements : "captures"
    consultations ||--o| appointments : "fulfills"
    consultations ||--o{ files : "produces"

    medical_orders ||--o{ order_medications : "details"
    medical_orders ||--o{ treatment_events : "schedules"

    hospitalizations ||--o{ patient_measurements : "produces"

    veterinarians {
        uuid id PK "= auth.users.id"
        text full_name
        text email UK
        text license_number
        text phone
        text salutation
    }

    patients {
        uuid id PK
        text name
        patient_species species
        text breed
        patient_sex sex
        date date_of_birth
        decimal weight_kg "cache (trigger)"
        text microchip
        text owner_name
        text owner_phone
        text owner_email
        text owner_address
        uuid created_by_vet_id FK
    }

    consultations {
        uuid id PK
        uuid patient_id FK
        uuid veterinarian_id FK
        consultation_type type
        consultation_status status
        text summary
        text primary_diagnosis
        consultation_result result
        consultation_pause_reason pause_reason
        timestamptz paused_at
        timestamptz signed_at
    }

    consultation_sections {
        uuid id PK
        uuid consultation_id FK
        clinical_section section
        text transcription
        jsonb ai_suggested
        text text "vet-edited final"
        jsonb content
        text audio_url
    }

    patient_measurements {
        uuid id PK
        uuid patient_id FK
        uuid consultation_id FK "nullable"
        uuid hospitalization_id FK "nullable"
        timestamptz measured_at
        uuid measured_by_vet_id FK
        text source "consultation/manual/hospitalization"
        decimal weight_kg
        decimal temperature_c
        int heart_rate_bpm
        int respiratory_rate_rpm
        text bcs
    }

    appointments {
        uuid id PK
        uuid patient_id FK
        uuid veterinarian_id FK
        timestamptz scheduled_at
        appointment_status status
        bool urgent
        uuid consultation_id FK "nullable"
    }

    patient_alerts {
        uuid id PK
        uuid patient_id FK
        text label
        alert_severity severity
        bool active
    }

    vet_favorite_patients {
        uuid vet_id PK,FK
        uuid patient_id PK,FK
    }

    consultation_attachments {
        uuid id PK
        uuid consultation_id FK
        clinical_section section "nullable"
        text storage_path
    }
```

## Cardinalidades resumidas

| Relación | Cardinalidad | Notas |
|---|---|---|
| `veterinarians` 1—N `patients` | 1 vet crea N pacientes | `patients.created_by_vet_id` |
| `veterinarians` N—M `patients` (favoritos) | Vía `vet_favorite_patients` | PK compuesta `(vet_id, patient_id)` |
| `patients` 1—N `patient_alerts` | 1 paciente con N alertas activas/históricas | `active` flag para soft-disable |
| `patients` 1—N `consultations` | 1 paciente con N consultas | RESTRICT en delete (no se borra paciente con consultas) |
| `consultations` 1—N `consultation_sections` | 1 consulta con hasta 12 secciones | UNIQUE `(consultation_id, section)` — máximo una fila por sección por consulta |
| `consultations` 1—N `consultation_attachments` | Adjuntos opcionales | `section` puede ser NULL si el adjunto no pertenece a una sección concreta |
| `consultations` 1—1 `patient_measurements` (cuando source='consultation') | UNIQUE parcial | Una medición canónica por consulta firmada |
| `patients` 1—N `patient_measurements` | Histórico evolutivo de signos vitales | Source: consultation / manual / hospitalization |
| `consultations` 1—1 `appointments` (opcional) | Una cita puede materializar una consulta | `appointments.consultation_id` nullable |
| `consultations` 1—N `medical_orders` (Fase 2) | Una consulta puede emitir órdenes de tratamiento | Tablas declaradas, sin endpoints aún |
| `consultations` 1—N `hospitalizations` (Fase 2) | Una consulta puede abrir hospitalización | RESTRICT en delete |
| `medical_orders` 1—N `order_medications` | Una orden con medicamentos detallados | Cascade en delete |
| `medical_orders` 1—N `treatment_events` | Eventos programados de aplicación | Cascade |

## Reglas de integridad clave

- **Eliminación de paciente**: `RESTRICT` en `consultations.patient_id`, `appointments.patient_id`, `medical_orders.patient_id`, `hospitalizations.patient_id`. Un paciente con historia clínica **no se puede borrar**. Lo correcto es soft-disable (no implementado aún) o anonimización.
- **Eliminación de consulta**: cascade en `consultation_sections`, `consultation_attachments`. Las mediciones (`patient_measurements`) sobreviven con `consultation_id` puesto a NULL (ON DELETE SET NULL) — el histórico clínico no se pierde.
- **Eliminación de veterinarian**: `RESTRICT` en pacientes, consultas y citas. El borrado real solo ocurre vía `auth.users` (cascade desde Supabase Auth) y antes hay que reasignar dependencias.
- **Identidad del veterinario**: `veterinarians.id = auth.users.id`. La tabla `veterinarians` es 1:1 con el usuario de Supabase Auth, no genera UUID propios.

Ver [03-tablas.md](03-tablas.md) para columnas y constraints detallados, y [07-rls.md](07-rls.md) para las políticas de aislamiento.
