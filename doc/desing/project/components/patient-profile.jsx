// Patient profile — Historia clínica completa
//  - 5 tabs: Resumen / Historia / Salud / Adjuntos / Propietario
//  - Salud agrupa Vacunas (plan sugerido + manual), Peso (gráfico evolutivo) y Cirugías (de hospitalización)
//  - Adjuntos categorizados (laboratorio · imagen · recetas · otros)
//  - Propietario como tab propio con datos completos + historial de pagos

const VAX_PLAN_DOG = [
  { name: 'Polivalente (DHPPi-L)', last: '11 abr 2026', next: '11 abr 2027', status: 'ok',     mode: 'plan' },
  { name: 'Antirrábica',           last: '11 abr 2026', next: '11 abr 2027', status: 'ok',     mode: 'plan' },
  { name: 'Tos de las perreras',   last: '08 oct 2025', next: '08 oct 2026', status: 'soon',   mode: 'plan' },
  { name: 'Leishmaniosis',         last: '—',           next: 'Recomendada', status: 'pending',mode: 'plan' },
  { name: 'Giardia (refuerzo)',    last: '02 mar 2026', next: '02 sep 2026', status: 'soon',   mode: 'manual' },
];

const WEIGHT_HISTORY = [
  { date: '02 ene 2026', kg: 30.1 },
  { date: '18 feb 2026', kg: 30.8 },
  { date: '02 mar 2026', kg: 31.4 },
  { date: '11 abr 2026', kg: 32.1 },
  { date: 'Hoy 14:05',   kg: 32.4 },
];

const SURGERIES = [
  {
    date: '02 ene 2026',
    title: 'Extracción de quiste sebáceo',
    surgeon: 'Dra. Mariana Rivas',
    anesthesia: 'Propofol + isoflurano',
    duration: '38 min',
    complications: 'Ninguna',
    fromHosp: 'H-2026-014',
  },
  {
    date: '14 jul 2024',
    title: 'Orquiectomía',
    surgeon: 'Dr. Méndez',
    anesthesia: 'Propofol + isoflurano',
    duration: '52 min',
    complications: 'Hemorragia leve resuelta',
    fromHosp: 'H-2024-091',
  },
];

const FILES_GROUPED = {
  laboratorio: [
    { name: 'Hemograma completo',  date: '11 abr 2026', kind: 'PDF' },
    { name: 'Bioquímica + iones',  date: '11 abr 2026', kind: 'PDF' },
    { name: 'Coprológico seriado', date: '02 mar 2026', kind: 'PDF' },
  ],
  imagen: [
    { name: 'Radiografía tórax LL', date: '11 abr 2026', kind: 'JPG' },
    { name: 'Ecografía abdominal',  date: '02 mar 2026', kind: 'PDF' },
    { name: 'Foto lesión piel',     date: '18 feb 2026', kind: 'JPG' },
  ],
  recetas: [
    { name: 'Receta metronidazol', date: 'Hoy 14:05',  kind: 'PDF' },
    { name: 'Receta omeprazol',    date: 'Hoy 14:05',  kind: 'PDF' },
  ],
  otros: [
    { name: 'Consentimiento cirugía', date: '02 ene 2026', kind: 'PDF' },
    { name: 'Cartilla vacunas',       date: '11 abr 2026', kind: 'PDF' },
    { name: 'Microchip cert.',        date: '12 may 2019', kind: 'PDF' },
  ],
};

function PatientProfile({ goto }) {
  const [tab, setTab] = React.useState('overview');

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{
        padding: '16px', display: 'flex', alignItems: 'center', gap: 12,
        background: T.surface, borderBottom: `1px solid ${T.line}`,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={() => goto('patients')} style={{
          width: 36, height: 36, borderRadius: 10, border: `1px solid ${T.line}`,
          background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}>
          <Icon name="back" size={16} color={T.ink60}/>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: T.ink40, fontFamily: T.mono, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            Historia clínica
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, lineHeight: 1.1 }}>Ficha del paciente</div>
        </div>
        <button style={{
          width: 36, height: 36, borderRadius: 10, border: `1px solid ${T.line}`,
          background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}>
          <Icon name="more" size={16} color={T.ink60}/>
        </button>
      </div>

      {/* Hero */}
      <div style={{ padding: '16px', background: T.surface, borderBottom: `1px solid ${T.line}` }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <PetAvatar species="dog" size={68} urgent/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: -0.6, color: T.ink }}>Thor</h1>
              <span style={{ fontSize: 13, color: T.ink60 }}>Labrador · ♂ · 7 años</span>
            </div>
            <div style={{ fontSize: 12, color: T.ink60, marginTop: 4 }}>
              Julian Smith · +34 612 345 678
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              <Chip tone="urgent" size="xs">Gastroenteritis activa</Chip>
              <Chip tone="ok" size="xs">Vacunas al día</Chip>
              <Chip tone="neutral" size="xs">23 visitas</Chip>
            </div>
          </div>
        </div>

        {/* Vitals strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
          marginTop: 16, padding: '12px 0', borderTop: `1px solid ${T.lineSoft}`,
        }}>
          {[
            { k: 'Peso',  v: '32.4', u: 'kg', trend: '↑ 0.3' },
            { k: 'Edad',  v: '7',    u: 'años' },
            { k: 'Últ.',  v: '2h',   u: '' },
            { k: 'Próx.', v: '12d',  u: '' },
          ].map((m, i) => (
            <div key={i}>
              <div style={{ fontSize: 9, color: T.ink40, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: 0.6 }}>{m.k}</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: T.ink, letterSpacing: -0.3 }}>
                {m.v}<span style={{ fontSize: 11, color: T.ink40, fontWeight: 400, marginLeft: 2 }}>{m.u}</span>
              </div>
              {m.trend && <div style={{ fontSize: 10, color: T.warn, fontFamily: T.mono }}>{m.trend}</div>}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Btn
            variant="primary"
            size="lg"
            full
            icon="plus"
            onClick={() => goto('consultation', { patient: 'Thor' })}
            style={{ flex: 2 }}
          >
            Nueva consulta
          </Btn>
          <Btn
            variant="secondary"
            size="lg"
            icon="bed"
            onClick={() => goto('hospitalization')}
            style={{ flex: 1 }}
          >
            Hospitalizar
          </Btn>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', padding: '0 16px', gap: 18,
        borderBottom: `1px solid ${T.line}`, background: T.surface,
        overflowX: 'auto',
      }}>
        {[
          { id: 'overview',   label: 'Resumen' },
          { id: 'timeline',   label: 'Historia' },
          { id: 'health',     label: 'Salud' },
          { id: 'files',      label: 'Adjuntos' },
          { id: 'owner',      label: 'Propietario' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '12px 0', background: 'none', border: 'none',
            borderBottom: `2px solid ${tab === t.id ? T.ink : 'transparent'}`,
            color: tab === t.id ? T.ink : T.ink40,
            fontSize: 13, fontWeight: 500, fontFamily: T.sans,
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Body */}
      <div style={{ padding: '16px' }}>
        {tab === 'overview' && <OverviewV2 goto={goto}/>}
        {tab === 'timeline' && <TimelineV2/>}
        {tab === 'health'   && <HealthV2/>}
        {tab === 'files'    && <FilesV2/>}
        {tab === 'owner'    && <OwnerV2/>}
      </div>
    </div>
  );
}

// ───────── Resumen ─────────
function OverviewV2({ goto }) {
  return (
    <>
      {/* Última visita destacada */}
      <SectionTitle kicker="Última visita" title="Hoy · 14:05" meta="hace 2h"/>
      <Card pad={14} style={{ marginBottom: 20, borderLeft: `3px solid ${T.urgent}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Gastroenteritis hemorrágica</span>
          <Chip tone="urgent" size="xs">Activo</Chip>
        </div>
        <div style={{ fontSize: 12, color: T.ink60, marginBottom: 10 }}>
          Dra. Rivas · Tratamiento ambulatorio · Control 72h
        </div>
        <Btn size="sm" variant="secondary" full icon="file">Abrir consulta</Btn>
      </Card>

      {/* Próximos */}
      <SectionTitle kicker="Recordatorios" title="Próximos" />
      <Card pad={0} style={{ marginBottom: 20 }}>
        {[
          { icon: 'pill',     label: 'Desparasitación externa', due: 'en 12 días', tone: 'warn' },
          { icon: 'calendar', label: 'Tos de perreras (refuerzo)', due: 'en 5 meses', tone: 'soft' },
          { icon: 'calendar', label: 'Vacuna polivalente anual',   due: 'en 11 meses', tone: 'soft' },
        ].map((r, i, arr) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px',
            borderBottom: i < arr.length - 1 ? `1px solid ${T.lineSoft}` : 'none',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: r.tone === 'warn' ? T.warnSoft : T.surfaceAlt,
              color: r.tone === 'warn' ? T.warn : T.ink80,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name={r.icon} size={16}/>
            </div>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{r.label}</div>
            <span style={{ fontSize: 11, color: T.ink40, fontFamily: T.mono }}>{r.due}</span>
          </div>
        ))}
      </Card>

      {/* Snapshot peso */}
      <SectionTitle kicker="Peso" title="Evolución reciente" meta="5 mediciones"/>
      <Card pad={14} style={{ marginBottom: 20 }}>
        <WeightChart data={WEIGHT_HISTORY} compact/>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.lineSoft}`,
        }}>
          <div>
            <div style={{ fontSize: 9, color: T.ink40, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: 0.6 }}>Actual</div>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }}>32.4 <span style={{ fontSize: 11, color: T.ink40, fontWeight: 400 }}>kg</span></div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: T.ink40, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: 0.6 }}>Δ 4 meses</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: T.warn, fontFamily: T.mono }}>+ 2.3 kg</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: T.ink40, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: 0.6 }}>BCS</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>5/9</div>
          </div>
        </div>
      </Card>

      {/* Resumen vacunas */}
      <SectionTitle kicker="Vacunas" title="Estado del plan" meta="4/5 al día"/>
      <Card pad={0}>
        {VAX_PLAN_DOG.slice(0, 3).map((v, i, arr) => (
          <VaxRow key={i} v={v} last={i === arr.length - 1}/>
        ))}
      </Card>
    </>
  );
}

// ───────── Timeline ─────────
function TimelineV2() {
  const [openId, setOpenId] = React.useState(null);
  const [filter, setFilter] = React.useState('all');

  const allEntries = [
    { id: 'e1', when: 'Hoy 14:05', kind: 'Consulta',    title: 'Gastroenteritis hemorrágica', doc: 'Dra. Rivas',   tone: 'urgent', complete: true },
    { id: 'e2', when: '11 abr',    kind: 'Consulta',    title: 'Chequeo anual',               doc: 'Dra. Rivas',   tone: 'ok',     complete: true },
    { id: 'e3', when: '11 abr',    kind: 'Vacuna',      title: 'Antirrábica + polivalente',   doc: 'Dra. Rivas',   tone: 'neutral',complete: true },
    { id: 'e4', when: '02 mar',    kind: 'Laboratorio', title: 'Hemograma completo',          doc: 'Lab. Central', tone: 'neutral',complete: true },
    { id: 'e5', when: '18 feb',    kind: 'Consulta',    title: 'Dermatitis alérgica',         doc: 'Dr. Méndez',   tone: 'warn',   complete: true },
    { id: 'e6', when: '02 ene',    kind: 'Cirugía',     title: 'Extracción de quiste sebáceo',doc: 'Dra. Rivas',   tone: 'warn',   complete: true },
    { id: 'e7', when: '08 oct 25', kind: 'Vacuna',      title: 'Tos de las perreras',         doc: 'Dra. Rivas',   tone: 'neutral',complete: true },
  ];

  const filters = [
    { id: 'all',         label: 'Todo',     match: () => true },
    { id: 'Consulta',    label: 'Consultas',match: e => e.kind === 'Consulta' },
    { id: 'Vacuna',      label: 'Vacunas',  match: e => e.kind === 'Vacuna' },
    { id: 'Cirugía',     label: 'Cirugías', match: e => e.kind === 'Cirugía' },
    { id: 'Laboratorio', label: 'Lab',      match: e => e.kind === 'Laboratorio' },
  ];
  const matcher = filters.find(f => f.id === filter).match;
  const entries = allEntries.filter(matcher);

  return (
    <>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: '6px 12px', borderRadius: 999,
            border: `1px solid ${filter === f.id ? T.ink : T.line}`,
            background: filter === f.id ? T.ink : T.surface,
            color: filter === f.id ? '#fff' : T.ink80,
            fontSize: 11, fontWeight: 500, cursor: 'pointer',
          }}>{f.label}</button>
        ))}
      </div>

      <div style={{ position: 'relative', paddingLeft: 20 }}>
        <div style={{ position: 'absolute', left: 5, top: 8, bottom: 8, width: 1, background: T.line }}/>
        {entries.map((e) => (
          <div key={e.id} onClick={() => setOpenId(e.id)} style={{
            position: 'relative', marginBottom: 4,
            padding: '6px 8px 8px', marginLeft: -8, marginRight: -8,
            borderRadius: 10, cursor: 'pointer',
            display: 'flex', alignItems: 'flex-start', gap: 0,
          }}>
            <div style={{
              position: 'absolute', left: -12, top: 11,
              width: 11, height: 11, borderRadius: '50%',
              background: T.surface, border: `2px solid ${
                e.tone === 'urgent' ? T.urgent : e.tone === 'warn' ? T.warn : e.tone === 'ok' ? T.ok : T.ink40
              }`,
            }}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: T.ink40, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                {e.when} · {e.kind}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: T.ink, marginTop: 1 }}>{e.title}</div>
              <div style={{ fontSize: 11, color: T.ink60, marginTop: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{e.doc}</span>
                {e.complete && <Chip tone="ok" size="xs">Firmado</Chip>}
              </div>
            </div>
            <Icon name="chevronR" size={14} color={T.ink40} style={{ marginTop: 14 }}/>
          </div>
        ))}
        {entries.length === 0 && (
          <div style={{
            padding: '32px 16px', textAlign: 'center',
            fontSize: 12, color: T.ink40, fontFamily: T.mono,
          }}>
            Sin registros en esta categoría
          </div>
        )}
      </div>
      {openId && <RecordDetailV2 entry={allEntries.find(x => x.id === openId)} onClose={() => setOpenId(null)}/>}
    </>
  );
}

function RecordDetailV2({ entry, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
      zIndex: 100, display: 'flex', alignItems: 'flex-end',
      animation: 'fadeIn 0.2s ease-out',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: T.bg,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        maxHeight: '90%', overflow: 'auto', padding: '10px 16px 32px',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: T.ink20, margin: '4px auto 16px' }}/>
        <div style={{ fontSize: 10, color: T.ink40, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: 1.2 }}>
          {entry.when} · {entry.kind}
        </div>
        <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.4, marginTop: 4 }}>{entry.title}</div>
        <div style={{ fontSize: 12, color: T.ink60, marginTop: 4, marginBottom: 16 }}>{entry.doc}</div>
        <Btn variant="secondary" full icon="file">Abrir registro completo</Btn>
        <Btn variant="ghost" full style={{ marginTop: 8 }} onClick={onClose}>Cerrar</Btn>
      </div>
    </div>
  );
}

// ───────── Salud ─────────
function HealthV2() {
  const [sub, setSub] = React.useState('vax');

  return (
    <>
      <div style={{
        display: 'flex', gap: 0, marginBottom: 16,
        background: T.surfaceAlt, borderRadius: 10, padding: 3,
      }}>
        {[
          { id: 'vax', label: 'Vacunas' },
          { id: 'wt',  label: 'Peso' },
          { id: 'sx',  label: 'Cirugías' },
        ].map(s => (
          <button key={s.id} onClick={() => setSub(s.id)} style={{
            flex: 1, padding: '8px 10px', border: 'none',
            background: sub === s.id ? T.surface : 'transparent',
            color: sub === s.id ? T.ink : T.ink60,
            borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
            boxShadow: sub === s.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
          }}>{s.label}</button>
        ))}
      </div>

      {sub === 'vax' && <VaxBlock/>}
      {sub === 'wt'  && <WeightBlock/>}
      {sub === 'sx'  && <SurgeryBlock/>}
    </>
  );
}

function VaxBlock() {
  const [mode, setMode] = React.useState('plan'); // plan | manual
  const visible = VAX_PLAN_DOG.filter(v => v.mode === mode);

  return (
    <>
      <div style={{
        padding: 12, background: T.aiSoft, borderRadius: 10,
        border: `1px solid ${T.ai}33`,
        fontSize: 12, color: T.ink80, lineHeight: 1.5, marginBottom: 12,
        display: 'flex', gap: 10,
      }}>
        <Icon name="ai" size={16} color={T.ai} style={{ flexShrink: 0, marginTop: 1 }}/>
        <div>
          <strong>Plan sugerido para perro adulto.</strong> Basado en guías WSAVA. Puedes seguir el plan o registrar vacunas manualmente.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button onClick={() => setMode('plan')} style={{
          flex: 1, padding: '8px 10px', borderRadius: 8,
          border: `1px solid ${mode === 'plan' ? T.ink : T.line}`,
          background: mode === 'plan' ? T.ink : T.surface,
          color: mode === 'plan' ? '#fff' : T.ink80,
          fontSize: 12, fontWeight: 500, cursor: 'pointer',
        }}>Plan sugerido</button>
        <button onClick={() => setMode('manual')} style={{
          flex: 1, padding: '8px 10px', borderRadius: 8,
          border: `1px solid ${mode === 'manual' ? T.ink : T.line}`,
          background: mode === 'manual' ? T.ink : T.surface,
          color: mode === 'manual' ? '#fff' : T.ink80,
          fontSize: 12, fontWeight: 500, cursor: 'pointer',
        }}>Manual</button>
      </div>

      <Card pad={0} style={{ marginBottom: 12 }}>
        {visible.map((v, i, arr) => <VaxRow key={i} v={v} last={i === arr.length - 1}/>)}
        {visible.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: T.ink40, fontFamily: T.mono }}>
            Sin vacunas registradas en modo manual
          </div>
        )}
      </Card>

      <Btn variant="secondary" full icon="plus">
        {mode === 'plan' ? 'Aplicar siguiente del plan' : 'Registrar vacuna manual'}
      </Btn>
    </>
  );
}

function VaxRow({ v, last }) {
  const tone = v.status === 'ok' ? 'ok' : v.status === 'soon' ? 'warn' : 'urgent';
  const dotColor = v.status === 'ok' ? T.ok : v.status === 'soon' ? T.warn : T.urgent;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px',
      borderBottom: last ? 'none' : `1px solid ${T.lineSoft}`,
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', background: dotColor,
        flexShrink: 0,
      }}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>{v.name}</div>
        <div style={{ fontSize: 11, color: T.ink60, fontFamily: T.mono, marginTop: 1 }}>
          Última: {v.last} · Próxima: {v.next}
        </div>
      </div>
      <Chip tone={tone} size="xs">
        {v.status === 'ok' ? 'Al día' : v.status === 'soon' ? 'Pronto' : 'Pendiente'}
      </Chip>
    </div>
  );
}

function WeightBlock() {
  return (
    <>
      <Card pad={14} style={{ marginBottom: 12 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginBottom: 14,
        }}>
          <div>
            <div style={{ fontSize: 9, color: T.ink40, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: 0.6 }}>Actual</div>
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.6, fontFamily: T.serif, fontStyle: 'italic' }}>
              32.4 <span style={{ fontSize: 14, color: T.ink40, fontWeight: 400, fontStyle: 'normal', fontFamily: T.sans }}>kg</span>
            </div>
          </div>
          <Chip tone="warn" size="sm">↑ 2.3 kg / 4 meses</Chip>
        </div>
        <WeightChart data={WEIGHT_HISTORY}/>
      </Card>

      <SectionTitle kicker="Mediciones" title="Histórico" meta={`${WEIGHT_HISTORY.length} registros`}/>
      <Card pad={0} style={{ marginBottom: 12 }}>
        {[...WEIGHT_HISTORY].reverse().map((w, i, arr) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '11px 14px',
            borderBottom: i < arr.length - 1 ? `1px solid ${T.lineSoft}` : 'none',
          }}>
            <div style={{ flex: 1, fontSize: 12, color: T.ink60, fontFamily: T.mono }}>{w.date}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: T.mono }}>
              {w.kg} <span style={{ color: T.ink40, fontWeight: 400 }}>kg</span>
            </div>
          </div>
        ))}
      </Card>

      <div style={{
        padding: 10, background: T.surfaceAlt, borderRadius: 8,
        fontSize: 11, color: T.ink60, fontFamily: T.mono, lineHeight: 1.5,
      }}>
        El peso se registra automáticamente con cada consulta nueva.
      </div>
    </>
  );
}

function WeightChart({ data, compact }) {
  const h = compact ? 70 : 130;
  const w = 280;
  const padX = 4, padY = 8;
  const xs = data.map((_, i) => padX + (i * (w - padX * 2)) / (data.length - 1));
  const min = Math.min(...data.map(d => d.kg)) - 0.5;
  const max = Math.max(...data.map(d => d.kg)) + 0.5;
  const ys = data.map(d => padY + (h - padY * 2) * (1 - (d.kg - min) / (max - min)));
  const path = data.map((_, i) => `${i === 0 ? 'M' : 'L'} ${xs[i].toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
  const area = `${path} L ${xs[xs.length - 1].toFixed(1)} ${h - padY} L ${xs[0].toFixed(1)} ${h - padY} Z`;

  return (
    <div style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: h, display: 'block' }}>
        <defs>
          <linearGradient id="wfill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor={T.accent} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={T.accent} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={area} fill="url(#wfill)"/>
        <path d={path} fill="none" stroke={T.accent} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
        {xs.map((x, i) => (
          <circle key={i} cx={x} cy={ys[i]} r={i === xs.length - 1 ? 3 : 2}
            fill={i === xs.length - 1 ? T.accent : T.surface}
            stroke={T.accent} strokeWidth="1.2"/>
        ))}
      </svg>
      {!compact && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 6, fontSize: 9, color: T.ink40, fontFamily: T.mono,
        }}>
          <span>{data[0].date}</span>
          <span>{data[data.length - 1].date}</span>
        </div>
      )}
    </div>
  );
}

function SurgeryBlock() {
  return (
    <>
      <div style={{
        padding: 12, background: T.surfaceAlt, borderRadius: 10,
        fontSize: 12, color: T.ink60, lineHeight: 1.5, marginBottom: 12,
        display: 'flex', gap: 10,
      }}>
        <Icon name="bed" size={16} color={T.ink60} style={{ flexShrink: 0, marginTop: 1 }}/>
        <div>
          Las cirugías se registran al cerrar una hospitalización con procedimiento quirúrgico. Aparecen aquí automáticamente.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {SURGERIES.map((s, i) => (
          <Card key={i} pad={14}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: T.ink40, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  {s.date}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginTop: 2, letterSpacing: -0.2 }}>
                  {s.title}
                </div>
                <div style={{ fontSize: 11, color: T.ink60, marginTop: 2 }}>{s.surgeon}</div>
              </div>
              <Chip tone="neutral" size="xs">{s.fromHosp}</Chip>
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
              padding: '10px 0 0', borderTop: `1px solid ${T.lineSoft}`,
            }}>
              <SxField k="Anestesia" v={s.anesthesia}/>
              <SxField k="Duración"  v={s.duration}/>
              <SxField k="Complic."  v={s.complications} full/>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function SxField({ k, v, full }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : 'auto' }}>
      <div style={{ fontSize: 9, color: T.ink40, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: 0.6 }}>{k}</div>
      <div style={{ fontSize: 12, color: T.ink80, marginTop: 2 }}>{v}</div>
    </div>
  );
}

// ───────── Adjuntos ─────────
function FilesV2() {
  const [cat, setCat] = React.useState('laboratorio');
  const cats = [
    { id: 'laboratorio', label: 'Laboratorio', icon: 'file' },
    { id: 'imagen',      label: 'Imagen',      icon: 'photo' },
    { id: 'recetas',     label: 'Recetas',     icon: 'pill' },
    { id: 'otros',       label: 'Otros',       icon: 'file' },
  ];
  const items = FILES_GROUPED[cat] || [];

  return (
    <>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
        marginBottom: 14,
      }}>
        {cats.map(c => {
          const active = cat === c.id;
          const count = (FILES_GROUPED[c.id] || []).length;
          return (
            <button key={c.id} onClick={() => setCat(c.id)} style={{
              padding: '10px 6px', borderRadius: 10,
              border: `1px solid ${active ? T.ink : T.line}`,
              background: active ? T.ink : T.surface,
              color: active ? '#fff' : T.ink80,
              fontSize: 10, fontWeight: 500, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              <Icon name={c.icon} size={16}/>
              <span>{c.label}</span>
              <span style={{ fontSize: 9, opacity: 0.7, fontFamily: T.mono }}>{count}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {items.map((f, i) => (
          <div key={i}>
            <Placeholder label={cat === 'imagen' ? 'photo' : 'doc'} height={90} rounded={10}/>
            <div style={{ fontSize: 11, fontWeight: 500, marginTop: 6, color: T.ink }}>{f.name}</div>
            <div style={{ fontSize: 10, color: T.ink40, fontFamily: T.mono }}>{f.date} · {f.kind}</div>
          </div>
        ))}
      </div>

      <Btn variant="secondary" full icon="plus">Subir archivo a {cats.find(c => c.id === cat).label.toLowerCase()}</Btn>
    </>
  );
}

// ───────── Propietario ─────────
function OwnerV2() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: T.surfaceAlt, color: T.ink60,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 600, fontFamily: T.serif, fontStyle: 'italic',
          letterSpacing: -0.5,
        }}>JS</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>Julian Smith</div>
          <div style={{ fontSize: 12, color: T.ink60, marginTop: 2 }}>Cliente desde may 2019 · 1 mascota</div>
        </div>
      </div>

      <SectionTitle kicker="Contacto" title="Datos" meta=""/>
      <Card pad={0} style={{ marginBottom: 20 }}>
        {[
          { k: 'Teléfono', v: '+34 612 345 678', icon: 'phone', action: 'Llamar' },
          { k: 'Email',    v: 'julian.smith@email.com', icon: 'mail', action: 'Escribir' },
          { k: 'Dirección',v: 'Calle Mayor 45, 3º B · 28013 Madrid', icon: 'map' },
          { k: 'DNI',      v: '12345678-X', icon: 'file' },
        ].map((row, i, arr) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px',
            borderBottom: i < arr.length - 1 ? `1px solid ${T.lineSoft}` : 'none',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: T.surfaceAlt, color: T.ink80,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name={row.icon} size={14}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, color: T.ink40, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: 0.6 }}>{row.k}</div>
              <div style={{ fontSize: 13, color: T.ink, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.v}</div>
            </div>
            {row.action && (
              <button style={{
                padding: '6px 10px', borderRadius: 8,
                border: `1px solid ${T.line}`, background: T.surface,
                fontSize: 11, fontWeight: 500, color: T.ink80, cursor: 'pointer',
              }}>{row.action}</button>
            )}
          </div>
        ))}
      </Card>

      <SectionTitle kicker="Pagos" title="Historial" meta="Últimos 5"/>
      <Card pad={0} style={{ marginBottom: 12 }}>
        {[
          { date: 'Hoy 14:38', concept: 'Consulta + medicación', amount: '€48.50', status: 'paid' },
          { date: '11 abr',    concept: 'Chequeo + vacunas',     amount: '€95.00', status: 'paid' },
          { date: '02 mar',    concept: 'Hemograma + química',   amount: '€68.00', status: 'paid' },
          { date: '02 ene',    concept: 'Cirugía menor',         amount: '€340.00', status: 'paid' },
          { date: '14 jul 24', concept: 'Orquiectomía',          amount: '€280.00', status: 'paid' },
        ].map((p, i, arr) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px',
            borderBottom: i < arr.length - 1 ? `1px solid ${T.lineSoft}` : 'none',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>{p.concept}</div>
              <div style={{ fontSize: 10, color: T.ink40, fontFamily: T.mono, marginTop: 1 }}>{p.date}</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: T.mono }}>{p.amount}</div>
            <Chip tone="ok" size="xs">Pagado</Chip>
          </div>
        ))}
      </Card>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        padding: '12px 14px', background: T.surfaceAlt, borderRadius: 10, marginBottom: 12,
      }}>
        <span style={{ fontSize: 11, color: T.ink60, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: 0.6 }}>Total acumulado</span>
        <span style={{ fontSize: 16, fontWeight: 600, fontFamily: T.mono, color: T.ink }}>€831.50</span>
      </div>
    </>
  );
}

Object.assign(window, { PatientProfile });
