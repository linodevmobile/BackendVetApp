// Hospital patient detail — full screen, not a sheet.
// 4 tabs (Resumen / Bitácora / Tareas / Vitales) + "Registrar" FAB that opens action picker.

function HospitalPatient({ patient, goto, toast, onDischarge }) {
  const { ConfirmDialog } = window;
  const [tab, setTab] = React.useState('resumen');
  const [showRegistrar, setShowRegistrar] = React.useState(false);
  const [activeAction, setActiveAction] = React.useState(null); // 'medicamento' | 'fluido' | 'procedimiento' | 'alimentacion' | 'nota'
  const [confirmDischarge, setConfirmDischarge] = React.useState(false);

  const p = patient;

  return (
    <div style={{ paddingBottom: 140, position: 'relative', minHeight: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 0', background: T.surface,
        borderBottom: `1px solid ${T.line}`, position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <button onClick={() => goto('hospitalization')} style={{
            width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.line}`,
            background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}><Icon name="back" size={15} color={T.ink60}/></button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: T.ink40, fontFamily: T.mono, letterSpacing: 1.2, textTransform: 'uppercase' }}>
              Hospitalizado · Día {p.day}
            </div>
          </div>
          <button onClick={() => toast('info', 'Compartir resumen')} style={{
            width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.line}`,
            background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}><Icon name="share" size={14} color={T.ink60}/></button>
        </div>

        {/* Patient header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <PetAvatar species={p.species} size={48} urgent={p.status === 'critical'}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: -0.4 }}>{p.name}</h1>
              {p.status === 'critical' && <Chip tone="urgent" size="xs">Crítico</Chip>}
              {p.status === 'attention' && <Chip tone="warn" size="xs">Atención</Chip>}
              {p.status === 'stable' && <Chip tone="ok" size="xs">Estable</Chip>}
            </div>
            <div style={{ fontSize: 11, color: T.ink60, marginTop: 2 }}>
              {p.dx} · {p.owner}
            </div>
          </div>
        </div>

        {/* Vitals strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12,
        }}>
          {[
            { k: 'Tº',   v: p.vitals.temp, u: '°C',  alert: p.vitals.tempAlert },
            { k: 'FC',   v: p.vitals.fc,   u: 'ppm', alert: p.vitals.fcAlert },
            { k: 'FR',   v: p.vitals.fr,   u: 'rpm' },
            { k: 'SpO₂', v: p.vitals.spo2, u: '%',   alert: p.vitals.spo2 < 95 },
          ].map((m, i) => (
            <div key={i} style={{
              background: m.alert ? T.urgentSoft : T.surfaceAlt,
              border: m.alert ? `1px solid #F2B8BE` : 'none',
              borderRadius: 8, padding: '6px 8px',
            }}>
              <div style={{
                fontSize: 9, color: m.alert ? T.urgent : T.ink40,
                fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600,
              }}>{m.k}</div>
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: m.alert ? T.urgent : T.ink, letterSpacing: -0.2, marginTop: 1,
              }}>
                {m.v}<span style={{ fontSize: 9, color: T.ink40, fontWeight: 400, marginLeft: 2 }}>{m.u}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, margin: '0 -16px', padding: '0 16px' }}>
          {[
            { id: 'resumen',  label: 'Resumen' },
            { id: 'bitacora', label: 'Bitácora', badge: p.bitacora?.length || 0 },
            { id: 'tareas',   label: 'Tareas',   badge: p.tasks.filter(t => !t.done).length, alert: p.overdueCount > 0 },
            { id: 'vitales',  label: 'Vitales 24h' },
          ].map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '10px 0 12px', border: 'none', background: 'transparent',
                fontSize: 13, fontWeight: active ? 600 : 500,
                color: active ? T.ink : T.ink60,
                borderBottom: `2px solid ${active ? T.accent : 'transparent'}`,
                cursor: 'pointer', fontFamily: T.sans, display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
                {t.label}
                {t.badge ? (
                  <span style={{
                    fontSize: 9, fontWeight: 600, fontFamily: T.mono,
                    padding: '1px 5px', borderRadius: 999,
                    background: t.alert ? T.urgent : T.ink20,
                    color: t.alert ? '#fff' : T.ink80,
                  }}>{t.badge}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ padding: '16px' }}>
        {tab === 'resumen'  && <ResumenTab p={p} onOpenTab={setTab} onDischarge={() => setConfirmDischarge(true)}/>}
        {tab === 'bitacora' && <BitacoraTab p={p} toast={toast}/>}
        {tab === 'tareas'   && <TareasTab p={p} toast={toast}/>}
        {tab === 'vitales'  && <VitalesTab p={p}/>}
      </div>

      {/* Registrar FAB — sticky pinned to bottom of viewport */}
      <div style={{
        position: 'sticky', bottom: 0, zIndex: 20,
        pointerEvents: 'none',
        marginTop: -60, // pulls it up into the tab bar area
      }}>
        <button onClick={() => setShowRegistrar(true)} style={{
          position: 'absolute', bottom: 84, right: 18,
          pointerEvents: 'auto',
          height: 52, padding: '0 20px', borderRadius: 26,
          background: T.ink, color: '#fff', border: 'none',
          display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
          fontSize: 14, fontWeight: 500, fontFamily: T.sans, letterSpacing: -0.1,
          boxShadow: '0 8px 24px rgba(14,23,38,0.24)',
        }}>
          <Icon name="plus" size={16} color="#fff"/>
          Registrar
        </button>
      </div>

      {showRegistrar && !activeAction && (
        <ActionPickerSheet
          onClose={() => setShowRegistrar(false)}
          onPick={(a) => { setActiveAction(a); }}
        />
      )}

      {activeAction && (
        <ActionForm
          kind={activeAction}
          patient={p}
          onClose={() => { setActiveAction(null); setShowRegistrar(false); }}
          onSave={(summary) => {
            setActiveAction(null); setShowRegistrar(false);
            toast('success', summary);
          }}
        />
      )}

      {confirmDischarge && (
        <ConfirmDialog
          title={`Dar de alta a ${p.name}?`}
          body="Se cerrará la internación y se generará el resumen de alta firmado."
          confirm="Sí, dar de alta"
          onConfirm={() => { onDischarge(); }}
          onCancel={() => setConfirmDischarge(false)}
        />
      )}
    </div>
  );
}

// ═══ Tab: Resumen ═══════════════════════════════════════════════════
function ResumenTab({ p, onOpenTab, onDischarge }) {
  const lastBitacora = (p.bitacora || [])[0];
  const nextTasks = p.tasks.filter(t => !t.done).slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Critical alert */}
      {p.status === 'critical' && (
        <Card pad={12} style={{ background: T.urgentSoft, border: `1px solid #F2B8BE` }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, background: T.urgent, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}><Icon name="alert" size={15} color="#fff"/></div>
            <div style={{ fontSize: 12, color: T.ink, lineHeight: 1.4 }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Paciente crítico</div>
              <div style={{ color: T.ink80 }}>Reevaluar cada 2 h. Notificar a responsable de turno ante cambios.</div>
            </div>
          </div>
        </Card>
      )}

      {/* Admission */}
      <div>
        <SectionTitle kicker="Ingreso" title="Motivo y plan"/>
        <Card>
          <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.5, marginBottom: 10 }}>
            {p.admissionNote || p.dx}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 11 }}>
            <div>
              <div style={{ fontFamily: T.mono, color: T.ink40, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600, marginBottom: 2 }}>Ingreso</div>
              <div style={{ color: T.ink80 }}>{p.admissionDate || 'Hoy 08:12'}</div>
            </div>
            <div>
              <div style={{ fontFamily: T.mono, color: T.ink40, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600, marginBottom: 2 }}>Responsable</div>
              <div style={{ color: T.ink80 }}>Dr. {p.vet || 'Sánchez'}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Next tasks preview */}
      <div>
        <SectionTitle kicker="Plan del día" title="Próximas tareas"
          trailing={<button onClick={() => onOpenTab('tareas')} style={{
            fontSize: 11, color: T.accent, background: 'transparent', border: 'none',
            cursor: 'pointer', fontFamily: T.sans, fontWeight: 500,
          }}>Ver todas →</button>}
        />
        <Card pad={0}>
          {nextTasks.map((t, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderBottom: i < nextTasks.length - 1 ? `1px solid ${T.lineSoft}` : 'none',
            }}>
              <div style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: t.overdue ? T.urgent : T.ink60, width: 44 }}>
                {t.time}
              </div>
              <div style={{ flex: 1, fontSize: 12, color: T.ink }}>
                {t.label}
                {t.overdue && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 600, color: T.urgent, fontFamily: T.mono }}>VENCIDA</span>}
              </div>
            </div>
          ))}
          {nextTasks.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: T.ink60 }}>
              Sin tareas pendientes
            </div>
          )}
        </Card>
      </div>

      {/* Last bitacora */}
      <div>
        <SectionTitle kicker="Turno" title="Última nota"
          trailing={<button onClick={() => onOpenTab('bitacora')} style={{
            fontSize: 11, color: T.accent, background: 'transparent', border: 'none',
            cursor: 'pointer', fontFamily: T.sans, fontWeight: 500,
          }}>Ver bitácora →</button>}
        />
        {lastBitacora ? (
          <Card>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <EntryDot kind={lastBitacora.kind}/>
              <div style={{ fontSize: 10, fontFamily: T.mono, color: T.ink40, letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 600 }}>
                {ENTRY_LABEL[lastBitacora.kind]}
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 10, fontFamily: T.mono, color: T.ink40 }}>
                {lastBitacora.time}
              </div>
            </div>
            <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.5 }}>
              {lastBitacora.text}
            </div>
            <div style={{ fontSize: 10, color: T.ink40, marginTop: 8, fontFamily: T.mono }}>
              — {lastBitacora.author}
            </div>
          </Card>
        ) : (
          <Card><div style={{ fontSize: 12, color: T.ink60, textAlign: 'center', padding: 10 }}>Sin notas aún</div></Card>
        )}
      </div>

      {/* Discharge */}
      <Btn variant="secondary" size="md" icon="bed" full onClick={onDischarge}>Dar de alta</Btn>
    </div>
  );
}

// ═══ Tab: Bitácora ═════════════════════════════════════════════════
function BitacoraTab({ p, toast }) {
  const entries = p.bitacora || [];
  return (
    <div>
      {/* Dictation prompt */}
      <Card style={{ marginBottom: 14, background: T.accentSoft, border: `1px solid ${T.accent}` }} pad={12}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => toast('info', 'Dictando nota…')} style={{
            width: 40, height: 40, borderRadius: '50%',
            background: T.accent, color: '#fff', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}><Icon name="mic" size={18} color="#fff"/></button>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.accentInk }}>Dictar nota de turno</div>
            <div style={{ fontSize: 11, color: T.accentInk, opacity: 0.8, marginTop: 1 }}>IA estructura y etiqueta automáticamente</div>
          </div>
        </div>
      </Card>

      {/* Timeline */}
      <div style={{ position: 'relative' }}>
        {/* vertical line */}
        <div style={{ position: 'absolute', left: 11, top: 10, bottom: 10, width: 1, background: T.line }}/>
        {entries.map((e, i) => (
          <div key={i} style={{ position: 'relative', paddingLeft: 32, paddingBottom: 14 }}>
            <EntryDot kind={e.kind} big/>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontFamily: T.mono, color: T.ink40, letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 600 }}>
                {ENTRY_LABEL[e.kind]}
              </span>
              <span style={{ fontSize: 10, fontFamily: T.mono, color: T.ink40 }}>· {e.time}</span>
              {e.ai && <span style={{ fontSize: 9, fontFamily: T.mono, color: T.accentInk, background: T.accentSoft, padding: '1px 5px', borderRadius: 3, fontWeight: 600 }}>IA</span>}
            </div>
            <Card pad={10}>
              <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.5 }}>{e.text}</div>
              {e.meta && (
                <div style={{
                  marginTop: 6, paddingTop: 6, borderTop: `1px solid ${T.lineSoft}`,
                  fontSize: 10, fontFamily: T.mono, color: T.ink60,
                }}>
                  {e.meta}
                </div>
              )}
              <div style={{ fontSize: 10, color: T.ink40, marginTop: 6, fontFamily: T.mono }}>— {e.author}</div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══ Tab: Tareas ═══════════════════════════════════════════════════
function TareasTab({ p, toast }) {
  const [tasks, setTasks] = React.useState(p.tasks);
  const toggle = (idx) => {
    setTasks(prev => prev.map((t, i) => i === idx ? { ...t, done: !t.done, overdue: !t.done ? false : t.overdue } : t));
    toast('success', tasks[idx].done ? 'Tarea desmarcada' : `${tasks[idx].label} registrada`);
  };
  const overdue = tasks.filter(t => t.overdue && !t.done);
  const pending = tasks.filter(t => !t.done && !t.overdue);
  const done    = tasks.filter(t => t.done);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {overdue.length > 0 && (
        <TaskList kicker="Vencidas" tone="urgent" tasks={overdue} onToggle={toggle} base={tasks}/>
      )}
      <TaskList kicker="Pendientes" tone="accent" tasks={pending} onToggle={toggle} base={tasks}/>
      {done.length > 0 && (
        <TaskList kicker="Completadas hoy" tone="ok" tasks={done} onToggle={toggle} base={tasks}/>
      )}
    </div>
  );
}

function TaskList({ kicker, tone, tasks, onToggle, base }) {
  const color = { urgent: T.urgent, accent: T.accent, ok: T.ok }[tone];
  return (
    <div>
      <div style={{ padding: '0 2px 6px', display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color, fontFamily: T.mono, letterSpacing: 1.2, textTransform: 'uppercase' }}>{kicker}</span>
        <span style={{ fontSize: 10, color: T.ink40, fontFamily: T.mono }}>{tasks.length}</span>
      </div>
      <Card pad={0}>
        {tasks.map((t, i) => {
          const realIdx = base.indexOf(t);
          return (
            <div key={i} onClick={() => onToggle(realIdx)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderBottom: i < tasks.length - 1 ? `1px solid ${T.lineSoft}` : 'none',
              cursor: 'pointer', opacity: t.done ? 0.55 : 1,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                background: t.done ? T.ok : (t.overdue ? T.urgentSoft : T.surfaceAlt),
                color: t.done ? '#fff' : (t.overdue ? T.urgent : T.ink60),
                border: t.done ? 'none' : `1px solid ${t.overdue ? T.urgent : T.line}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {t.done && <Icon name="check" size={12}/>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: T.ink, textDecoration: t.done ? 'line-through' : 'none' }}>
                  {t.label}
                </div>
                <div style={{ fontSize: 10, color: T.ink60, fontFamily: T.mono, marginTop: 1 }}>
                  {t.time}{t.dose ? ` · ${t.dose}` : ''}
                </div>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ═══ Tab: Vitales 24h ══════════════════════════════════════════════
function VitalesTab({ p }) {
  const series = p.vitalsHistory || SAMPLE_VITALS;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <VitalChart title="Temperatura" unit="°C" color={T.urgent} critical={39.5}   series={series.temp}/>
      <VitalChart title="Frecuencia cardíaca" unit="ppm" color={T.accent} critical={160} series={series.fc}/>
      <VitalChart title="SpO₂" unit="%" color={T.ok} critical={95} lower series={series.spo2}/>
    </div>
  );
}

function VitalChart({ title, unit, color, critical, lower, series }) {
  const min = Math.min(...series.map(d => d.v));
  const max = Math.max(...series.map(d => d.v));
  const range = max - min || 1;
  const W = 340, H = 80, PAD = 8;
  const points = series.map((d, i) => {
    const x = PAD + (i / (series.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((d.v - min) / range) * (H - PAD * 2);
    return { x, y, v: d.v, alert: lower ? d.v < critical : d.v > critical };
  });
  const path = points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x},${pt.y}`).join(' ');
  const last = series[series.length - 1];
  const lastAlert = lower ? last.v < critical : last.v > critical;

  return (
    <Card pad={12}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 10, color: T.ink40, fontFamily: T.mono, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>
            {title}
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: lastAlert ? T.urgent : T.ink, letterSpacing: -0.3, marginTop: 2 }}>
            {last.v}<span style={{ fontSize: 11, color: T.ink40, fontWeight: 400, marginLeft: 3 }}>{unit}</span>
          </div>
        </div>
        <div style={{ fontSize: 10, color: T.ink40, fontFamily: T.mono }}>
          últimas 24h
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round"/>
        {points.map((pt, i) => pt.alert && (
          <circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill={T.urgent}/>
        ))}
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3.5}
          fill={lastAlert ? T.urgent : color}/>
      </svg>
    </Card>
  );
}

// ═══ Shared: entry type visuals ═════════════════════════════════════
const ENTRY_LABEL = {
  medicamento:  'Medicamento',
  fluido:       'Fluidoterapia',
  procedimiento:'Procedimiento',
  alimentacion: 'Alimentación',
  nota:         'Nota clínica',
  vital:        'Vitales',
};
const ENTRY_COLOR = {
  medicamento:   T.accent,
  fluido:        '#2E7D9A',
  procedimiento: '#8B5FBF',
  alimentacion:  T.ok,
  nota:          T.ink60,
  vital:         T.warn,
};
function EntryDot({ kind, big }) {
  const size = big ? 22 : 10;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: ENTRY_COLOR[kind], flexShrink: 0,
      position: big ? 'absolute' : 'static',
      left: big ? 0 : undefined, top: big ? 0 : undefined,
      border: big ? `3px solid ${T.bg}` : 'none',
    }}/>
  );
}

// ═══ Action picker sheet ═══════════════════════════════════════════
function ActionPickerSheet({ onClose, onPick }) {
  const actions = [
    { id: 'medicamento',  icon: 'pill',   label: 'Medicamento',   sub: 'Aplicar fármaco registrado' },
    { id: 'fluido',       icon: 'weight', label: 'Fluidoterapia', sub: 'Solución, volumen, velocidad' },
    { id: 'procedimiento',icon: 'edit',   label: 'Procedimiento', sub: 'Curación, sondaje, muestra' },
    { id: 'alimentacion', icon: 'heart',  label: 'Alimentación',  sub: 'Dieta, volumen, vía' },
    { id: 'vital',        icon: 'thermo', label: 'Control vital', sub: 'Tº, FC, FR, SpO₂' },
    { id: 'nota',         icon: 'edit',   label: 'Nota libre',    sub: 'Observación, cambio de plan' },
  ];
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, background: 'rgba(14,23,38,0.5)',
      zIndex: 150, display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bg, width: '100%', borderRadius: '18px 18px 0 0',
        padding: '12px 16px 28px',
      }}>
        <div style={{ width: 36, height: 4, background: T.ink20, borderRadius: 2, margin: '0 auto 14px' }}/>
        <div style={{ fontSize: 10, color: T.ink40, fontFamily: T.mono, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
          Registrar acción
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.3, marginBottom: 12 }}>¿Qué vas a registrar?</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {actions.map(a => (
            <button key={a.id} onClick={() => onPick(a.id)} style={{
              background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12,
              padding: '12px 10px', textAlign: 'left', cursor: 'pointer', fontFamily: T.sans,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: T.surfaceAlt,
                color: ENTRY_COLOR[a.id], display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 6,
              }}><Icon name={a.icon} size={16} color={ENTRY_COLOR[a.id]}/></div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 1 }}>{a.label}</div>
              <div style={{ fontSize: 10, color: T.ink60, lineHeight: 1.35 }}>{a.sub}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══ Action form (full sheet per type) ═══════════════════════════════
function ActionForm({ kind, patient, onClose, onSave }) {
  const label = ENTRY_LABEL[kind];
  // Sample fields per type
  const fields = FORM_FIELDS[kind] || FORM_FIELDS.nota;
  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(14,23,38,0.55)',
      zIndex: 160, display: 'flex', alignItems: 'flex-end',
    }}>
      <div style={{
        background: T.bg, width: '100%', height: '94%',
        borderRadius: '18px 18px 0 0', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${T.line}`, background: T.surface, borderRadius: '18px 18px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.line}`,
              background: T.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Icon name="close" size={14} color={T.ink60}/></button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontFamily: T.mono, color: T.ink40, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600 }}>
                Nueva · {label}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{patient.name}</div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {fields.map((f, i) => (
            <Field key={i} label={f.label} hint={f.hint}>
              {f.type === 'select' ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {f.options.map(opt => (
                    <button key={opt} style={{
                      padding: '8px 12px', borderRadius: 999,
                      border: `1px solid ${T.line}`, background: T.surface,
                      fontSize: 12, fontWeight: 500, color: T.ink80, cursor: 'pointer', fontFamily: T.sans,
                    }}>{opt}</button>
                  ))}
                </div>
              ) : f.type === 'textarea' ? (
                <TextInput placeholder={f.placeholder} multiline rows={4}/>
              ) : (
                <TextInput placeholder={f.placeholder}/>
              )}
            </Field>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: 14, borderTop: `1px solid ${T.line}`, background: T.surface, display: 'flex', gap: 8 }}>
          <Btn variant="secondary" size="md" full onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" size="md" full onClick={() => onSave(`${label} registrada para ${patient.name}`)}>
            Registrar
          </Btn>
        </div>
      </div>
    </div>
  );
}

const FORM_FIELDS = {
  medicamento: [
    { label: 'Fármaco', type: 'text', placeholder: 'Ej. Metronidazol' },
    { label: 'Dosis', type: 'text', placeholder: 'Ej. 15 mg/kg' },
    { label: 'Vía', type: 'select', options: ['IV', 'IM', 'SC', 'VO', 'Tópica'] },
    { label: 'Frecuencia', type: 'select', options: ['Única', 'Cada 8h', 'Cada 12h', 'Cada 24h', 'BID', 'TID'] },
    { label: 'Observaciones', type: 'textarea', placeholder: 'Respuesta, efectos adversos…' },
  ],
  fluido: [
    { label: 'Solución', type: 'select', options: ['Ringer lactato', 'SSN 0.9%', 'Dextrosa 5%', 'Mixta'] },
    { label: 'Volumen (ml)', type: 'text', placeholder: 'Ej. 250' },
    { label: 'Velocidad (ml/h)', type: 'text', placeholder: 'Ej. 40' },
    { label: 'Vía', type: 'select', options: ['IV periférica', 'IV central', 'SC'] },
    { label: 'Observaciones', type: 'textarea', placeholder: 'Cambios de acceso, reacciones…' },
  ],
  procedimiento: [
    { label: 'Procedimiento', type: 'select', options: ['Curación herida', 'Sondaje urinario', 'Toma muestra', 'Vendaje', 'Nebulización', 'Otro'] },
    { label: 'Descripción', type: 'textarea', placeholder: 'Qué se realizó, hallazgos, materiales…' },
    { label: 'Duración aprox.', type: 'text', placeholder: 'Ej. 15 min' },
  ],
  alimentacion: [
    { label: 'Dieta', type: 'text', placeholder: 'Ej. Hills A/D' },
    { label: 'Volumen / ración', type: 'text', placeholder: 'Ej. 30 ml' },
    { label: 'Vía', type: 'select', options: ['Voluntaria', 'Forzada', 'Sonda esofágica', 'Sonda nasogástrica'] },
    { label: 'Aceptación', type: 'select', options: ['Buena', 'Parcial', 'Rechazo', 'Vómito post'] },
  ],
  vital: [
    { label: 'Temperatura (°C)', type: 'text', placeholder: 'Ej. 38.7' },
    { label: 'FC (ppm)', type: 'text', placeholder: 'Ej. 120' },
    { label: 'FR (rpm)', type: 'text', placeholder: 'Ej. 24' },
    { label: 'SpO₂ (%)', type: 'text', placeholder: 'Ej. 97' },
    { label: 'Observaciones', type: 'textarea', placeholder: 'Estado general, comportamiento…' },
  ],
  nota: [
    { label: 'Nota', type: 'textarea', placeholder: 'Observación, cambio de plan, comunicación con dueño…' },
  ],
};

// ═══ Sample vitals history ══════════════════════════════════════════
const SAMPLE_VITALS = {
  temp: [
    { t: '16h', v: 38.4 }, { t: '14h', v: 38.6 }, { t: '12h', v: 39.1 }, { t: '10h', v: 39.3 },
    { t: '8h',  v: 39.5 }, { t: '6h',  v: 39.4 }, { t: '4h',  v: 39.2 }, { t: '2h',  v: 39.0 },
    { t: 'ahora', v: 39.2 },
  ],
  fc: [
    { t: '16h', v: 110 }, { t: '14h', v: 118 }, { t: '12h', v: 128 }, { t: '10h', v: 142 },
    { t: '8h',  v: 152 }, { t: '6h',  v: 148 }, { t: '4h',  v: 140 }, { t: '2h',  v: 135 },
    { t: 'ahora', v: 138 },
  ],
  spo2: [
    { t: '16h', v: 97 }, { t: '14h', v: 96 }, { t: '12h', v: 95 }, { t: '10h', v: 94 },
    { t: '8h',  v: 92 }, { t: '6h',  v: 93 }, { t: '4h',  v: 94 }, { t: '2h',  v: 93 },
    { t: 'ahora', v: 93 },
  ],
};

Object.assign(window, { HospitalPatient });
