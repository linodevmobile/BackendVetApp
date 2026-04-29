> Última actualización: 2026-04-29 · Schema: v2.5

# Decisiones arquitectónicas (ADR-style)

Bitácora cronológica de decisiones arquitectónicas significativas. Formato corto, cada entrada incluye:

- **Fecha**: cuándo se tomó.
- **Decisión**: qué se decidió.
- **Contexto**: por qué se discutió (problema, restricción, alternativa que se evaluaba).
- **Alternativas descartadas**: qué se consideró y se rechazó.
- **Consecuencias**: qué cambia en el sistema.
- **Estado**: `vigente` | `superada por <ADR-N>` | `rollback`.

> Las decisiones viejas no se editan ni se borran. Si una decisión se reemplaza, se marca como `superada por <fecha>` y se agrega una nueva entrada arriba con el reemplazo. Esto preserva el contexto histórico para devs nuevos.

---

## 2026-04-29 · `apply-next` resuelto en backend (no cliente)

**Decisión**: agregar `POST /patients/:id/preventive-care/apply-next`. El backend toma decisión sobre qué ítem del plan aplicar, en vez de que el cliente lea `suggested-plan`, encuentre el siguiente y haga POST manual.

**Contexto**: el botón "Aplicar siguiente del plan" del mockup (tab Salud → Vacunas → modo plan) es un click único. El cliente podría componerlo con 2 requests (`GET suggested-plan` + `POST preventive-care`), pero esa lógica (priorización core > optional, cálculo de `next_due_at` desde el catálogo) duplica responsabilidad backend y obliga a cada cliente (Flutter ahora, web futura) a reimplementarla.

**Alternativas descartadas**:
- **Resolver en cliente**: cada cliente reimplementa la fórmula de proyección y la priorización, fuera del lugar donde se puede testear como unidad.

**Consecuencias**:
- Endpoint nuevo `POST /patients/:id/preventive-care/apply-next` con body opcional `{ kind? }`.
- Prioriza `core` antes que `optional`. Filtro `kind` (`vaccination` / `deworming_internal` / `deworming_external`) opcional.
- Respuesta = fila creada + `source_item` con metadata del catálogo (`code`, `group`, `name`) para mostrar contexto sin re-fetch del plan.
- Errores: `404` si la especie no tiene plan; `409` si el plan está completo.
- Flujo **manual** no cambia: `POST /preventive-care` sigue libre, no proviene del catálogo.

**Estado**: vigente.

---

## 2026-04-29 · `patient_preventive_care` unificada (vacunas + desparasitaciones)

**Decisión**: una sola tabla `patient_preventive_care` con enum `preventive_care_kind` (`vaccination` / `deworming_internal` / `deworming_external`), en vez de dos tablas separadas (`patient_vaccinations` + `patient_dewormings`).

**Contexto**: la pantalla de detalle de paciente tiene tab "Salud · Vacunas" + sección "Próximos recordatorios" en el resumen que mezcla vacunas y desparasitaciones. Ambos comparten la misma forma esencial (`name`, `applied_at`, `next_due_at`, `status` derivado).

**Alternativas descartadas**:
- **Dos tablas separadas** (`patient_vaccinations` + `patient_dewormings`): duplica esquema, repos, validadores, endpoints; sin ganancia real porque la shape es idéntica.
- **Plan sugerido en DB** como tabla `preventive_care_plan_templates` editable: requeriría UI admin que no existe; los planes WSAVA cambian en intervalos de años, version-control en repo es suficiente.
- **Generar plan con IA**: drift entre llamadas, costo, y la guía oficial debe ser determinística para un cliente clínico.

**Consecuencias**:
- Migración `v2.5_preventive_care.sql` con enums + tabla + índices + trigger `updated_at` + RLS.
- Catálogo estático en `src/data/preventive_care_plans.json` (WSAVA + adaptación regional Colombia: Leishmania endémica, FeLV core en gatos outdoor, frecuencia desparasitación elevada por presión tropical).
- Endpoints nuevos: `GET/POST /patients/:id/preventive-care`, `PATCH /:event_id`, `GET /:id/preventive-care/suggested-plan`.
- `status` (`ok` / `soon` / `overdue` / `pending` / `applied`) se computa en backend a partir de `next_due_at` vs `now()` — no es columna almacenada (cambia con el tiempo).
- Alergias / condiciones crónicas quedan **fuera de scope**: la app no las captura. Si en el futuro se necesitan, se modelan en `patient_alerts` (ya existente) o tabla nueva.

**Estado**: vigente.

---

## 2026-04-29 · `patient_measurements` genérica (no solo peso)

**Decisión**: crear tabla `patient_measurements` con columnas para peso, signos vitales y BCS, en vez de crear una tabla específica `weight_measurements`.

**Contexto**: la pantalla de detalle de paciente (Fase 1) requiere gráfica histórica de peso. La opción mínima sería derivar de `consultation_sections.vitals.content.weight_kg` filtrando por consultas firmadas; la opción simple sería una tabla `weight_measurements`. Pero el dominio necesita registrar mediciones también fuera de consulta (control de peso, post-cirugía, hospitalización Fase 2 con mediciones por turno) y es probable que en el futuro se quiera graficar también temperatura, BCS, etc.

**Alternativas descartadas**:
- **Derivar de vitals + cache** en `patients.weight_kg`: limitado a peso, atado a estado de consulta firmada, no permite mediciones fuera de consulta.
- **Tabla `weight_measurements` específica**: resuelve el caso peso pero replica el patrón si mañana se quiere temperatura/BCS evolutivo.
- **Vista SQL** que UNION-ea fuentes: ineficiente (sin índice propio), complejidad de mantenimiento.

**Consecuencias**:
- Nueva migración `v2.3_patient_measurements.sql` con tabla, índices (incluido UNIQUE parcial sobre `consultation_id`), trigger `sync_patient_weight_cache`, RLS y grants.
- `patients.weight_kg` queda como **caché** auto-sincronizado por trigger. El código existente que lo lee sigue funcionando.
- `patients.weight_kg` deja de aceptarse en `PATCH /patients/:id` (whitelist removido del validador y del repo).
- Hook en `consultationsRepo.sign` invoca `measurementsRepo.syncFromConsultation`.
- Hook en `sectionsRepo.upsertPartial` re-sincroniza si edición post-firma.
- Endpoints nuevos: `GET /patients/:id/measurements?metric=...&limit&offset`.

**Estado**: vigente.

---

## 2026-04-29 · Capa de aplicación maneja sync, no triggers SQL

**Decisión**: la sincronización `vitals` → `patient_measurements` se hace en código Node (`measurementsRepo.syncFromConsultation`), no en trigger SQL.

**Contexto**: al firmar una consulta o editar `vitals` post-firma, hay que crear/actualizar la fila correspondiente en `patient_measurements`. Se podría implementar con un trigger AFTER INSERT/UPDATE en `consultation_sections`, pero la lógica involucra lecturas cross-table, manejo de tipos JSONB y reglas de negocio (solo sincroniza si la consulta está firmada).

**Alternativas descartadas**:
- **Trigger SQL**: testable solo desde la DB, error-prone con JSONB y subqueries, ofusca el flujo de negocio para devs Node.

**Consecuencias**:
- La sincronización solo ocurre vía API. Si alguien escribe a `consultation_sections` directo en SQL (psql, dashboard), `patient_measurements` queda desincronizado.
- A cambio: el flujo es trazeable, testeable con jest/supertest y entendible leyendo solo Node.
- El **trigger SQL existente** `sync_patient_weight_cache` queda solo para una cosa: mantener el caché `patients.weight_kg` en sync con `patient_measurements` (atómico, simple, vale la pena en SQL).

**Estado**: vigente.

---

## 2026-04 · IA como utilidad pura (sin estado)

**Decisión**: `POST /ai/process-section` no toca DB ni Storage. Devuelve `{ transcription, ai_suggested, suggested_text }` y el cliente decide cuándo persistir vía `PATCH /consultation/:id/sections/:section`.

**Contexto**: en versiones tempranas, el endpoint IA persistía directamente. Eso forzaba al cliente a "comprometerse" con el resultado de la IA antes de revisarlo, y dificultaba regenerar (cada regeneración era un escribir-borrar-escribir).

**Alternativas descartadas**:
- **IA + persistencia en un solo endpoint**: acopla procesamiento (caro, async, falible) con persistencia (transaccional). Mala separación.
- **Endpoint IA que persiste en draft + endpoint para "promover" a final**: complejidad sin valor — el cliente ya tiene state local, no necesita un draft remoto.

**Consecuencias**:
- El cliente puede regenerar IA tantas veces como quiera sin contaminar la DB.
- El backend es estateless en `/ai/*` — fácil de escalar horizontalmente.
- Si cambia el provider de IA, no afecta los endpoints de DB.

**Estado**: vigente.

---

## 2026-03 · Storage uploads vía service role

**Decisión**: las subidas a Supabase Storage usan el cliente `supabaseAdmin` con `service_role` key, no el cliente del usuario.

**Contexto**: las RLS de Storage requieren autenticación distinta (políticas en `storage.objects` con `auth.uid()`). Configurar Storage policies para cada bucket y modelo de uso era complejo y propenso a errores.

**Alternativas descartadas**:
- **Configurar Storage policies por bucket**: viable pero complejo de mantener; requiere replicar la lógica de RLS de Postgres.
- **Subir desde el frontend con signed URL**: cargaría de complejidad al móvil y partiría la responsabilidad.

**Consecuencias**:
- El backend es el único punto de entrada para uploads — ya validó el JWT del vet en `authMiddleware`.
- `service_role` solo se usa en `storageService.js`, **nunca** en repos de queries SQL (eso bypassaría RLS y rompería aislamiento).
- Decisión local: el costo de service_role aquí es bajo porque la superficie es minúscula y aislada.

**Estado**: vigente.

---

## 2026-02 · Consolidación de `clinical_diagnosis` (v2.2)

**Decisión**: eliminar las secciones `presumptive_diagnosis` y `definitive_diagnosis` y consolidar en una sola `clinical_diagnosis` que devuelve `{ presumptive_diagnosis, definitive_diagnosis }` flat en `ai_suggested`/`content`.

**Contexto**: la UI del vet tenía un solo input "Diagnóstico clínico" pero el backend forzaba dos secciones, dos llamadas a IA y dos PATCHes. La separación no agregaba valor — el vet piensa el diagnóstico como una decisión integral.

**Alternativas descartadas**:
- **Mantener separadas**: peor UX y dos veces el costo de IA.
- **Mantener separadas con un endpoint compuesto**: complejidad sin razón.

**Consecuencias**:
- Migración `v2.2_sections.sql` que eliminó los enums viejos y mergeó datos existentes.
- Un solo prompt consolidado en `clinical-diagnosisPrompt.js`.
- `flattenAiToText('clinical_diagnosis', ...)` produce un texto con dos sub-bloques labelizados, manteniendo la distinción visual.

**Estado**: vigente.

---

## 2026-02 · Tap-only sections separadas de AI sections

**Decisión**: agregar 3 secciones (`food`, `vitals`, `treatment`) que **no pasan por IA**. Solo aceptan `PATCH` con `content` estructurado.

**Contexto**: secciones donde el dato es seleccionable (modalidad de tratamiento, régimen alimenticio) o numérico (signos vitales) no se benefician de IA. Pasarlas por LLM era costo en tokens y latencia inútil.

**Alternativas descartadas**:
- **Pasar todo por IA**: derroche.
- **Hacer estas secciones campos planos en `consultations`**: rompe la simetría de "una consulta tiene N secciones uniformes".

**Consecuencias**:
- `clinical_section` enum tiene 12 valores; código separa `AI_SECTIONS` (9) y `TAP_ONLY_SECTIONS` (3) en `promptRouter`.
- `aiSchema` rechaza tap-only; `consultationSchema` (PATCH) acepta los 12.
- `vitals` quedó como fuente de signos vitales que después se sincroniza a `patient_measurements`.

**Estado**: vigente.

---

## 2026-01 · Modelo `dueño` embebido en `patients`

**Decisión**: los datos del dueño (`owner_name`, `owner_phone`, `owner_email`, `owner_address`) viven en columnas de `patients`, no en una tabla `owners` separada.

**Contexto**: en el dominio veterinario de pequeños animales, un paciente típicamente tiene un dueño y la duplicación entre pacientes del mismo dueño es manejable. El costo de modelar una tabla `owners` con relaciones M:N (un dueño con varios pacientes) y normalizar todo era alto y se difería el lanzamiento.

**Alternativas descartadas**:
- **Tabla `owners`** + FK desde `patients`: más correcto académicamente, pero el caso "un dueño con varias mascotas" es minoritario y se puede modelar después si se vuelve frecuente.

**Consecuencias**:
- Si el mismo dueño tiene 3 pacientes, los datos se duplican 3 veces. Cualquier corrección hay que hacerla N veces.
- Más simple para queries y UI.
- Si en el futuro se necesita búsqueda por dueño, agregar índices `idx_patients_owner_email` o similar.
- Migrar a tabla separada después tendría un costo (script de extracción + migración de datos), pero es factible.

**Estado**: vigente. Reconsiderar si crece el caso "varios pacientes por dueño".

---

## Cómo agregar una decisión nueva

Plantilla:

```markdown
## YYYY-MM-DD · Título corto

**Decisión**: 1-2 frases.

**Contexto**: por qué se discutió. Problema/restricción.

**Alternativas descartadas**:
- A: por qué no.
- B: por qué no.

**Consecuencias**:
- Cambios concretos en código/schema.
- Trade-offs aceptados.

**Estado**: vigente | superada por <fecha> | rollback.
```

**Reglas**:
1. Las decisiones nuevas se agregan **arriba** (orden cronológico inverso).
2. **No editar** decisiones viejas (salvo para marcarlas `superada por <fecha>`).
3. Si una decisión se rollback (se revirtió), agregar entrada nueva explicando el rollback en vez de borrar la original.
4. Mantener corto. Si una decisión necesita más de 30 líneas, considera moverla a su propio archivo de detalle y dejar aquí un resumen + link.
