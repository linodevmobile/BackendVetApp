// Patient picker — entry point for a new consultation.
// Fix from original: searching IS the primary action; "new patient" is a fallback
// inside the same search empty state, not a separate top-level button.

function PatientSearch({ goto }) {
  const [q, setQ] = React.useState('');
  const filtered = PATIENTS.filter(p =>
    !q || p.name.toLowerCase().includes(q.toLowerCase()) ||
    p.owner.toLowerCase().includes(q.toLowerCase()) ||
    p.breed.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div style={{ padding: '16px 16px 100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, paddingTop: 4 }}>
        <button onClick={() => goto('dashboard')} style={{
          width: 36, height: 36, borderRadius: 10, border: `1px solid ${T.line}`,
          background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}>
          <Icon name="back" size={16} color={T.ink60}/>
        </button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: -0.4 }}>
          Nueva consulta
        </h1>
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 14px', background: T.surface,
        border: `1px solid ${q ? T.accent : T.line}`, borderRadius: 12,
        marginBottom: 12,
      }}>
        <Icon name="search" size={18} color={T.ink60}/>
        <input
          autoFocus
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Nombre del paciente, dueño o raza…"
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 15, fontFamily: T.sans, color: T.ink,
          }}
        />
        {q && <Icon name="close" size={16} color={T.ink40}/>}
      </div>

      {/* Quick filters — clinical context, not bureaucracy */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, overflowX: 'auto' }}>
        {['Todos', 'Hoy en agenda', 'Hospitalizados', 'Favoritos', 'Recientes'].map((f, i) => (
          <button key={i} style={{
            padding: '6px 12px', borderRadius: 999,
            border: `1px solid ${i === 0 ? T.ink : T.line}`,
            background: i === 0 ? T.ink : T.surface,
            color: i === 0 ? '#fff' : T.ink80,
            fontSize: 12, fontWeight: 500, fontFamily: T.sans,
            whiteSpace: 'nowrap', cursor: 'pointer',
          }}>{f}</button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <Card pad={24} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: T.ink60, marginBottom: 4 }}>
            Sin coincidencias para "{q}"
          </div>
          <div style={{ fontSize: 12, color: T.ink40, marginBottom: 16 }}>
            ¿Es un paciente nuevo?
          </div>
          <Btn variant="primary" icon="plus" onClick={() => goto('newpatient', { prefill: q })}>
            Crear paciente "{q}"
          </Btn>
        </Card>
      ) : (
        <>
          <div style={{
            fontSize: 10, color: T.ink40, fontFamily: T.mono,
            textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
          }}>
            {filtered.length} pacientes
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((p, i) => (
              <Card key={i} pad={12} onClick={() => goto('patient', { patient: p.name })}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <PetAvatar species={p.species} size={44} urgent={p.alert}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{p.name}</span>
                      {p.alert && <Chip tone="urgent" size="xs">Alerta</Chip>}
                      {p.hospitalized && <Chip tone="warn" size="xs">Internado</Chip>}
                    </div>
                    <div style={{ fontSize: 12, color: T.ink60 }}>
                      {p.breed} · {p.age} · {p.owner}
                    </div>
                    <div style={{ fontSize: 11, color: T.ink40, marginTop: 2 }}>
                      Última visita: {p.last}
                    </div>
                  </div>
                  <Icon name="chevronR" size={14} color={T.ink40}/>
                </div>
              </Card>
            ))}
          </div>

          <button onClick={() => goto('newpatient')} style={{
            marginTop: 16, width: '100%',
            padding: '14px', borderRadius: 12,
            border: `1px dashed ${T.ink20}`,
            background: 'transparent', color: T.ink60,
            fontSize: 13, fontWeight: 500, fontFamily: T.sans,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: 'pointer',
          }}>
            <Icon name="plus" size={14}/> Registrar paciente nuevo
          </button>
        </>
      )}
    </div>
  );
}

const PATIENTS = [
  { name: 'Luna Martínez',  species: 'dog',    breed: 'Golden Retriever', age: '4 años',   owner: 'Ana Martínez',  last: 'Hace 8 días',  hospitalized: false },
  { name: 'Thor Smith',     species: 'dog',    breed: 'Labrador',         age: '7 años',   owner: 'Julian Smith',  last: 'Hace 2 horas', alert: true },
  { name: 'Mochi Herrera',  species: 'cat',    breed: 'Maine Coon',       age: '2 años',   owner: 'Sofía Herrera', last: 'Hace 3 meses' },
  { name: 'Kira Vargas',    species: 'dog',    breed: 'Pastor Alemán',    age: '9 años',   owner: 'Diego Vargas',  last: 'Hoy',          hospitalized: true, alert: true },
  { name: 'Simón López',    species: 'cat',    breed: 'Común Europeo',    age: '3 años',   owner: 'Paula López',   last: 'Ayer',         hospitalized: true },
  { name: 'Milo Ortiz',     species: 'rabbit', breed: 'Holland Lop',      age: '1 año',    owner: 'Lucía Ortiz',   last: 'Hace 6 meses' },
  { name: 'Bruno Valdés',   species: 'dog',    breed: 'Bulldog Francés',  age: '5 años',   owner: 'Carlos Valdés', last: 'Hace 2 semanas' },
  { name: 'Max Mendoza',    species: 'dog',    breed: 'Beagle',           age: '6 años',   owner: 'Carlos Mendoza',last: 'Ayer' },
];

Object.assign(window, { PatientSearch, PATIENTS });
