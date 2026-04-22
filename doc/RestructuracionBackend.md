 Plan de reestructuración backend VetApp

 Contexto

 Cliente Flutter tiene gran parte de UI construida (auth, dashboard, pacientes, consulta con pausa) pero la mayoría consume datos mock. El backend actual
 (Supabase + API REST) cubre solo auth completo y endpoints parciales de pacientes/consulta.

 Decisión tomada: reescribir schema Supabase desde cero con la estructura final definitiva. Más trabajo, pero consolida decisiones (enum species en EN,
 estado paused nativo, appointments como primera clase) sin cargar con migraciones ad-hoc sobre un schema de MVP temprano.

 Alcance excluido (Fase 2, documentado pero no ejecutar ahora):
 - Hospitalización completa (tabla hospitalizations, treatment events, endpoints /hospitalizations/active). UI oculta. Se retoma cuando se active.
 - Firma hológrafa en cierre de consulta (pendiente diseño UI).
 - Botón "Mover a hospitalización" en cierre (ver §7 de docs/consultation-api-gaps.md).

 Objetivo de este doc: servir como mapa de ejecución para rearmar Supabase + API. Una fila por tabla, una fila por endpoint. Cada ítem con criterio de
 "listo". Al final, orden priorizado por milestones.

 Docs fuente (no duplicar — consultar):
 - docs/backend-api-spec.md — specs detallados dashboard + pacientes.
 - docs/consultation-api-gaps.md — specs detallados consulta + estado paused.
 - Colección Postman: C:\Users\LENOVO\Documents\DevLino\BackendVetApp\BackendVetApp.postman_collection.json.

 ---
 Módulo 1 — Auth

 Tablas

 ┌───────────────┬────────┬───────────────────────────────────────────────────────────────────────────────────────┐
 │     Tabla     │ Acción │                                     Campos clave                                      │
 ├───────────────┼────────┼───────────────────────────────────────────────────────────────────────────────────────┤
 │ veterinarians │ Crear  │ id, auth_user_id (FK auth.users), full_name, email, license_number, phone, salutation │
 └───────────────┴────────┴───────────────────────────────────────────────────────────────────────────────────────┘

 salutation se calcula o captura al registro (Dr./Dra. <Apellido>) — lo usa el header del dashboard sin roundtrip extra.

 Endpoints

 ┌──────┬────────────────────┬────────┬───────────────────────────────────────────────────────────────────┐
 │ HTTP │        Path        │ Estado │                              Acción                               │
 ├──────┼────────────────────┼────────┼───────────────────────────────────────────────────────────────────┤
 │ POST │ /auth/register     │ Existe │ Enriquecer respuesta: devolver veterinarian completo + salutation │
 ├──────┼────────────────────┼────────┼───────────────────────────────────────────────────────────────────┤
 │ POST │ /auth/login        │ Existe │ Enriquecer respuesta igual que register                           │
 ├──────┼────────────────────┼────────┼───────────────────────────────────────────────────────────────────┤
 │ GET  │ /veterinarians/:id │ Existe │ Mantener. No usado por cliente hoy                                │
 └──────┴────────────────────┴────────┴───────────────────────────────────────────────────────────────────┘

 Gaps contra UI

 - Cliente espera AuthSession { veterinarian, accessToken }. Login actual devuelve solo tokens. Bloqueante: sin esto, header dashboard depende de GET /me
 extra.

 ---
 Módulo 2 — Dashboard (Hoy)

 Tablas

 ┌───────────────────────┬────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │         Tabla         │ Acción │                                                    Campos clave                                                     │
 ├───────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ appointments          │ Crear  │ id, patient_id (FK), veterinarian_id (FK), scheduled_at, reason, status (enum), urgent, consultation_id (FK         │
 │                       │        │ nullable)                                                                                                           │
 ├───────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ patient_alerts        │ Crear  │ id, patient_id (FK), label, severity (enum info/warning/critical), active                                           │
 ├───────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ vet_favorite_patients │ Crear  │ veterinarian_id + patient_id (PK compuesta)                                                                         │
 └───────────────────────┴────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

 Enum appointment_status: scheduled | now | completed | cancelled.
 Enum alert_severity: info | warning | critical.

 Endpoints

 ┌──────┬───────────────────────────────┬────────┬───────────────────────────────────────┐
 │ HTTP │             Path              │ Estado │                Acción                 │
 ├──────┼───────────────────────────────┼────────┼───────────────────────────────────────┤
 │ GET  │ /appointments/today           │ Crear  │ Agenda día actual del vet autenticado │
 ├──────┼───────────────────────────────┼────────┼───────────────────────────────────────┤
 │ GET  │ /consultations/recent?limit=4 │ Crear  │ Últimas cerradas del vet              │
 ├──────┼───────────────────────────────┼────────┼───────────────────────────────────────┤
 │ GET  │ /consultations?status=paused  │ Crear  │ Sección "En progreso" dashboard       │
 ├──────┼───────────────────────────────┼────────┼───────────────────────────────────────┤
 │ GET  │ /hospitalizations/active      │ Fase 2 │ Pospuesto                             │
 └──────┴───────────────────────────────┴────────┴───────────────────────────────────────┘

 Gaps contra UI

 - todayAppointments(), recentConsultations(), pausedConsultations() todos mock hoy.
 - Sección "En progreso" del dashboard aún no tiene widget wired (ver in_progress_consultations_section.dart pendiente de crear en spec).
 - Sección hospitalización hidden — no genera gap activo.

 ---
 Módulo 3 — Pacientes

 Tablas

 ┌──────────┬────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │  Tabla   │ Acción │                                                           Campos clave                                                           │
 ├──────────┼────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ patients │ Crear  │ id, name, species (enum), breed, sex (enum), date_of_birth, weight_kg, microchip, owner_name, owner_phone, owner_email,          │
 │          │        │ created_by_vet_id                                                                                                                │
 └──────────┴────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

 Enum patient_species: dog | cat | exotic (normalizado EN, no canino/felino).
 Enum patient_sex: male | female.

 Campos derivados en query (no almacenados): age_years, last_visit, has_alert, is_hospitalized (ver §4.3 de backend-api-spec.md).

 Endpoints

 ┌────────┬─────────────────────────────────┬─────────────────┬────────────────────────────────────────────────────────────────────────────────────────┐
 │  HTTP  │              Path               │     Estado      │                                         Acción                                         │
 ├────────┼─────────────────────────────────┼─────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ POST   │ /patients                       │ Existe          │ Ajustar: aceptar age_years como alternativa a date_of_birth; mapear enum species EN    │
 ├────────┼─────────────────────────────────┼─────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ GET    │ /patients                       │ Existe          │ Agregar filtros server-side: search, filter (all/today_agenda/favorites/recent),       │
 │        │                                 │ (parcial)       │ limit, offset                                                                          │
 ├────────┼─────────────────────────────────┼─────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ GET    │ /patients/:id                   │ Existe          │ Mantener                                                                               │
 ├────────┼─────────────────────────────────┼─────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ PATCH  │ /patients/:id                   │ Existe          │ Mantener (usado para weight_kg desde examen físico)                                    │
 ├────────┼─────────────────────────────────┼─────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ POST   │ /patients/favorites/:patient_id │ Crear           │ Toggle favorito                                                                        │
 ├────────┼─────────────────────────────────┼─────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ DELETE │ /patients/favorites/:patient_id │ Crear           │ Toggle favorito                                                                        │
 └────────┴─────────────────────────────────┴─────────────────┴────────────────────────────────────────────────────────────────────────────────────────┘

 Gaps contra UI

 - Entity Patient del cliente: falta weightKg, ownerPhone. Ampliar antes de wirear POST real.
 - Form AddPatientView no captura breed, sex. Decidir: agregar al form o dejar opcional en backend.
 - Filtro hospitalized depende de tabla Fase 2 — omitir del scope actual.
 - Mapping age_years ↔ date_of_birth: calcular date_of_birth = today - age_years en cliente al POST.

 ---
 Módulo 4 — Consulta

 Tablas

 ┌──────────────────────────┬────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │          Tabla           │ Acción │                                                   Campos clave                                                   │
 ├──────────────────────────┼────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ consultations            │ Crear  │ id, patient_id, veterinarian_id, type (enum), status (enum), chief_complaint, summary, primary_diagnosis, result │
 │                          │        │  (enum), pause_reason (enum), pause_note, paused_at, closed_at, created_at                                       │
 ├──────────────────────────┼────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ consultation_sections    │ Crear  │ id, consultation_id, section (enum), text, audio_url, processed_at                                               │
 ├──────────────────────────┼────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ consultation_attachments │ Crear  │ id, consultation_id, section, storage_path, mime_type, label, size_bytes                                         │
 └──────────────────────────┴────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

 Enums:
 - consultation_type: routine | surgery | emergency.
 - consultation_status: in_progress | paused | signed.
 - consultation_result: discharge | hospitalization | deceased | referred.
 - consultation_pause_reason: labs | imaging | procedure | owner | other.
 - consultation_section: anamnesis | examen_fisico | problemas | abordaje_diagnostico | examenes_complementarios | diagnostico_presuntivo |
 diagnostico_definitivo | plan_terapeutico | pronostico_evolucion.

 Integridad (check constraint): si status = 'paused', entonces pause_reason y paused_at obligatorios.

 Storage: bucket privado Supabase consultation-attachments/.

 Endpoints

 ┌───────┬───────────────────────────────┬────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │ HTTP  │             Path              │ Estado │                                               Acción                                                │
 ├───────┼───────────────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ POST  │ /consultation/process         │ Existe │ Ajustar: aceptar text como alternativa a audio (multipart). Aceptar consultation_type +             │
 │       │                               │        │ chief_complaint en primera request (anamnesis). Agregar section examenes_complementarios            │
 ├───────┼───────────────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ GET   │ /consultation/:id             │ Existe │ Agregar status, pause_reason, pause_note, paused_at, sections_completed, sections_total en          │
 │       │                               │        │ respuesta                                                                                           │
 ├───────┼───────────────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ PATCH │ /consultation/:id/close       │ Existe │ Ajustar: chief_complaint opcional si ya se envió en primera request. result documentado como enum   │
 ├───────┼───────────────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ PATCH │ /consultation/:id/pause       │ Crear  │ Body: {reason, note?}. Solo si status=in_progress. Setea paused_at=now()                            │
 ├───────┼───────────────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ PATCH │ /consultation/:id/resume      │ Crear  │ Sin body. Solo si status=paused. Limpia pause_*                                                     │
 ├───────┼───────────────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ POST  │ /consultation/:id/attachments │ Crear  │ Multipart: section, file, label?. Sube a Storage, persiste en tabla                                 │
 └───────┴───────────────────────────────┴────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────┘

 Gaps contra UI

 - Cliente permite tipear sin audio → endpoint exige audio hoy. Bloqueante: sin soporte text, se pierde lo escrito.
 - Cliente tiene sección labs con textarea + adjuntos → endpoint no existe. Bloqueante.
 - UI captura "Motivo de consulta" arriba de los acordeones → hoy solo llega en close. Si se pausa sin cerrar, se pierde. Bloqueante.
 - UI tiene 1 campo "Diagnóstico clínico" → API pide presuntivo + definitivo. Decidir: split UI (recomendado) o unificar API.
 - UI separa "Lista de problemas" y "Abordaje diagnóstico" → API los fusiona. Decidir: split server-side (recomendado).
 - _onSign() navega directo a /today → debe pedir result antes del PATCH close. Ver §7 consultation-api-gaps.md (Fase 2 diseño).
 - Firma hológrafa: campo signature_url o signature_base64 en close — Fase 2.

 ---
 Módulo 5 — Hospitalización (Fase 2, pospuesto)

 No ejecutar ahora. UI oculta. Dejar documentado pa retomar.

 Tablas futuras: hospitalizations, treatment_events.
 Endpoints futuros: GET /hospitalizations/active, flujo de alta desde consultation_result = hospitalization.

 Ver backend-api-spec.md §3.2 pa shape esperado.

 ---
 Convenciones globales del API

 - Wrapper respuesta: { "data": ..., "meta": {...}, "error": null }. Errores: { "data": null, "error": { "code": "...", "message": "..." } }.
 - Timestamps: todos TIMESTAMPTZ ISO 8601 con TZ. Cliente formatea en zona local.
 - Enum strategy: Postgres CREATE TYPE ... AS ENUM. API serializa como string.
 - Auth: JWT Supabase en header Authorization: Bearer <token>. RLS por veterinarian_id = auth.uid() donde aplique.
 - Paginación: offset-based (limit, offset) hasta que haya dataset grande.

 ---
 Orden de ejecución (milestones)

 Milestone 0 — Reset schema Supabase

 1. Drop schema actual (dev).
 2. Correr SQL consolidado: enums + tablas base (veterinarians, patients, consultations, consultation_sections, consultation_attachments, appointments,
 patient_alerts, vet_favorite_patients).
 3. RLS policies: vet solo ve sus propios registros.
 4. Storage bucket privado consultation-attachments.

 Milestone 1 — Auth enriquecido (desbloquea header dashboard)

 5. Enriquecer POST /auth/login + /auth/register con veterinarian completo + salutation.
 6. Cliente: actualizar AuthDatasource + entity.

 Milestone 2 — Dashboard datos reales

 7. GET /appointments/today (requiere tabla appointments lista).
 8. GET /consultations/recent?limit=4.
 9. Cliente: reemplazar mocks de today_appointments.dart, recent_consultations.dart.

 Milestone 3 — Pacientes datos reales

 10. GET /patients con filtros server-side + fulltext search.
 11. POST /patients ajustado (mapping age_years).
 12. Ampliar entity Patient cliente (weightKg, ownerPhone).
 13. Cliente: reemplazar mocks all_patients.dart, filtered_patients.dart.

 Milestone 4 — Consulta bloqueantes

 14. POST /consultation/process acepta text alternativo a audio.
 15. POST /consultation/process acepta consultation_type + chief_complaint en primera request.
 16. Split sección problemas vs abordaje_diagnostico en backend.
 17. Nueva sección examenes_complementarios + endpoint POST /consultation/:id/attachments.

 Milestone 5 — Estado paused

 18. Columnas status, pause_reason, pause_note, paused_at en consultations (ya en schema Milestone 0).
 19. PATCH /consultation/:id/pause.
 20. PATCH /consultation/:id/resume.
 21. GET /consultations?status=paused pa dashboard.
 22. Cliente: crear pause_consultation_sheet.dart + in_progress_consultations_section.dart.

 Milestone 6 — Pacientes features secundarias

 23. patient_alerts endpoints (crear alerta, listar). Filtro has_alert en GET /patients.
 24. vet_favorite_patients + endpoints toggle + filtro favorites.

 Fase 2 (fuera de scope actual)

 - Hospitalización completa.
 - Firma hológrafa en close.
 - Selector de result en UI de cierre (hospitalization/deceased/referred).

 ---
 Archivos críticos a tocar (cliente)

 Backend (fuera de este repo) vive en C:\Users\LENOVO\Documents\DevLino\BackendVetApp\.

 Cliente Flutter — archivos que consumen estos endpoints:

 - lib/features/auth/infrastructure/api/auth_api.dart — constantes de rutas.
 - lib/features/auth/infrastructure/datasources/auth_datasource_impl.dart — mapear respuesta enriquecida.
 - lib/features/auth/domain/entities/auth_session.dart — ampliar con salutation.
 - lib/features/patients/domain/entities/patient.dart — ampliar con weightKg, ownerPhone.
 - lib/features/patients/infrastructure/ — crear datasource + repo + api constants (hoy gitkeep).
 - lib/features/consultation/infrastructure/ — crear datasource + repo + api constants.
 - lib/features/appointments/infrastructure/ — crear datasource + repo + api constants.
 - Controllers de mock (todos con TODO(api)):
   - features/appointments/presentation/controllers/today_appointments.dart
   - features/consultations/presentation/controllers/recent_consultations.dart
   - features/patients/presentation/controllers/all_patients.dart
   - features/patients/presentation/controllers/filtered_patients.dart

 Reutilizar: lib/core/errors/api_exception_handler.dart (traducir errores Dio → excepciones dominio), patrón de capas de
 .claude/rules/arquitectura-explicada.md.

 ---
 Verificación

 Por milestone, criterio de "listo":

 - M0: SELECT * FROM veterinarians devuelve estructura esperada. Policies RLS bloquean acceso cross-vet.
 - M1: POST /auth/login responde con veterinarian.salutation. Cliente muestra Dr. Mena en header sin segundo request.
 - M2: Dashboard muestra appointments reales del día + consultas recientes reales. Ningún "TODO(api)" activo en controllers de dashboard.
 - M3: Listado pacientes filtra server-side. Búsqueda por nombre funciona. POST crea paciente con weight_kg persistido.
 - M4: Consulta permite tipeo sin grabar. Sección labs sube PDF. Primera request guarda chief_complaint aunque la consulta quede abierta.
 - M5: Pausar consulta desde UI → aparece en dashboard "En progreso" con motivo. Reanudar la vuelve a estado in_progress.
 - M6: Chip "alerta" visible en pacientes con patient_alerts.active. Toggle favorito persiste.

 Test manual end-to-end sugerido (post-M5): login → ver dashboard → crear paciente → iniciar consulta → tipear anamnesis → pausar con reason=labs → volver
 al dashboard → ver tarjeta en "En progreso" → reanudar → completar secciones → cerrar con result=discharge.

 ---
 Riesgos / decisiones abiertas

 - Reescritura destruye data dev existente: confirmar que no hay pacientes/consultas reales en Supabase antes de drop. Hacer backup JSON si hay dudas.
 - Enum species migración futura: si más adelante se agregan especies (aves, reptiles), requerirá ALTER TYPE. Considerar other + campo libre desde ya si el
  alcance clínico crece.
 - RLS policies: definir desde el inicio. Un vet no debe ver pacientes/consultas de otro vet. Excepción: pacientes compartidos de una clínica (Fase 2).
 - Firma + Selector de result: pendiente diseño UI antes de implementar. No bloquea milestones 0-6.