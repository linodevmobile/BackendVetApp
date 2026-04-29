> Última actualización: 2026-04-29 · Schema: v2.3

# 09 — Flujos del sistema

Diagramas de secuencia de los flujos clave. Mermaid para render legible; el texto debajo describe los pasos para terminales sin renderer.

## Flujo 1 — Lifecycle de consulta (golden path)

Vet inicia consulta, dicta secciones, eventualmente firma. Este es el flujo más común.

```mermaid
sequenceDiagram
    participant App as Mobile (Flutter)
    participant API as Backend (Node)
    participant OAI as OpenAI
    participant DB as Supabase Postgres
    participant ST as Supabase Storage

    App->>API: POST /consultations { patient_id, type }
    API->>DB: INSERT consultations (status=in_progress)
    DB-->>API: consultation row
    API-->>App: { data: consultation }

    Note over App: Vet graba audio de sección
    App->>API: POST /ai/process-section (audio + section)
    API->>ST: upload temp audio
    API->>OAI: whisper-1 transcribe
    OAI-->>API: transcription text
    API->>OAI: gpt-4o-mini extract JSON
    OAI-->>API: { ai_suggested }
    API-->>App: { transcription, ai_suggested, suggested_text }
    Note over App: Vet edita texto en UI

    App->>API: PATCH /consultation/:id/sections/:section { text, content, ai_suggested }
    API->>DB: UPSERT consultation_sections
    DB-->>API: section row
    API-->>App: { data: section }
    Note over App: Repite por cada sección<br/>(autosave + debounce)

    App->>API: PATCH /consultation/:id/sign { result, summary, primary_diagnosis }
    API->>DB: UPDATE consultations SET status=signed
    Note over API: Hook: sync_from_consultation
    API->>DB: SELECT vitals + physical_exam sections
    API->>DB: UPSERT patient_measurements (source=consultation)
    Note over DB: Trigger: sync_patient_weight_cache<br/>actualiza patients.weight_kg
    DB-->>API: signed consultation
    API-->>App: { data: consultation }
```

### Pasos en texto

1. **Crear consulta** (`POST /consultations`): nace con `status=in_progress`. Sin secciones todavía.
2. **Procesar audio** (`POST /ai/process-section`): por cada sección dictada, el cliente envía audio + section name. El backend transcribe con Whisper, pasa al LLM con el prompt de la sección, y devuelve `{ transcription, ai_suggested, suggested_text }`. **No persiste** — el cliente decide qué hacer con el resultado.
3. **Persistir sección** (`PATCH /consultation/:id/sections/:section`): el cliente, tras edición humana del texto, envía cualquier subset de `{ text, content, transcription, ai_suggested, audio }`. Sirve como autosave/blur/pause. El upsert es parcial — solo escribe los campos que llegan.
4. **Pausar/reanudar** (`PATCH /consultation/:id/pause` / `/resume`): cambian `status`. Pause requiere `reason`.
5. **Firmar** (`PATCH /consultation/:id/sign`): cambia `status=signed`, registra `signed_at`, `result`, `summary`, `primary_diagnosis`. **Dispara el sync a `patient_measurements`**.
6. **Sync de mediciones**: el repo lee las secciones `vitals` y `physical_exam` de la consulta firmada, extrae signos vitales + BCS, hace upsert en `patient_measurements` con `source='consultation'`. Si la fila ya existe (re-firma o edición post-firma), se actualiza la misma. El trigger SQL `trg_sync_patient_weight` actualiza `patients.weight_kg` si la medición es la más reciente.

## Flujo 2 — Edición post-firma de vitals

Caso menos común pero soportado: el vet detecta un error en signos vitales después de firmar.

```mermaid
sequenceDiagram
    participant App as Mobile
    participant API as Backend
    participant DB as Postgres

    App->>API: PATCH /consultation/:id/sections/vitals { content: { weight_kg: 32.6, ... } }
    API->>DB: UPDATE consultation_sections
    Note over API: maybeResyncMeasurement detecta<br/>section=vitals + status=signed
    API->>DB: UPSERT patient_measurements (onConflict consultation_id)
    Note over DB: Trigger sync_patient_weight_cache<br/>actualiza caché si más reciente
    DB-->>API: section row
    API-->>App: { data: section }
```

**Notas**:
- `sectionsRepo.maybeResyncMeasurement` consulta `consultations.status` antes de re-sincronizar. Si la consulta está `in_progress` o `paused`, no hace nada.
- El UNIQUE parcial sobre `consultation_id WHERE source='consultation'` garantiza idempotencia: el upsert actualiza la fila existente.

## Flujo 3 — Alta de paciente con peso inicial

Cuando el vet da de alta un paciente nuevo y captura su peso.

```mermaid
sequenceDiagram
    participant App as Mobile
    participant API as Backend
    participant DB as Postgres

    App->>API: POST /patients { name, species, sex, owner_name, weight_kg: 18.5, ... }
    API->>DB: INSERT patients (weight_kg = 18.5)
    DB-->>API: patient row
    Note over API: Si payload.weight_kg → insertar medición inicial
    API->>DB: INSERT patient_measurements (source=manual, weight_kg=18.5)
    Note over DB: Trigger sync_patient_weight_cache<br/>(no-op: weight_kg ya está bien)
    API-->>App: { data: patient }
```

**Por qué la fila adicional**: garantiza que la gráfica histórica del paciente nunca arranque vacía. Sin esta inserción, la primera medición aparecería solo cuando el vet firme la primera consulta — entre alta y primera consulta puede haber un hueco.

## Flujo 4 — Login y obtención de cliente Supabase scoped

```mermaid
sequenceDiagram
    participant App as Mobile
    participant API as Backend
    participant SB as Supabase Auth

    App->>API: POST /auth/login { email, password }
    API->>SB: signInWithPassword
    SB-->>API: { access_token, refresh_token, user }
    API-->>App: { access_token, user }

    App->>API: GET /patients (Authorization: Bearer <jwt>)
    Note over API: authMiddleware
    API->>SB: getUser(jwt)
    SB-->>API: user
    Note over API: req.supabase = supabaseForToken(jwt)<br/>req.veterinarianId = user.id
    API->>API: patientsRepo.list(req.supabase, req.veterinarianId, ...)
    Note over API: queries con RLS aplicada<br/>auth.uid() = vet_id
    API-->>App: { data: patients[] }
```

**Detalle**: `supabaseForToken(jwt)` crea un cliente con el JWT del usuario en el header. Eso significa que cualquier query que pase por `req.supabase` se ejecuta con la identidad del vet → RLS filtra correctamente.

## Flujo 5 — Endpoint de detalle de paciente (Fase 1)

Para alimentar la pantalla de detalle del móvil.

```mermaid
sequenceDiagram
    participant App as Mobile
    participant API as Backend
    participant DB as Postgres

    App->>API: GET /patients/:id
    API->>DB: SELECT patients WHERE id
    par Queries paralelas
        API->>DB: SELECT alerts ACTIVE
    and
        API->>DB: SELECT favorite (this vet)
    and
        API->>DB: SELECT last signed consultation
    and
        API->>DB: COUNT signed consultations
    end
    DB-->>API: patient + decoradores
    API-->>App: { age_years, last_visit, has_alert, is_favorite, visits_count, ... }

    App->>API: GET /patients/:id/timeline?type=all&limit=20
    API->>DB: SELECT consultations signed ORDER BY signed_at DESC
    API->>DB: SELECT attachments JOIN consultations
    Note over API: merge + sort + paginate (in-memory)
    API-->>App: { events[] }

    App->>API: GET /patients/:id/measurements?metric=weight_kg
    API->>DB: SELECT patient_measurements WHERE weight_kg IS NOT NULL ORDER BY measured_at DESC
    DB-->>API: filas indexadas (idx_measurements_weight)
    API-->>App: { measurements[] }
```

## Flujo 6 — Procesamiento de IA con / sin audio

`POST /ai/process-section` admite dos formas:

```mermaid
flowchart LR
    Req[Request:<br/>section + audio? + text?]
    Decide{¿Hay audio?}
    Tx[Whisper transcribe]
    LLM[gpt-4o-mini<br/>+ prompt de sección]
    Out["{ transcription,<br/>ai_suggested,<br/>suggested_text }"]

    Req --> Decide
    Decide -- sí --> Tx --> LLM --> Out
    Decide -- no, solo text --> LLM
```

**Casos**:
- **Solo audio**: transcribe → LLM → output. `transcription` viene de Whisper.
- **Solo texto**: salta Whisper, va directo al LLM. `transcription` se devuelve igual al input (el frontend ya tiene texto editado).
- **Ambos**: usa el texto provisto, ignora el audio (caso edge — no es un patrón normal pero el endpoint lo tolera).

**`suggested_text`** es el resultado de `flattenAiToText(section, ai_suggested)` — toma el JSON del LLM y lo convierte en un texto labelizado (en español) listo para mostrar al vet en la UI. Esa función vive en `src/utils/flattenAiToText.js` y usa `src/utils/sectionLabels.js` para los nombres en español.
