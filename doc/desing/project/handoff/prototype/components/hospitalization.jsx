// Hospitalization v2 — scales to 10+ inpatients.
// Three lenses: triage list (default), tasks by hour, vitals matrix.
// Patient detail opens in a bottom sheet, not a new screen.

function Hospitalization({ goto, toast, setCurrentPatient }) {
  const { ConfirmDialog } = window;
  const [view, setView] = React.useState('list');
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  const [openId, setOpenId] = React.useState(null);
  const [confirmDischarge, setConfirmDischarge] = React.useState(null);

  const openFullScreen = (p) => {
    if (setCurrentPatient) setCurrentPatient(p);
    setOpenId(null);
    goto('hospital-patient');
  };

  const filtered = HOSP.filter(p => {
    if (query && !(`${p.name} ${p.owner} ${p.dx}`.toLowerCase().includes(query.toLowerCase()))) return false;
    if (filter === 'critical') return p.status === 'critical';
    if (filter === 'attention') return p.status === 'attention';
    if (filter === 'overdue')  return p.overdueCount > 0;
    if (filter === 'outgoing') return p.outgoing;
    return true;
  });

  // Sort by severity: critical → attention → stable
  const order = { critical: 0, attention: 1, stable: 2 };
  const sorted = [...filtered].sort((a, b) => order[a.status] - order[b.status] || b.overdueCount - a.overdueCount);

  const counts = {
    total:    HOSP.length,
    critical: HOSP.filter(p => p.status === 'critical').length,
    overdue:  HOSP.reduce((s, p) => s + p.overdueCount, 0),
  };

  const opened = HOSP.find(p => p.id === openId);

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px', background: T.surface,
        borderBottom: `1px solid ${T.line}`, position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button onClick={() => goto('dashboard')} style={{
            width: 36, height: 36, borderRadius: 10, border: `1px solid ${T.line}`,
            background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}><Icon name="back" size={16} color={T.ink60}/></button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: -0.4 }}>Hospitalización</h1>
            <div style={{ fontSize: 11, color: T.ink60, marginTop: 2, fontFamily: T.mono, letterSpacing: 0.3 }}>
              {counts.total} activos · <span style={{ color: T.urgent }}>{counts.critical} críticos</span> · <span style={{ color: counts.overdue > 0 ? T.urgent : T.ink60 }}>{counts.overdue} vencidas</span>
            </div>
          </div>
          <button onClick={() => toast('info', 'Admitir paciente')} style={{
            width: 36, height: 36, borderRadius: 10, background: T.accent,
            border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}><Icon name="plus" size={16} color="#fff"/></button>
        </div>

        {/* View switcher */}
        <div style={{
          display: 'flex', background: T.surfaceAlt, borderRadius: 10, padding: 3,
          marginBottom: 10,
        }}>
          {[
            { id: 'list',   label: 'Pacientes' },
            { id: 'tasks',  label: 'Tareas' },
            { id: 'vitals', label: 'Vitales' },
          ].map(v => (
            <button key={v.id} onClick={() => setView(v.id)} style={{
              flex: 1, padding: '7px 0', border: 'none',
              background: view === v.id ? T.surface : 'transparent',
              boxShadow: view === v.id ? '0 1px 2px rgba(14,23,38,0.06)' : 'none',
              borderRadius: 8,
              fontSize: 12, fontWeight: 500, color: view === v.id ? T.ink : T.ink60,
              cursor: 'pointer', fontFamily: T.sans,
            }}>{v.label}</button>
          ))}
        </div>

        {/* Search + filters (only in list view) */}
        {view === 'list' && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: T.surfaceAlt, borderRadius: 10, padding: '8px 10px',
              marginBottom: 10,
            }}>
              <Icon name="search" size={14} color={T.ink40}/>
              <input value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Buscar paciente, dueño, dx…"
                style={{
                  flex: 1, border: 'none', background: 'transparent',
                  fontSize: 13, color: T.ink, outline: 'none', fontFamily: T.sans,
                }}/>
              {query && (
                <button onClick={() => setQuery('')} style={{
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  color: T.ink40, padding: 2, display: 'flex',
                }}><Icon name="close" size={12}/></button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: '0 -16px', padding: '0 16px' }}>
              {[
                { id: 'all',       label: `Todos · ${counts.total}` },
                { id: 'critical',  label: `Críticos · ${counts.critical}`, tone: 'urgent' },
                { id: 'overdue',   label: `Vencidas · ${counts.overdue}`,  tone: 'warn' },
                { id: 'attention', label: 'Atención' },
                { id: 'outgoing',  label: 'Salen hoy' },
              ].map(f => {
                const active = filter === f.id;
                const toneColor = f.tone === 'urgent' ? T.urgent : f.tone === 'warn' ? T.warn : T.ink;
                return (
                  <button key={f.id} onClick={() => setFilter(f.id)} style={{
                    padding: '5px 10px', borderRadius: 999, whiteSpace: 'nowrap',
                    border: `1px solid ${active ? toneColor : T.line}`,
                    background: active ? toneColor : T.surface,
                    color: active ? '#fff' : T.ink80,
                    fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: T.sans,
                  }}>{f.label}</button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Content by view */}
      <div style={{ padding: '14px 16px' }}>
        {view === 'list' && <ListView rows={sorted} onOpen={setOpenId} onQuickMark={(label) => toast('success', `${label} completada`)}/>}
        {view === 'tasks'  && <TasksView onDone={(l) => toast('success', `${l} aplicada`)}/>}
        {view === 'vitals' && <VitalsMatrix rows={sorted} onOpen={setOpenId}/>}
      </div>

      {/* Patient bottom sheet */}
      {opened && (
        <PatientSheet
          p={opened}
          onClose={() => setOpenId(null)}
          onOpenFull={() => openFullScreen(opened)}
        />
      )}

      {confirmDischarge && (
        <ConfirmDialog
          title={`Dar de alta a ${confirmDischarge.name}?`}
          body="Se cerrará la internación y se generará el resumen de alta firmado."
          confirm="Sí, dar de alta"
          onConfirm={() => { toast('success', `${confirmDischarge.name} dado de alta`); setConfirmDischarge(null); }}
          onCancel={() => setConfirmDischarge(null)}
        />
      )}
    </div>
  );
}

// ═══ View 1: dense triage list ═══════════════════════════════════════
function ListView({ rows, onOpen, onQuickMark }) {
  if (rows.length === 0) return <EmptyState/>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map(p => <PatientRow key={p.id} p={p} onOpen={() => onOpen(p.id)} onQuickMark={onQuickMark}/>)}
    </div>
  );
}

function PatientRow({ p, onOpen, onQuickMark }) {
  const tone = {
    critical:  { stripe: T.urgent, tag: 'Crítico',  tagBg: T.urgentSoft, tagFg: T.urgent },
    attention: { stripe: T.warn,   tag: 'Atención', tagBg: T.warnSoft,   tagFg: T.warn },
    stable:    { stripe: T.ok,     tag: 'Estable',  tagBg: T.okSoft,     tagFg: T.ok },
  }[p.status];

  return (
    <div onClick={onOpen} style={{
      background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12,
      padding: '10px 12px 10px 14px', cursor: 'pointer', position: 'relative',
      display: 'flex', gap: 10, alignItems: 'center',
    }}>
      {/* Severity stripe */}
      <div style={{
        position: 'absolute', left: 0, top: 10, bottom: 10, width: 3,
        background: tone.stripe, borderRadius: '0 2px 2px 0',
      }}/>
      <PetAvatar species={p.species} size={36} urgent={p.status === 'critical'}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{p.name}</span>
          <span style={{ fontSize: 11, color: T.ink40, fontFamily: T.mono }}>· D{p.day}</span>
          {p.overdueCount > 0 && (
            <span style={{
              fontSize: 9, fontWeight: 600, color: T.urgent, background: T.urgentSoft,
              padding: '1px 6px', borderRadius: 999, marginLeft: 'auto',
              fontFamily: T.mono, letterSpacing: 0.3,
            }}>⚠ {p.overdueCount}</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: T.ink60, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.dx}
        </div>
        <div style={{ display: 'flex', gap: 8, fontSize: 10, color: T.ink80, fontFamily: T.mono }}>
          <MiniVital k="Tº" v={p.vitals.temp} u="°" alert={p.vitals.tempAlert}/>
          <MiniVital k="FC" v={p.vitals.fc} alert={p.vitals.fcAlert}/>
          <MiniVital k="SpO₂" v={p.vitals.spo2} u="%" alert={p.vitals.spo2 < 95}/>
          <div style={{ marginLeft: 'auto', color: p.nextAlert ? T.urgent : T.ink60, fontWeight: p.nextAlert ? 600 : 400 }}>
            {p.nextTask}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniVital({ k, v, u = '', alert }) {
  return (
    <span style={{ color: alert ? T.urgent : T.ink80, fontWeight: alert ? 600 : 400 }}>
      {k} <span style={{ color: alert ? T.urgent : T.ink }}>{v}{u}</span>
    </span>
  );
}

// ═══ View 2: Tasks grouped by time window ═══════════════════════════
function TasksView({ onDone }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <TaskGroup kicker="Vencidas" count={2} tone="urgent" tasks={[
        { t: '15:45', label: 'Fluidoterapia Ringer', who: 'Kira', subtitle: 'Pancreatitis', overdue: '+18 min' },
        { t: '15:50', label: 'Control vital',         who: 'Thor', subtitle: 'Post-op',      overdue: '+13 min' },
      ]} onDone={onDone}/>
      <TaskGroup kicker="Ahora" count={3} tone="accent" tasks={[
        { t: '16:00', label: 'Metronidazol IV',  who: 'Kira',  subtitle: '15 mg/kg' },
        { t: '16:00', label: 'Amoxicilina VO',   who: 'Simón', subtitle: '50 mg' },
        { t: '16:15', label: 'Curación herida',  who: 'Rocky', subtitle: 'Post-op día 3' },
      ]} onDone={onDone}/>
      <TaskGroup kicker="En 30 min" count={4} tone="neutral" tasks={[
        { t: '16:30', label: 'Control temperatura', who: 'Kira' },
        { t: '16:30', label: 'Alimentación forzada', who: 'Luna',  subtitle: '30ml A/D' },
        { t: '16:45', label: 'Fluidoterapia',        who: 'Mishka', subtitle: '40 ml/h' },
        { t: '17:00', label: 'Analgesia',            who: 'Thor',   subtitle: 'Tramadol 2mg/kg' },
      ]} onDone={onDone}/>
    </div>
  );
}

function TaskGroup({ kicker, count, tone, tasks, onDone }) {
  const color = { urgent: T.urgent, accent: T.accent, neutral: T.ink60 }[tone];
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6, padding: '0 2px',
      }}>
        <span style={{ fontSize: 10, fontWeight: 600, color, fontFamily: T.mono, letterSpacing: 1.2, textTransform: 'uppercase' }}>
          {kicker}
        </span>
        <span style={{ fontSize: 10, color: T.ink40, fontFamily: T.mono }}>{count}</span>
      </div>
      <Card pad={0}>
        {tasks.map((task, i) => (
          <div key={i} onClick={() => onDone(task.label)} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            borderBottom: i < tasks.length - 1 ? `1px solid ${T.lineSoft}` : 'none',
            cursor: 'pointer',
          }}>
            <div style={{
              width: 42, fontSize: 12, fontWeight: 600, fontFamily: T.mono,
              color: task.overdue ? T.urgent : T.ink,
            }}>{task.t}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>
                {task.label} <span style={{ fontWeight: 400, color: T.ink60 }}>· {task.who}</span>
              </div>
              <div style={{ fontSize: 10, color: T.ink60, marginTop: 1, fontFamily: T.mono }}>
                {task.subtitle || ''}{task.overdue ? ` · ${task.overdue}` : ''}
              </div>
            </div>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              border: `1px solid ${task.overdue ? T.urgent : T.line}`,
              background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: task.overdue ? T.urgent : T.ink60,
            }}><Icon name="check" size={14}/></div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ═══ View 3: Vitals matrix (wide table) ══════════════════════════════
function VitalsMatrix({ rows, onOpen }) {
  return (
    <Card pad={0} style={{ overflow: 'hidden' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1.3fr .7fr .7fr .7fr .7fr',
        padding: '8px 10px', background: T.surfaceAlt, borderBottom: `1px solid ${T.line}`,
        fontSize: 9, fontFamily: T.mono, color: T.ink40, textTransform: 'uppercase', letterSpacing: 0.8,
      }}>
        <div>Paciente</div>
        <div style={{ textAlign: 'right' }}>Tº</div>
        <div style={{ textAlign: 'right' }}>FC</div>
        <div style={{ textAlign: 'right' }}>FR</div>
        <div style={{ textAlign: 'right' }}>SpO₂</div>
      </div>
      {rows.map((p, i) => (
        <div key={p.id} onClick={() => onOpen(p.id)} style={{
          display: 'grid', gridTemplateColumns: '1.3fr .7fr .7fr .7fr .7fr',
          padding: '10px 10px', borderBottom: i < rows.length - 1 ? `1px solid ${T.lineSoft}` : 'none',
          cursor: 'pointer', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: p.status === 'critical' ? T.urgent : p.status === 'attention' ? T.warn : T.ok,
              flexShrink: 0,
            }}/>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
              <div style={{ fontSize: 9, color: T.ink40, fontFamily: T.mono }}>D{p.day}</div>
            </div>
          </div>
          <Cell v={p.vitals.temp} u="°"  alert={p.vitals.tempAlert}/>
          <Cell v={p.vitals.fc}                alert={p.vitals.fcAlert}/>
          <Cell v={p.vitals.fr}/>
          <Cell v={p.vitals.spo2} u="%" alert={p.vitals.spo2 < 95}/>
        </div>
      ))}
    </Card>
  );
}

function Cell({ v, u = '', alert }) {
  return (
    <div style={{
      textAlign: 'right', fontSize: 12, fontFamily: T.mono,
      color: alert ? T.urgent : T.ink, fontWeight: alert ? 600 : 400,
    }}>{v}{u}</div>
  );
}

// ═══ Quick-peek sheet: minimal, main CTA = Abrir ficha completa ═════
function PatientSheet({ p, onClose, onOpenFull }) {
  const overdue = p.tasks.find(t => t.overdue);
  const nextTask = p.tasks.find(t => !t.done) || null;
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, background: 'rgba(14,23,38,0.5)',
      zIndex: 150, display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bg, width: '100%', borderRadius: '18px 18px 0 0',
        padding: '12px 16px 22px',
      }}>
        <div style={{ width: 36, height: 4, background: T.ink20, borderRadius: 2, margin: '0 auto 14px' }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <PetAvatar species={p.species} size={44} urgent={p.status === 'critical'}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 17, fontWeight: 600 }}>{p.name}</span>
              <span style={{ fontSize: 11, color: T.ink40, fontFamily: T.mono }}>· Día {p.day}</span>
            </div>
            <div style={{ fontSize: 11, color: T.ink60, marginTop: 1 }}>{p.dx}</div>
          </div>
          {p.status === 'critical'  && <Chip tone="urgent" size="xs">Crítico</Chip>}
          {p.status === 'attention' && <Chip tone="warn" size="xs">Atención</Chip>}
          {p.status === 'stable'    && <Chip tone="ok" size="xs">Estable</Chip>}
        </div>

        {/* Vitals */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
          {[
            { k: 'Tº',   v: p.vitals.temp, u: '°C',  alert: p.vitals.tempAlert },
            { k: 'FC',   v: p.vitals.fc,   u: 'ppm', alert: p.vitals.fcAlert },
            { k: 'FR',   v: p.vitals.fr,   u: 'rpm' },
            { k: 'SpO₂', v: p.vitals.spo2, u: '%',   alert: p.vitals.spo2 < 95 },
          ].map((m, i) => (
            <div key={i} style={{
              background: m.alert ? T.urgentSoft : T.surface,
              border: `1px solid ${m.alert ? '#F2B8BE' : T.line}`,
              borderRadius: 10, padding: '7px 9px',
            }}>
              <div style={{ fontSize: 9, color: m.alert ? T.urgent : T.ink40, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{m.k}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: m.alert ? T.urgent : T.ink, letterSpacing: -0.2, marginTop: 1 }}>
                {m.v}<span style={{ fontSize: 9, color: T.ink40, fontWeight: 400, marginLeft: 2 }}>{m.u}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Next task / overdue summary */}
        {(overdue || nextTask) && (
          <Card pad={10} style={{ marginBottom: 12, background: overdue ? T.urgentSoft : T.surface, border: overdue ? `1px solid #F2B8BE` : `1px solid ${T.line}` }}>
            <div style={{ fontSize: 9, fontFamily: T.mono, color: overdue ? T.urgent : T.ink40, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, marginBottom: 3 }}>
              {overdue ? 'Tarea vencida' : 'Próxima tarea'}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>
              {(overdue || nextTask).label} <span style={{ color: T.ink60, fontWeight: 400 }}>· {(overdue || nextTask).time}</span>
            </div>
          </Card>
        )}

        <Btn variant="primary" size="md" full icon="arrowR" onClick={onOpenFull}>
          Abrir ficha completa
        </Btn>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>Sin pacientes que coincidan</div>
      <div style={{ fontSize: 12, color: T.ink60, marginTop: 4 }}>Ajusta filtros o búsqueda.</div>
    </div>
  );
}

// ═══ Realistic dataset: 10 inpatients ═══════════════════════════════
const HOSP = [
  { id: 'kira',   name: 'Kira',   species: 'dog',    owner: 'Ana Martínez',  day: 2, dx: 'Pancreatitis aguda',       status: 'critical',  overdueCount: 1, nextTask: '⚠ 15:45 Fluidoterapia', nextAlert: true,  outgoing: false,
    vitals: { temp: '39.2', tempAlert: true,  fc: 138, fcAlert: true,  fr: 28, spo2: 93 },
    tasks: [
      { label: 'Metronidazol IV', time: '15:00', done: true },
      { label: 'Fluidoterapia Ringer', time: '16:00', overdue: true },
      { label: 'Reevaluación dolor', time: '18:00' },
      { label: 'Metronidazol IV', time: '21:00' },
    ],
  },
  { id: 'thor',   name: 'Thor',   species: 'dog',    owner: 'Julian Smith',  day: 1, dx: 'Gastroenteritis hemorrágica', status: 'critical',  overdueCount: 1, nextTask: '⚠ 15:50 Control vital', nextAlert: true, outgoing: false,
    vitals: { temp: '39.6', tempAlert: true,  fc: 152, fcAlert: true,  fr: 32, spo2: 94 },
    tasks: [
      { label: 'Control vital', time: '15:50', overdue: true },
      { label: 'Analgesia Tramadol', time: '17:00' },
    ],
  },
  { id: 'mishka', name: 'Mishka', species: 'cat',    owner: 'Clara Ruiz',    day: 3, dx: 'IRC descompensada',         status: 'attention', overdueCount: 0, nextTask: '16:45 Fluidoterapia', outgoing: false,
    vitals: { temp: '38.9', fc: 180, fr: 30, spo2: 96 },
    tasks: [
      { label: 'Fluidoterapia', time: '16:45' },
      { label: 'Ranitidina SC', time: '18:00' },
    ],
  },
  { id: 'luna',   name: 'Luna',   species: 'cat',    owner: 'Pablo Vidal',   day: 2, dx: 'Lipidosis hepática',         status: 'attention', overdueCount: 0, nextTask: '16:30 Alimentación', outgoing: false,
    vitals: { temp: '38.4', fc: 172, fr: 26, spo2: 97 },
    tasks: [
      { label: 'Alimentación forzada', time: '16:30' },
      { label: 'Control peso', time: '20:00' },
    ],
  },
  { id: 'rocky',  name: 'Rocky',  species: 'dog',    owner: 'Laura Peña',    day: 3, dx: 'Post-op fractura',           status: 'attention', overdueCount: 0, nextTask: '16:15 Curación', outgoing: false,
    vitals: { temp: '38.6', fc: 108, fr: 22, spo2: 98 },
    tasks: [
      { label: 'Curación herida', time: '16:15' },
      { label: 'Meloxicam VO', time: '20:00' },
    ],
  },
  { id: 'simon',  name: 'Simón',  species: 'cat',    owner: 'Rocío Díaz',    day: 4, dx: 'Post-op castración',         status: 'stable',    overdueCount: 0, nextTask: '18:00 Amoxicilina', outgoing: true,
    vitals: { temp: '38.5', fc: 168, fr: 24, spo2: 98 },
    tasks: [
      { label: 'Amoxicilina VO', time: '18:00' },
      { label: 'Alta mañana 10:00', time: 'Mañana' },
    ],
  },
  { id: 'nala',   name: 'Nala',   species: 'dog',    owner: 'Tomás Reyes',   day: 5, dx: 'Otitis bilateral',           status: 'stable',    overdueCount: 0, nextTask: '17:30 Limpieza oído', outgoing: true,
    vitals: { temp: '38.3', fc: 96, fr: 20, spo2: 99 },
    tasks: [{ label: 'Limpieza ótica', time: '17:30' }, { label: 'Alta hoy 19:00', time: '19:00' }],
  },
  { id: 'oreo',   name: 'Oreo',   species: 'rabbit', owner: 'Sara Kim',      day: 2, dx: 'GI stasis',                 status: 'attention', overdueCount: 0, nextTask: '17:00 Motilidad', outgoing: false,
    vitals: { temp: '38.8', fc: 180, fr: 36, spo2: 97 },
    tasks: [{ label: 'Metoclopramida', time: '17:00' }, { label: 'Alimentación crítica', time: '19:00' }],
  },
  { id: 'coco',   name: 'Coco',   species: 'bird',   owner: 'Andrés Luna',   day: 1, dx: 'Aspergilosis',              status: 'critical',  overdueCount: 0, nextTask: '16:00 Itraconazol', nextAlert: true, outgoing: false,
    vitals: { temp: '40.1', tempAlert: true,  fc: 220, fr: 44, spo2: 92 },
    tasks: [{ label: 'Itraconazol', time: '16:00' }, { label: 'Nebulización', time: '18:00' }],
  },
  { id: 'max',    name: 'Max',    species: 'dog',    owner: 'Julia Carrero', day: 4, dx: 'Diabetes estabilización',    status: 'stable',    overdueCount: 0, nextTask: '19:00 Insulina', outgoing: false,
    vitals: { temp: '38.4', fc: 104, fr: 20, spo2: 99 },
    tasks: [{ label: 'Insulina NPH', time: '19:00' }, { label: 'Glucemia', time: '22:00' }],
  },
];

// Enrich every patient with admission fields and bitácora sample so the detail screen has content.
HOSP.forEach(p => {
  if (!p.admissionDate) p.admissionDate = 'Hoy 08:12';
  if (!p.vet)           p.vet = 'Sánchez';
  if (!p.admissionNote) p.admissionNote = `${p.dx}. Plan: estabilización, monitoreo ${p.status === 'critical' ? 'cada 2h' : 'cada 4h'}, reevaluar en 24h.`;
});

// Detailed bitácora only for a few (rest empty → shows empty-state naturally).
const BITACORA_KIRA = [
  { time: '15:42', kind: 'vital', author: 'Dr. Sánchez',
    text: 'T° 39.2 °C · FC 138 · FR 28 · SpO₂ 93%. Leve mejoría en FC respecto a control anterior.',
    meta: 'Registrado manualmente' },
  { time: '15:05', kind: 'medicamento', author: 'Dr. Sánchez',
    text: 'Metronidazol 15 mg/kg IV aplicado. Sin reacciones.',
    meta: 'Dosis programada · próxima 21:00' },
  { time: '14:10', kind: 'nota', ai: true, author: 'Dr. Sánchez',
    text: 'Paciente alerta, responde a estímulos. Abdomen doloroso a la palpación craneal, sin vómito en últimas 4h. Continúa con Ringer a 40 ml/h.',
    meta: 'Dictado por voz · estructurado por IA' },
  { time: '12:00', kind: 'fluido', author: 'Dr. Torres',
    text: 'Ringer lactato 250 ml IV a 40 ml/h. Acceso periférico derecho, sin flebitis.',
    meta: 'Continuo · vel. 40 ml/h' },
  { time: '09:30', kind: 'procedimiento', author: 'Dr. Sánchez',
    text: 'Extracción muestra sanguínea para hemograma y bioquímica de control. Sin complicaciones.',
    meta: 'Muestra enviada a laboratorio' },
  { time: '08:12', kind: 'nota', author: 'Dr. Sánchez',
    text: 'Ingreso por cuadro de pancreatitis aguda. Dueña reporta vómitos intermitentes desde hace 48h y anorexia. Plan: fluidoterapia, analgesia, antibiótico, control dolor cada 4h.',
    meta: 'Ingreso' },
];

HOSP.find(p => p.id === 'kira').bitacora = BITACORA_KIRA;
HOSP.find(p => p.id === 'thor').bitacora = [
  { time: '15:20', kind: 'vital', author: 'Dr. Sánchez',
    text: 'T° 39.6 · FC 152 · SpO₂ 94. Empeora respecto a última toma.',
    meta: 'Riesgo de shock — aumentar volumen fluidos' },
  { time: '13:45', kind: 'medicamento', author: 'Dr. Sánchez',
    text: 'Omeprazol 1 mg/kg IV. Tramadol 2 mg/kg IM para control de dolor.' },
  { time: '08:00', kind: 'nota', author: 'Dr. Sánchez',
    text: 'Ingreso por gastroenteritis hemorrágica aguda. Paciente decaído, con heces sanguinolentas. Inicio tratamiento agresivo con fluidos y antibióticos.',
    meta: 'Ingreso' },
];

Object.assign(window, { Hospitalization });
