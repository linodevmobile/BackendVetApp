> Última actualización: 2026-04-29 · Schema: v2.5

# Arquitectura BackendVetApp — Referencia técnica

Manual de referencia para entender cómo está construido el backend. Pensado para onboarding de un desarrollador backend que llega al proyecto sin contexto previo.

Cada apartado vive en su propio archivo: si cambia algo (un trigger, un enum, un índice), se actualiza solo el archivo correspondiente. Cada archivo lleva en su frontmatter la **fecha de última actualización** y la **versión del schema** que documenta. Si el frontmatter está viejo respecto al schema vigente, asumir que la doc puede haberse desviado de la realidad y verificar contra el código.

## Índice

| # | Apartado | Contenido |
|---|---|---|
| 01 | [Visión general](01-vision-general.md) | Propósito, stack, dominio clínico, estructura del repo |
| 02 | [Modelo Entidad-Relación (MER)](02-mer.md) | Diagrama del modelo + cardinalidades |
| 03 | [Catálogo de tablas](03-tablas.md) | Cada tabla con columnas, FKs, constraints, propósito |
| 04 | [Tipos enumerados (ENUMs)](04-enums.md) | Valores válidos y semántica de cada enum |
| 05 | [Índices](05-indices.md) | Índices con su query pattern asociado |
| 06 | [Triggers y funciones SQL](06-triggers-funciones.md) | `update_updated_at`, `sync_patient_weight_cache` |
| 07 | [Row Level Security (RLS)](07-rls.md) | Aislamiento por veterinario, policies por tabla |
| 08 | [Casos especiales](08-casos-especiales.md) | Patrones de diseño no obvios del dominio |
| 09 | [Flujos del sistema](09-flujos.md) | Lifecycle de consulta, sync de mediciones, AI utility |
| 10 | [Capa de aplicación](10-capa-aplicacion.md) | Capas Node, middlewares, validators, errores |
| 11 | [Endpoints (resumen)](11-endpoints.md) | Tabla de rutas; el detalle está en Postman |
| 12 | [Servicios externos](12-servicios-externos.md) | OpenAI, Supabase (Auth/Storage/Postgres) |
| 13 | [Glosario](13-glosario.md) | Términos clínicos y técnicos del dominio |
| — | [Decisiones arquitectónicas](decisiones.md) | Bitácora cronológica (ADR-style) |

## Cómo mantener esta documentación

1. **Cuando cambias schema** (tablas, enums, índices, triggers, RLS): actualiza el archivo afectado y ajusta la fecha del frontmatter. Si la migración cambia la versión del schema, actualiza también la versión en el frontmatter.
2. **Cuando agregas un endpoint o cambias contrato**: ajusta `11-endpoints.md` y verifica que `Postman` y `12-servicios-externos.md` sigan vigentes.
3. **Cuando tomas una decisión arquitectónica nueva** (cambio de modelo, sustitución de servicio, decisión sobre dónde vive una responsabilidad): agrega entrada en `decisiones.md` con fecha y contexto. No reescribas decisiones viejas — déjalas como histórico, solo agrega la nueva que las reemplaza si aplica.
4. **Cuando aparece un caso especial nuevo** (nueva sección clínica con shape distinta, nueva tabla derivada por trigger, nueva regla de negocio rara): agrégalo en `08-casos-especiales.md`.
5. **Si un archivo crece más de ~400 líneas**: considera dividirlo. La doc se vuelve útil cuando es escaneable, no exhaustiva.

## Convenciones de estilo

- **Identificadores en código** (tablas, columnas, enums, endpoints, claves de section): inglés.
- **UI labels y prompts**: español. Vive en `src/utils/sectionLabels.js` y `src/prompts/`.
- **Documentación**: español, salvo nombres técnicos y citas exactas de errores/queries.
- **Snippets**: solo cuando aclaran. El código vivo está en el repo, no en la doc.

## Audiencia

Backend developer mid/senior con experiencia en Node.js + PostgreSQL pero sin contexto del dominio veterinario ni del histórico de iteraciones del proyecto. La doc no asume conocimiento médico previo (ver [glosario](13-glosario.md)).
