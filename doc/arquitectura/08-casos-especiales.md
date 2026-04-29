> Última actualización: 2026-04-29 · Schema: v2.3

# 08 — Casos especiales y patrones de diseño

Decisiones que sorprenden si se mira el schema o el código sin contexto. Cada caso lista: qué hace, por qué se hizo así, dónde toca el código.

## 1. `clinical_section`: AI-backed (9) vs tap-only (3)

**Qué**: el enum `clinical_section` tiene 12 valores. El código los **divide en dos grupos lógicos**:

- **AI-backed (9)**: `chief_complaint`, `anamnesis`, `physical_exam`, `problems`, `diagnostic_approach`, `complementary_exams`, `clinical_diagnosis`, `prescription`, `prognosis`. Aceptan `POST /ai/process-section`. Tienen prompt en `src/prompts/`.
- **Tap-only (3)**: `food`, `vitals`, `treatment`. **No tienen prompt** y se rechazan en `aiSchema`. La UI captura `content` estructurado directamente desde dropdowns/inputs.

**Por qué**: hay secciones que no aportan valor pasarlas por LLM (escoger una de 5 opciones desde un dropdown vs dictar). Costo en tokens y latencia inútil.

**Dónde**: `src/services/promptRouter.js` exporta `AI_SECTIONS` (9), `TAP_ONLY_SECTIONS` (3), `VALID_SECTIONS` (12). Cada validador usa el set que le corresponde:

- `aiSchema` valida contra `AI_SECTIONS`.
- `consultationSchema` (PATCH section) valida contra `VALID_SECTIONS`.

## 2. `chief_complaint`: voz del dueño, no del vet

**Qué**: la sección `chief_complaint` (motivo de consulta) es la única en la que el audio es del **dueño del paciente**, no del veterinario.

**Por qué**: el motivo de consulta debe preservar las palabras del dueño con su léxico no técnico ("le huele mal el hocico", "está más triste"). Si la IA reinterpretara en lenguaje médico, se pierde información clínica relevante (cómo el dueño percibe el problema, vocabulario que ayuda al diagnóstico).

**Dónde**:
- `src/prompts/chief-complaintPrompt.js` instruye al LLM a preservar la voz del dueño y evitar reinterpretación médica.
- Las otras 8 secciones AI asumen voz del vet con terminología clínica.

**Implicación operativa**: si el vet por error graba un audio del vet en `chief_complaint`, igual se procesa pero sale mal. Es responsabilidad de la app móvil enseñar al vet la convención.

## 3. `physical_exam`: shape mixto (manual + AI)

**Qué**: la sección `physical_exam` es la única donde `content` combina **8 campos manuales** (que el vet selecciona desde la UI) con **1 campo derivado de IA editable**.

```jsonc
{
  "mucosa": "pink|pale|jaundiced|cyanotic|congested",
  "dehydration_percent": 0,
  "bcs": "1/9..9/9",
  "attitude_owner": "friendly|docile|fearful|indifferent|aggressive",
  "attitude_vet":   "friendly|docile|fearful|indifferent|aggressive",
  "pulse": "weak|normal|strong|filiform|absent",
  "tllc_seconds": 0,
  "trcp_seconds": 0,
  "systems_affected": "string libre (post-edición sobre lo que sugirió la IA)"
}
```

**Por qué**: los 8 campos manuales son rápidos de introducir (dropdowns + inputs numéricos), no se beneficiarían de IA. El examen por sistemas (`systems_affected`) sí se beneficia de dictado + IA estructurando.

**Dónde**:
- El prompt `physical-examPrompt.js` devuelve keys por sistema (`skin_and_coat`, `respiratory_system`, etc.).
- El frontend **flattena** esas keys en el texto de `systems_affected` antes del PATCH (esto vive en la app móvil, no en el backend).
- La cosa rara: el output del prompt **no coincide** 1:1 con `content` final. El vet ve el texto flattenado en un input editable.

**Conexión con mediciones**: el campo `bcs` (Body Condition Score) se sincroniza a `patient_measurements` cuando se firma la consulta — ver caso 6.

## 4. `consultation_sections`: hybrid storage

**Qué**: cada fila de `consultation_sections` tiene 4 columnas que parecen redundantes:

| Columna | Tipo | Contiene |
|---|---|---|
| `transcription` | TEXT | Texto crudo de Whisper (input al LLM) |
| `ai_suggested` | JSONB | Output JSON del LLM, **inmutable** una vez escrito |
| `text` | TEXT | Texto final que el vet ve y edita en la UI |
| `content` | JSONB | Forma estructurada (puede ser igual a `ai_suggested` o distinta) |

**Por qué cada una**:

- `transcription`: **audit trail**. Si el vet cuestiona la IA o la transcripción, hay un original al que volver. También es útil para regenerar la IA con un prompt distinto.
- `ai_suggested`: **audit trail de la IA**. Si el vet edita el texto, la sugerencia original sigue ahí — auditable, comparable. Nunca se sobreescribe con ediciones del vet.
- `text`: **lo que se imprime**. Es el resultado final tras edición humana. La impresión de la historia clínica usa este campo.
- `content`: **representación estructurada** para UI. Para secciones tap-only (`vitals`, `food`, `treatment`) es la **única** fuente. Para AI-backed puede mirror `ai_suggested` o ser una post-edición estructurada.

**Implicación**: una sola sección puede tener `transcription` y `ai_suggested` vacíos (caso tap-only) o `text` vacío hasta que el vet edite (caso AI sin firmar). El código defensivamente debe asumir cualquier subset.

**Dónde**: `src/repositories/sectionsRepo.js` con `upsert` y `upsertPartial` que aceptan cualquier subset.

## 5. Hook de sync `vitals` → `patient_measurements`

**Qué**: cuando una consulta se firma (`PATCH /consultation/:id/sign`), el API automáticamente lee las secciones `vitals` y `physical_exam`, extrae los signos vitales y BCS, y hace **upsert** en `patient_measurements` con `source='consultation'`. Si la consulta ya está firmada y se edita `vitals` o `physical_exam` post-firma, el mismo upsert se repite (re-sync).

**Por qué**: separar el dato de captura (consulta) del dato canónico (medición). La gráfica histórica de peso necesita una fuente de verdad estable, indexada y pensada para queries por paciente. La consulta no — la consulta es un documento.

**Dónde**:
- `src/repositories/measurementsRepo.js`: `syncFromConsultation()` (helper compartido).
- `src/repositories/consultationsRepo.js`: `sign()` invoca el helper tras `updateStatus`.
- `src/repositories/sectionsRepo.js`: `upsertPartial()` invoca el helper si el row pertenece a `vitals`/`physical_exam` y la consulta ya está firmada.

**Idempotencia**: garantizada por el `UNIQUE INDEX uq_measurements_consultation` (parcial sobre `consultation_id WHERE source='consultation'`). El upsert con `onConflict: 'consultation_id'` actualiza si existe.

**Casos cubiertos**:
- Firma con vitals + physical_exam completos → 1 fila en measurements.
- Firma con solo vitals (sin BCS) → 1 fila con weight/temp/FC/FR, sin BCS.
- Firma sin vitals ni physical_exam → 0 filas (helper detecta ausencia y no inserta).
- Edita vitals post-firma → upsert sobre la misma fila (re-sync).
- Edita vitals pre-firma → no hace nada (la primera sincronización ocurrirá en sign).

## 6. `patients.weight_kg` como caché derivado

**Qué**: `patients.weight_kg` no es el peso "actual" autoritativo. Es un **caché del último peso conocido**, mantenido por trigger SQL desde `patient_measurements`.

**Por qué**:
- Mantener el campo permite que el código existente (`consultationsRepo.getById:35` lo embed, response de `GET /patients/:id`) siga funcionando sin cambios.
- El source-of-truth real es `patient_measurements` (auditeable, multi-fuente, multi-métrica).
- La dosificación de medicación (`order_medications.patient_weight_kg`, Fase 2) lee del caché para tomar snapshot inmutable al crear la orden.

**Reglas**:

- `patients.weight_kg` **no se modifica vía PATCH /patients/:id**. El validador `updateSchema` no lo acepta.
- `patients.weight_kg` se actualiza solo en dos casos:
  1. **Insert inicial** en `patientsRepo.create` (peso al alta).
  2. **Trigger** `trg_sync_patient_weight` cuando entra una medición más reciente.
- Si alguien necesita "corregir el peso registrado", lo correcto es crear una medición manual nueva, no UPDATE directo a `patients`.

**Dónde**:
- `migrations/v2.3_patient_measurements.sql`: define la tabla, el trigger y la función.
- `src/repositories/patientsRepo.js`:
  - `create()` inserta medición inicial cuando viene `weight_kg` en el alta.
  - `update()` excluye `weight_kg` del whitelist.
- `src/validators/patientSchema.js`: `updateSchema` sin `weight_kg`.

## 7. `clinical_diagnosis` consolida diagnósticos legacy

**Qué**: hasta v2.1 había dos secciones separadas, `presumptive_diagnosis` y `definitive_diagnosis`. Desde v2.2 se consolidaron en una sola sección `clinical_diagnosis` que devuelve flat JSON `{ presumptive_diagnosis, definitive_diagnosis }` en `ai_suggested`/`content`.

**Por qué**: la UI del vet tiene un solo input "Diagnóstico clínico". Tener dos secciones obligaba a hacer dos llamadas a IA y dos PATCHes para algo que el vet percibe como una sola decisión. La IA con un prompt unificado las extrae mejor.

**Dónde**:
- `migrations/v2.2_sections.sql`: migración que removió los enums viejos y consolidó datos existentes.
- `src/prompts/clinical-diagnosisPrompt.js`: prompt unificado.
- `src/utils/sectionLabels.js`: label `Diagnóstico clínico` con sub-keys en español.

**Consecuencia**: `flattenAiToText('clinical_diagnosis', aiJson)` produce un texto con dos sub-bloques etiquetados. La impresión de la historia diferencia ambos campos visualmente aunque vivan en una sola sección.

## 8. Audio de `chief_complaint` y otras secciones — voces distintas

Relacionado con el caso 2 pero como nota técnica:

- `chief_complaint`: audio del dueño, lenguaje no técnico, sin medical jargon esperado.
- `anamnesis`, `physical_exam`, etc.: audio del vet, lenguaje clínico.

El **mismo modelo Whisper** transcribe ambos (no hay router). La diferencia la marca el prompt del LLM. No se requiere modelo distinto porque Whisper transcribe literal — la calidad del input ya viene segmentada por la app móvil grabando en pantallas distintas.

## 9. `vet_favorite_patients`: ¿quién puede ver qué?

**Qué**: la policy de SELECT en `patients` permite acceso si el vet creó el paciente **o** si lo tiene marcado como favorito.

**Por qué**: en una clínica multi-vet, un especialista puede consultar un paciente que atendió otro vet (caso típico: derivación). En vez de un sistema de permisos elaborado, el modelo simple es: "marcalo como favorito y lo ves".

**Limitación actual**: solo lectura cross-vet. **Escritura sigue siendo del creador**. Las consultas son privadas al vet (no se comparten ni con favoritos).

## 10. AI utility stateless (no toca DB)

**Qué**: `POST /ai/process-section` recibe audio o texto + sección y devuelve `{ transcription, ai_suggested, suggested_text }`. **No persiste nada**. La app móvil decide cuándo guardar.

**Por qué**:
- Permite **regenerar** outputs sin contaminar el estado (vet no contento con la IA, regrabarla, comparar, decidir).
- Separa procesamiento (caro, async, falible) de persistencia (transaccional, idempotente).
- Reduce acoplamiento: si mañana se cambia el modelo o el provider de IA, los endpoints de DB no cambian.

**Dónde**:
- `src/controllers/aiController.js` y `src/routes/aiRoutes.js`.
- Procesamiento: `src/services/llmService.js` + `src/services/transcriptionService.js`.

**Consecuencia**: si el cliente pasa solo `text`, el endpoint salta transcripción y va directo al LLM. Si pasa solo audio, transcribe + LLM.
