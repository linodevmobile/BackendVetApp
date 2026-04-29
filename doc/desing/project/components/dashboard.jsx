// Dashboard — replaces the vanity-metric home with what a vet actually needs at 9am:
// today's schedule, active hospitalizations, quick capture entry.

function Dashboard({ goto }) {
  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div style={{ padding: '16px 16px 100px' }}>
      {/* Header — quiet, no decorative welcome card */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, paddingTop: 4 }}>
        <div>
          <div style={{ fontSize: 11, color: T.ink40, fontFamily: T.mono, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>
            Sábado · 19 abr
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: -0.6, color: T.ink }}>
            {greet}, Dra. Rivas
          </h1>
        </div>
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: T.accentSoft, color: T.accentInk,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 600, fontSize: 13, fontFamily: T.sans,
        }}>MR</div>
      </div>

      {/* Primary action — starts from patient, not from a blank form */}
      <div onClick={() => goto('patients')} style={{
        background: T.ink, color: '#fff',
        borderRadius: T.r3, padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 18, cursor: 'pointer',
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: 'rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="search" size={18} color="#fff"/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Buscar paciente o iniciar consulta</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>
            Luna · Thor · Max · + nuevo
          </div>
        </div>
        <Icon name="arrowR" size={16} color="rgba(255,255,255,0.5)"/>
      </div>

      {/* Today's schedule */}
      <SectionTitle
        kicker="Agenda"
        title="Hoy"
        meta="6 consultas · 2 hospitalizados"
        trailing={<span style={{ fontSize: 12, color: T.accent, fontWeight: 500 }}>Ver todo</span>}
      />
      <Card pad={0} style={{ marginBottom: 22 }}>
        {SCHEDULE.map((row, i) => (
          <div key={i} onClick={() => goto('consultation', { patient: row.patient })} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px',
            borderBottom: i < SCHEDULE.length - 1 ? `1px solid ${T.lineSoft}` : 'none',
            cursor: 'pointer',
          }}>
            <div style={{ width: 44, textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: row.status === 'now' ? T.accent : T.ink, fontFamily: T.mono }}>
                {row.time}
              </div>
              {row.status === 'now' && <div style={{
                fontSize: 9, color: T.accent, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 1,
              }}>Ahora</div>}
            </div>
            <PetAvatar species={row.species} size={34} urgent={row.urgent}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{row.patient}</span>
                {row.urgent && <Chip tone="urgent" size="xs">Urg</Chip>}
              </div>
              <div style={{ fontSize: 12, color: T.ink60, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.reason}
              </div>
            </div>
            <Icon name="chevronR" size={14} color={T.ink40}/>
          </div>
        ))}
      </Card>

      {/* Hospitalization strip — oculto temporalmente (feature a futuro) */}
      {false && (
        <>
          <SectionTitle kicker="Internación" title="Pacientes en observación" meta="2 activos"/>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
            {HOSPITALIZED.map((h, i) => (
              <Card key={i} pad={12} style={{ borderColor: h.critical ? '#E8C0B3' : T.line }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <PetAvatar species={h.species} size={28} urgent={h.critical}/>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{h.name}</div>
                    <div style={{ fontSize: 10, color: T.ink40, fontFamily: T.mono, textTransform: 'uppercase' }}>Día {h.day}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: T.ink60, lineHeight: 1.4, marginBottom: 8, minHeight: 30 }}>{h.note}</div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* En progreso — consultas pausadas esperando resultados */}
      <SectionTitle
        kicker="En progreso"
        title="Consultas abiertas"
        meta={`${IN_PROGRESS.length} esperando`}
      />
      <Card pad={0} style={{ marginBottom: 22 }}>
        {IN_PROGRESS.map((c, i) => (
          <div key={i} onClick={() => goto('consultation', { patient: c.name, resume: true })} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px',
            borderBottom: i < IN_PROGRESS.length - 1 ? `1px solid ${T.lineSoft}` : 'none',
            cursor: 'pointer', background: c.stale ? `${T.urgent}06` : 'transparent',
          }}>
            <PetAvatar species={c.species} size={34}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{c.name}</span>
                {c.stale && <Chip tone="urgent" size="xs">+2h</Chip>}
              </div>
              <div style={{ fontSize: 11, color: T.ink60, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: T.mono, color: c.stale ? T.urgent : T.warn }}>⏱ {c.waiting}</span>
                <span>· {c.status}</span>
              </div>
              <div style={{
                marginTop: 6, height: 3, background: T.lineSoft, borderRadius: 2, overflow: 'hidden',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <div style={{ width: `${(c.done/10)*100}%`, height: '100%', background: T.accent }}/>
              </div>
              <div style={{ fontSize: 10, color: T.ink40, fontFamily: T.mono, marginTop: 3 }}>{c.done}/10 secciones</div>
            </div>
            <Icon name="arrowR" size={14} color={T.ink40}/>
          </div>
        ))}
      </Card>

      {/* Recent work — compressed */}
      <SectionTitle kicker="Registros" title="Recientes"/>
      <Card pad={0}>
        {RECENT.map((r, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px',
            borderBottom: i < RECENT.length - 1 ? `1px solid ${T.lineSoft}` : 'none',
          }}>
            <PetAvatar species={r.species} size={30}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{r.name}</div>
              <div style={{ fontSize: 11, color: T.ink40, marginTop: 1 }}>{r.summary}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: T.ink40, fontFamily: T.mono, textTransform: 'uppercase' }}>{r.when}</div>
              <Chip tone={r.type === 'emergency' ? 'urgent' : r.type === 'surgery' ? 'warn' : 'neutral'} size="xs">
                {r.label}
              </Chip>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

const SCHEDULE = [
  { time: '15:30', status: 'now',  species: 'dog',    patient: 'Luna Martínez',     reason: 'Control post-quirúrgico · 8 días' },
  { time: '16:00',                 species: 'cat',    patient: 'Mochi Herrera',     reason: 'Vacunación triple felina',        urgent: false },
  { time: '16:30',                 species: 'dog',    patient: 'Thor Smith',        reason: 'Gastroenteritis — seguimiento',   urgent: true },
  { time: '17:00',                 species: 'rabbit', patient: 'Milo Ortiz',        reason: 'Chequeo general',                  },
  { time: '17:45',                 species: 'dog',    patient: 'Bruno Valdés',      reason: 'Dermatitis recurrente',             },
];

const HOSPITALIZED = [
  { name: 'Kira', species: 'dog', day: 2, critical: true,
    note: 'Pancreatitis aguda · IV ringer 50ml/h',
    tasks: [true, true, true, false, false, false] },
  { name: 'Simón', species: 'cat', day: 4, critical: false,
    note: 'Post-op castración · evoluciona bien',
    tasks: [true, true, true, true, true, false] },
];

const IN_PROGRESS = [
  { name: 'Thor Smith',    species: 'dog',    waiting: '1h 47m', stale: true,  status: 'Esperando hemograma',       done: 6 },
  { name: 'Michi Rueda',   species: 'cat',    waiting: '42m',    stale: false, status: 'Esperando radiografía',     done: 7 },
  { name: 'Coco Pérez',    species: 'bird',   waiting: '18m',    stale: false, status: 'Procedimiento en curso',    done: 4 },
];

const RECENT = [
  { name: 'Max',    species: 'dog',    summary: 'Chequeo de rutina · vacuna al día', when: 'Ayer 17:20', type: 'routine',   label: 'Rutina' },
  { name: 'Bella',  species: 'cat',    summary: 'Control post-esterilización',        when: 'Ayer 14:05', type: 'surgery',   label: 'Cirugía' },
  { name: 'Coco',   species: 'bird',   summary: 'Sospecha de psitacosis — cultivo',   when: '18 abr',     type: 'emergency', label: 'Urgencia' },
  { name: 'Rocky',  species: 'dog',    summary: 'Desparasitación + antipulgas',       when: '18 abr',     type: 'routine',   label: 'Rutina' },
];

Object.assign(window, { Dashboard });
