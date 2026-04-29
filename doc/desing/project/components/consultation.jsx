// Consultation — versión consolidada (consolidada abr 2026)
//  - 13 secciones
//  - Examen físico estructurado (dropdowns, slider, inputs)
//  - Audio se activa con icono de mic en cada campo, no por sección colapsada

const SECTIONS_V2 = [
  { id: 'reason',         n: '01', title: 'Motivo de consulta',         hint: 'Razón principal de la visita' },
  { id: 'anamnesis',      n: '02', title: 'Anamnesis',                  hint: 'Historia y antecedentes' },
  { id: 'identification', n: '03', title: 'Identificación',             hint: 'Paciente y propietario' },
  { id: 'food',           n: '04', title: 'Tipo de alimento',           hint: 'Régimen alimentario actual' },
  { id: 'vitals',         n: '05', title: 'Signos vitales',             hint: 'Temp · FC · FR · Peso' },
  { id: 'exam',           n: '06', title: 'Examen físico',              hint: 'Hallazgos estructurados' },
  { id: 'problems',       n: '07', title: 'Lista de problemas',         hint: 'Hallazgos clínicos' },
  { id: 'labs',           n: '08', title: 'Exámenes complementarios',   hint: 'Laboratorio, imagen' },
  { id: 'diagnosis',      n: '09', title: 'Diagnóstico clínico',        hint: 'Presuntivo y definitivo' },
  { id: 'recipe',         n: '10', title: 'Receta',                     hint: 'Medicación y posología' },
  { id: 'treatment',      n: '11', title: 'Tratamiento',                hint: 'Modalidad de manejo' },
  { id: 'prognosis',      n: '12', title: 'Pronóstico y evolución',     hint: 'Expectativa clínica' },
  { id: 'signature',      n: '13', title: 'Observaciones y firma',      hint: 'Firma del profesional' },
];

const MUCOSA_OPTS = ['Rosadas', 'Pálidas', 'Ictéricas', 'Cianóticas', 'Congestivas'];
const BCS_OPTS = ['1/9', '2/9', '3/9', '4/9', '5/9', '6/9', '7/9', '8/9', '9/9'];
const ACTITUDE_OPTS = ['Amigable', 'Dócil', 'Temeroso', 'Indiferente', 'Agresivo'];
const PULSE_OPTS = ['Débil', 'Normal', 'Fuerte', 'Filiforme', 'Ausente'];
const FOOD_OPTS = ['Concentrado', 'BARF', 'Casero', 'Mixto', 'Otro'];
const TREATMENT_OPTS = ['Ambulatorio', 'Hospitalario'];

function Consultation({ goto }) {
  const [recording, setRecording] = React.useState(null); // field id being recorded
  const [activeSection, setActiveSection] = React.useState('reason');
  const [collapsed, setCollapsed] = React.useState({});
  const [showChecklist, setShowChecklist] = React.useState(false);
  const [showHospitalize, setShowHospitalize] = React.useState(false);
  const [showPause, setShowPause] = React.useState(false);

  const [values, setValues] = React.useState({
    reason: 'Vómitos intermitentes y heces blandas desde hace 24h',
    anamnesis: '',
    identification: 'Thor · Golden Retriever · M · 4a · 28.4 kg',
    food: 'Concentrado',
    temp: '38.7', fc: '110', fr: '28', weight: '28.4',
    mucosa: 'Rosadas', dehydration: 4, bcs: '5/9',
    attitudeOwner: 'Dócil', attitudeVet: 'Amigable',
    affectedSystems: '', tllc: '2', trcp: '1.5', pulse: 'Normal',
    examNotes: '',
    problems: '', labs: '', diagnosis: '',
    recipe: '', treatment: 'Ambulatorio',
    prognosis: '', signature: '',
  });

  const isFilled = (id) => {
    if (id === 'vitals') return values.temp && values.fc && values.fr && values.weight;
    if (id === 'exam')   return values.mucosa && values.bcs && values.pulse;
    return !!(values[id] && String(values[id]).trim().length > 0);
  };

  const completed = SECTIONS_V2.filter(s => isFilled(s.id)).length;
  const pct = Math.round((completed / SECTIONS_V2.length) * 100);

  const toggle = (id) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
  const jump = (id) => {
    setCollapsed(c => ({ ...c, [id]: false }));
    setActiveSection(id);
    setShowChecklist(false);
    setTimeout(() => {
      const el = document.getElementById(`sec-v2-${id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <div style={{ paddingBottom: 140 }}>
      <ConsultHeader2 goto={goto} pct={pct} completed={completed} total={SECTIONS_V2.length} onOpenChecklist={() => setShowChecklist(true)} onPause={() => setShowPause(true)}/>

      <div style={{ padding: '12px 16px 24px' }}>
        {SECTIONS_V2.map((s) => (
          <Section2
            key={s.id}
            section={s}
            isOpen={!collapsed[s.id]}
            onToggle={() => toggle(s.id)}
            filled={isFilled(s.id)}
            onFocus={() => setActiveSection(s.id)}
          >
            <SectionBody2 id={s.id} values={values} setValues={setValues} recording={recording} setRecording={setRecording} goto={goto}/>
          </Section2>
        ))}
      </div>

      {/* Sticky firma */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 78, padding: '10px 16px',
        background: `linear-gradient(to top, ${T.bg} 70%, ${T.bg}00)`, zIndex: 40,
      }}>
        <Btn variant={completed === SECTIONS_V2.length ? 'primary' : 'secondary'} size="lg" full
             icon={completed === SECTIONS_V2.length ? 'check' : 'lock'}
             onClick={() => completed === SECTIONS_V2.length && goto('patient')}>
          {completed === SECTIONS_V2.length ? 'Firmar y cerrar' : `Faltan ${SECTIONS_V2.length - completed} secciones`}
        </Btn>
      </div>

      {showChecklist && (
        <ComplianceSheet2 sections={SECTIONS_V2} isFilled={isFilled} onJump={jump} onClose={() => setShowChecklist(false)}/>
      )}
      {showPause && (
        <PauseSheet patient="Thor" completed={completed} total={SECTIONS_V2.length}
          onClose={() => setShowPause(false)}
          onConfirm={() => { setShowPause(false); goto('dashboard'); }}/>
      )}
    </div>
  );
}

function ConsultHeader2({ goto, pct, completed, total, onOpenChecklist, onPause }) {
  return (
    <div style={{
      background: T.surface, borderBottom: `1px solid ${T.line}`,
      padding: '14px 16px 12px', position: 'sticky', top: 0, zIndex: 30,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <button onClick={() => goto('patient')} style={{
          width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.line}`,
          background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}><Icon name="back" size={14} color={T.ink60}/></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: T.ink40, fontFamily: T.mono, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            Consulta
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, lineHeight: 1.1 }}>Thor · Golden Retriever</div>
        </div>
        <button onClick={onOpenChecklist} style={{
          padding: '5px 9px', borderRadius: 999, border: `1px solid ${T.line}`, background: T.surface,
          display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
          fontSize: 11, fontWeight: 600, color: T.ink80, fontFamily: T.sans,
        }}>
          <span style={{ fontFamily: T.mono }}>{completed}/{total}</span>
          <Icon name="chevronD" size={12} color={T.ink40}/>
        </button>
        <button onClick={onPause} title="Pausar consulta" style={{
          width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.warn}55`,
          background: `${T.warn}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <Icon name="pause" size={13} color={T.warn}/>
        </button>
      </div>
      <div style={{ height: 4, background: T.lineSoft, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: T.accent, transition: 'width 0.3s' }}/>
      </div>
    </div>
  );
}

function Section2({ section, isOpen, onToggle, filled, onFocus, children }) {
  return (
    <div id={`sec-v2-${section.id}`} style={{
      background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12,
      marginBottom: 8, overflow: 'hidden',
    }}>
      <button onClick={onToggle} style={{
        width: '100%', padding: '12px 14px', border: 'none', background: 'transparent',
        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left',
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: filled ? T.accent : T.surfaceAlt,
          color: filled ? '#fff' : T.ink40,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {filled ? <Icon name="check" size={13}/> : <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700 }}>{section.n}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{section.title}</div>
          <div style={{ fontSize: 11, color: T.ink40 }}>{section.hint}</div>
        </div>
        <Icon name={isOpen ? 'chevronD' : 'chevronR'} size={14} color={T.ink40}/>
      </button>
      {isOpen && (
        <div onFocus={onFocus} style={{ padding: '0 14px 14px' }}>{children}</div>
      )}
    </div>
  );
}

function MicBtn({ active, onClick }) {
  return (
    <button onClick={onClick} title="Dictar" style={{
      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
      border: `1px solid ${active ? T.urgent : T.line}`,
      background: active ? `${T.urgent}10` : T.surface,
      color: active ? T.urgent : T.ink60,
      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      animation: active ? 'pulse 1.2s ease-in-out infinite' : 'none',
    }}>
      <Icon name="mic" size={14}/>
    </button>
  );
}

function FieldWithMic({ label, value, onChange, recording, setRecording, fieldId, multiline = true, rows = 3 }) {
  const isRec = recording === fieldId;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ flex: 1, fontSize: 11, color: T.ink60, fontWeight: 500 }}>{label}</div>
        <MicBtn active={isRec} onClick={() => setRecording(isRec ? null : fieldId)}/>
      </div>
      <TextInput multiline={multiline} rows={rows} value={value} onChange={onChange} aiActive={isRec}/>
    </div>
  );
}

function Dropdown({ label, value, options, onChange }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ marginBottom: 10, position: 'relative' }}>
      {label && <div style={{ fontSize: 11, color: T.ink60, fontWeight: 500, marginBottom: 6 }}>{label}</div>}
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', padding: '10px 12px', borderRadius: 8,
        border: `1px solid ${open ? T.accent : T.line}`, background: T.surface,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', fontSize: 13, fontWeight: 500, color: T.ink, fontFamily: T.sans,
      }}>
        <span>{value}</span>
        <Icon name="chevronD" size={13} color={T.ink40}/>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 20,
          background: T.surface, border: `1px solid ${T.line}`, borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)', overflow: 'hidden', maxHeight: 240, overflowY: 'auto',
        }}>
          {options.map(o => (
            <button key={o} onClick={() => { onChange(o); setOpen(false); }} style={{
              width: '100%', padding: '10px 12px', border: 'none', textAlign: 'left',
              background: o === value ? T.surfaceAlt : 'transparent',
              cursor: 'pointer', fontSize: 13, color: T.ink, fontFamily: T.sans,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {o === value && <Icon name="check" size={12} color={T.accent}/>}
              <span style={{ marginLeft: o === value ? 0 : 20 }}>{o}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniInput({ label, value, onChange, unit, width }) {
  return (
    <div style={{ flex: width || 1 }}>
      <div style={{ fontSize: 10, color: T.ink40, fontFamily: T.mono, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 3,
        padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.line}`, background: T.surface,
      }}>
        <input value={value} onChange={e => onChange(e.target.value)} style={{
          width: '100%', border: 'none', outline: 'none', background: 'transparent',
          fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: T.sans, padding: 0,
        }}/>
        {unit && <span style={{ fontSize: 9, color: T.ink40, fontFamily: T.mono }}>{unit}</span>}
      </div>
    </div>
  );
}

function DehydrationSlider({ value, onChange }) {
  const pct = (value / 12) * 100;
  const color = value < 5 ? T.ok : value < 8 ? T.warn : T.urgent;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: T.ink60, fontWeight: 500 }}>Deshidratación</span>
        <span style={{ fontSize: 14, fontWeight: 700, color, fontFamily: T.mono }}>{value}%</span>
      </div>
      <div style={{ position: 'relative', height: 28, padding: '12px 0' }}>
        <div style={{ height: 4, background: T.lineSoft, borderRadius: 2, position: 'relative' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }}/>
        </div>
        <input type="range" min="0" max="12" step="0.5" value={value} onChange={e => onChange(parseFloat(e.target.value))}
          style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer' }}/>
        <div style={{
          position: 'absolute', top: 6, left: `calc(${pct}% - 8px)`,
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          border: `2px solid ${color}`, pointerEvents: 'none',
        }}/>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: T.ink40, fontFamily: T.mono }}>
        <span>0%</span><span>5%</span><span>8%</span><span>12%</span>
      </div>
    </div>
  );
}

function SectionBody2({ id, values, setValues, recording, setRecording, goto }) {
  const update = (k, v) => setValues(s => ({ ...s, [k]: v }));

  if (id === 'reason') {
    return <FieldWithMic label="Motivo principal" value={values.reason} onChange={v => update('reason', v)}
      recording={recording} setRecording={setRecording} fieldId="reason" rows={2}/>;
  }

  if (id === 'anamnesis') {
    return <FieldWithMic label="Historia clínica y antecedentes" value={values.anamnesis} onChange={v => update('anamnesis', v)}
      recording={recording} setRecording={setRecording} fieldId="anamnesis" rows={4}/>;
  }

  if (id === 'identification') {
    return (
      <>
        <div style={{
          padding: 10, background: T.accentSoft, borderRadius: 8,
          fontSize: 12, color: T.accentInk, marginBottom: 10,
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <Icon name="check" size={14} color={T.accent} style={{ marginTop: 2 }}/>
          <div><b>Prellenado desde ficha.</b> Sincronizado con el registro permanente.</div>
        </div>
        <TextInput multiline rows={2} value={values.identification} onChange={v => update('identification', v)}/>
      </>
    );
  }

  if (id === 'food') {
    return <Dropdown label="Tipo de alimento" value={values.food} options={FOOD_OPTS} onChange={v => update('food', v)}/>;
  }

  if (id === 'vitals') {
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        <MiniInput label="Temp" unit="°C"  value={values.temp}   onChange={v => update('temp', v)}/>
        <MiniInput label="FC"   unit="ppm" value={values.fc}     onChange={v => update('fc', v)}/>
        <MiniInput label="FR"   unit="rpm" value={values.fr}     onChange={v => update('fr', v)}/>
        <MiniInput label="Peso" unit="kg"  value={values.weight} onChange={v => update('weight', v)}/>
      </div>
    );
  }

  if (id === 'exam') {
    return (
      <>
        <Dropdown label="Mucosas" value={values.mucosa} options={MUCOSA_OPTS} onChange={v => update('mucosa', v)}/>
        <DehydrationSlider value={values.dehydration} onChange={v => update('dehydration', v)}/>
        <Dropdown label="Condición corporal (WSAVA)" value={values.bcs} options={BCS_OPTS} onChange={v => update('bcs', v)}/>
        <Dropdown label="Actitud con el propietario" value={values.attitudeOwner} options={ACTITUDE_OPTS} onChange={v => update('attitudeOwner', v)}/>
        <Dropdown label="Actitud con el doctor" value={values.attitudeVet} options={ACTITUDE_OPTS} onChange={v => update('attitudeVet', v)}/>
        <FieldWithMic label="Sistemas afectados" value={values.affectedSystems} onChange={v => update('affectedSystems', v)}
          recording={recording} setRecording={setRecording} fieldId="affectedSystems" rows={2}/>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <MiniInput label="TLLC" unit="seg" value={values.tllc} onChange={v => update('tllc', v)}/>
          <MiniInput label="TRCP" unit="seg" value={values.trcp} onChange={v => update('trcp', v)}/>
        </div>
        <Dropdown label="Pulso" value={values.pulse} options={PULSE_OPTS} onChange={v => update('pulse', v)}/>
      </>
    );
  }

  if (id === 'problems') {
    return <FieldWithMic label="Problemas detectados" value={values.problems} onChange={v => update('problems', v)}
      recording={recording} setRecording={setRecording} fieldId="problems" rows={3}/>;
  }

  if (id === 'labs') {
    return (
      <>
        <FieldWithMic label="Exámenes solicitados / resultados" value={values.labs} onChange={v => update('labs', v)}
          recording={recording} setRecording={setRecording} fieldId="labs" rows={2}/>
        <button style={{
          marginTop: 4, width: '100%', padding: 10, borderRadius: 8,
          border: `1px dashed ${T.ink20}`, background: 'transparent',
          color: T.ink60, fontSize: 12, fontFamily: T.sans, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Icon name="plus" size={12}/> Adjuntar resultado (PDF, imagen)
        </button>
      </>
    );
  }

  if (id === 'diagnosis') {
    return <FieldWithMic label="Diagnóstico presuntivo y definitivo" value={values.diagnosis} onChange={v => update('diagnosis', v)}
      recording={recording} setRecording={setRecording} fieldId="diagnosis" rows={3}/>;
  }

  if (id === 'recipe') {
    return (
      <>
        <FieldWithMic label="Medicación, posología, duración" value={values.recipe} onChange={v => update('recipe', v)}
          recording={recording} setRecording={setRecording} fieldId="recipe" rows={3}/>
        {values.recipe && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 10, color: T.ink40, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
              Medicación detectada ✦
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <MedRowV2 name="Metronidazol" dose="15 mg/kg" freq="c/12h" dur="7 días"/>
              <MedRowV2 name="Omeprazol"    dose="1 mg/kg"  freq="c/24h" dur="10 días"/>
            </div>
          </div>
        )}
      </>
    );
  }

  if (id === 'treatment') {
    return <Dropdown label="Modalidad de tratamiento" value={values.treatment} options={TREATMENT_OPTS} onChange={v => update('treatment', v)}/>;
  }

  if (id === 'prognosis') {
    return <FieldWithMic label="Pronóstico esperado y evolución" value={values.prognosis} onChange={v => update('prognosis', v)}
      recording={recording} setRecording={setRecording} fieldId="prognosis" rows={3}/>;
  }

  if (id === 'signature') {
    return (
      <>
        <FieldWithMic label="Observaciones e indicaciones" value={values.signature} onChange={v => update('signature', v)}
          recording={recording} setRecording={setRecording} fieldId="signature" rows={2}/>
        <div style={{
          marginTop: 6, padding: 12, background: T.surfaceAlt,
          border: `1px dashed ${T.ink20}`, borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: T.surface,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${T.line}`,
          }}><Icon name="edit" size={18} color={T.ink60}/></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Dra. Mariana Rivas</div>
            <div style={{ fontSize: 10, color: T.ink40, fontFamily: T.mono }}>MV · Reg. 12.845</div>
          </div>
          <Btn size="sm" variant="secondary">Firmar</Btn>
        </div>
      </>
    );
  }

  return null;
}

function MedRowV2({ name, dose, freq, dur }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px', background: T.aiSoft,
      borderRadius: 8, border: `1px solid ${T.ai}33`,
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: 6, background: '#fff', color: T.ai,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon name="pill" size={14}/></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{name}</div>
        <div style={{ fontSize: 10, color: T.ink60, fontFamily: T.mono }}>{dose} · {freq} · {dur}</div>
      </div>
      <Icon name="edit" size={14} color={T.ink40}/>
    </div>
  );
}

function ComplianceSheet2({ sections, isFilled, onJump, onClose }) {
  const completed = sections.filter(s => isFilled(s.id)).length;
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)',
      zIndex: 100, display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: T.bg,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: '10px 16px 32px', maxHeight: '82%', overflow: 'auto',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: T.ink20, margin: '4px auto 14px' }}/>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: T.ink40, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 2 }}>Progreso</div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }}>Secciones</h3>
            <div style={{ fontSize: 11, color: T.ink60, marginTop: 2 }}>Tap en cualquiera para saltar.</div>
          </div>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: completed === sections.length ? T.accent : T.surface,
            border: `2px solid ${T.accent}`,
            color: completed === sections.length ? '#fff' : T.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: T.mono, fontSize: 13, fontWeight: 700,
          }}>{completed}/{sections.length}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sections.map(s => {
            const ok = isFilled(s.id);
            return (
              <div key={s.id} onClick={() => onJump(s.id)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                background: T.surface, borderRadius: 10, border: `1px solid ${T.line}`, cursor: 'pointer',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: ok ? T.accent : T.surfaceAlt, color: ok ? '#fff' : T.ink40,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {ok ? <Icon name="check" size={14}/> : <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 600 }}>{s.n}</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>{s.title}</div>
                  <div style={{ fontSize: 10, color: T.ink40, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    {ok ? 'Completo' : 'Pendiente'}
                  </div>
                </div>
                <Icon name="chevronR" size={14} color={T.ink40}/>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Consultation });
