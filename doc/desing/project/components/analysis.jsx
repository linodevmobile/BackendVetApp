// Analysis document — the left panel of the canvas.
// UX audit + proposed redesign rationale.

function Analysis() {
  return (
    <div style={{
      padding: '48px 56px', maxWidth: 720, margin: '0 auto',
      fontFamily: T.sans, color: T.ink, lineHeight: 1.55,
    }}>
      <div style={{
        fontSize: 10, color: T.ink40, fontFamily: T.mono,
        textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 10,
      }}>Análisis UX · 19 abr 2026</div>

      <h1 style={{
        fontFamily: T.serif, fontSize: 42, fontWeight: 500, letterSpacing: -1,
        margin: '0 0 6px', lineHeight: 1.05,
      }}>
        <span style={{ fontStyle: 'italic' }}>VetApp</span> — rediseño de CMS clínico veterinario.
      </h1>
      <p style={{ fontSize: 15, color: T.ink60, margin: '0 0 40px', maxWidth: 560 }}>
        La app actual trata la consulta como un formulario largo. La realidad clínica es lo opuesto:
        tiempo escaso, manos ocupadas, flujo no-lineal. Este documento detalla el diagnóstico del producto
        y propone un rediseño centrado en <em>velocidad, no en completitud</em>.
      </p>

      {/* Diagnosis */}
      <H2 kicker="1 · Diagnóstico">Qué falla hoy</H2>

      <Problem
        num="01"
        title="Wizard lineal de 10 pasos para una consulta"
        body="Comvezcol (Res. 8430) exige que toda historia clínica contenga los 10 puntos: Identificación, Anamnesis, Examen físico, Lista de problemas, Abordaje diagnóstico, Exámenes complementarios, Diagnóstico, Plan, Pronóstico y Firma. El contenido es obligatorio — no se puede recortar. Pero la app convierte ese requisito legal en un wizard lineal paso-a-paso, forzando avanzar en orden, sin saltar ni editar secciones ya pasadas. Una consulta real no es lineal: el vet ve un hallazgo en el examen y necesita volver a anamnesis para re-preguntar."
        impact="El requisito es qué debe haber, no en qué orden capturarlo. Forzar la secuencia es decisión de diseño, no de regulación."
      />

      <Problem
        num="02"
        title="La IA es una pantalla, no una herramienta"
        body="El micrófono ocupa pantallas completas ('Paso 3 — Grabando audio…'). Grabar obliga a pausar el flujo y luego editar. La IA debería ser invisible cuando no se usa y estar a un tap cuando sí. Además, la IA debe poder dictarse para cualquiera de los 10 puntos obligatorios, no solo uno o dos."
        impact="El vet deja de dictar y escribe a mano porque el modo 'grabación' se siente como perder el control."
      />

      <Problem
        num="03"
        title="Dashboard decorativo, sin señal clínica"
        body="La home muestra '24 pacientes hoy', '02 emergencias', 'Próximo: 15:30'. Son métricas de vanidad, no herramientas. Falta lo único que un vet abre la app para ver: ¿quién sigue?, ¿qué internados necesitan chequeo?, ¿hay resultados nuevos?"
        impact="El tap inmediato después de abrir la app siempre es 'Nueva consulta', porque el home no aporta valor."
      />

      <Problem
        num="04"
        title="'Nueva consulta' parte de formulario en blanco"
        body="El 80% de consultas son para pacientes ya registrados. Aún así, el CTA principal abre el formulario de 'Nuevo paciente' o fuerza a buscar primero en otra sección."
        impact="Pasos innecesarios. El punto de partida debería ser SIEMPRE el paciente."
      />

      <Problem
        num="05"
        title="Jerarquía visual saturada"
        body="Cada pantalla tiene: barra de progreso, título grande, subtítulo, kicker en azul, tarjeta con imagen stock, chips, inputs con label+icono, mensaje informativo azul, cards decorativas de marca ('Vetus Clinical Protocol'), botón primario + secundario."
        impact="Nada llama más atención que nada. El vet debe escanear dos veces para encontrar el campo activo."
      />

      <Problem
        num="06"
        title="Imágenes decorativas dentro de formularios clínicos"
        body="Fotos genéricas de perros, quirófanos, veterinarios sonriendo — ocupando 20-30% del alto útil en pantallas de anamnesis, examen físico, pronóstico. Puro ruido."
        impact="En un móvil, el espacio vertical es el recurso más caro. Se está gastando en decoración."
      />

      <Problem
        num="07"
        title="Edición de IA no tiene protocolo claro"
        body="Cuando la IA transcribe, no queda claro qué es borrador y qué está confirmado. Botón 'Editando…' en gris, texto en card gris, sin distinción entre 'dictado crudo' y 'resumen estructurado'."
        impact="El vet no sabe si al pulsar Siguiente está aceptando lo que la IA escribió o si se va a perder."
      />

      {/* Proposal */}
      <H2 kicker="2 · Propuesta">Cómo debe funcionar</H2>

      <Principle
        num="I"
        title="Un canvas, no un wizard — pero con los 10 puntos visibles"
        body="La consulta vive en un único canvas con los 10 acordeones obligatorios apilados y agrupados por SOAP (Subjetivo / Objetivo / Assessment / Plan / Cierre). Todos presentes, todos saltables, todos editables en cualquier orden. Un indicador 'X/10 completos' siempre visible; firma bloqueada si falta alguno. Cumplimiento regulatorio sin fricción lineal."
      />
      <Principle
        num="II"
        title="La IA es un atajo, no una pantalla"
        body="Un micrófono persistente en la parte inferior. Toca y habla. El audio se dirige al acordeón con foco — la IA sabe si estás dictando anamnesis, examen o plan. No hay 'modo grabación'; grabar es una acción contextual de 1 tap."
      />
      <Principle
        num="III"
        title="La entrada es el paciente"
        body="Desde home, el CTA primario es 'Buscar paciente'. Si existe → abres su ficha, tap en 'Nueva consulta' prellena especie/edad/peso/alergias. Si no existe → creas desde el mismo campo de búsqueda, en un formulario compacto."
      />
      <Principle
        num="IV"
        title="Home = panel clínico, no feed de app"
        body="Agenda del día con estado (ahora / próximo / urgente), pacientes internados con avance de tareas, últimos registros del vet — no estadísticas."
      />
      <Principle
        num="V"
        title="IA con trazabilidad visual"
        body="Todo texto generado por IA se muestra en tono ámbar tenue con un marcador ✦. El vet puede editarlo libremente y el marcador desaparece. Nada 'se guarda' sin que el vet lo haya visto explícitamente."
      />
      <Principle
        num="VI"
        title="Densidad honesta"
        body="Tipografía Inter a 13–15px para cuerpos, mono para metadatos y unidades. Una sola paleta (tinta + teal + semáforo). Cero imágenes decorativas en pantallas clínicas."
      />

      {/* Flow */}
      <H2 kicker="3 · Flujo">Consulta con los 10 puntos, pero no-lineal</H2>

      <div style={{
        padding: 14, background: T.aiSoft, borderRadius: 10,
        border: `1px solid ${T.ai}33`, marginBottom: 14,
        fontSize: 13, color: T.ink80, lineHeight: 1.5,
        display: 'flex', gap: 10,
      }}>
        <Icon name="sparkle" size={18} color={T.ai} style={{ flexShrink: 0, marginTop: 2 }}/>
        <div>
          <b>Nota de cumplimiento.</b> El rediseño mantiene los 10 puntos exigidos por Comvezcol
          (Res. 8430) como secciones obligatorias. Lo que cambia es <em>cómo</em> se capturan:
          de pantallas secuenciales a un canvas con acordeones navegables, indicador de completitud
          visible y firma bloqueada hasta tener los 10 verificados.
        </div>
      </div>

      <FlowDiagram/>

      <p style={{ fontSize: 13, color: T.ink60, marginTop: 16 }}>
        De ~30 taps a ~8. La IA reduce el volumen de escritura, pero el rediseño estructural del flujo es
        lo que elimina la fricción de fondo. La IA sola sobre la estructura actual no habría arreglado nada.
      </p>

      <H2 kicker="4 · Pantallas">Qué verás al lado</H2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
        {[
          ['Dashboard', 'Agenda del día + internados + recientes.'],
          ['Pacientes', 'Búsqueda inteligente como entrada única.'],
          ['Ficha', 'Resumen + timeline + vitales at-a-glance.'],
          ['Consulta', 'Canvas SOAP + IA persistente (demo interactiva).'],
        ].map(([t, d], i) => (
          <div key={i} style={{
            padding: 14, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12,
          }}>
            <div style={{ fontSize: 10, color: T.ink40, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>
              0{i+1}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{t}</div>
            <div style={{ fontSize: 12, color: T.ink60, lineHeight: 1.45 }}>{d}</div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 40, padding: 20, background: T.ink, color: '#fff',
        borderRadius: 14,
      }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
          Prueba
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.5 }}>
          En la vista de <b>Consulta</b> → pulsa el botón de micrófono flotante (⬛ abajo).
          La IA rellenará la sección que tengas enfocada. Cambia de sección antes de dictar y verás cómo se adapta.
        </div>
      </div>
    </div>
  );
}

function H2({ kicker, children }) {
  return (
    <div style={{ marginTop: 44, marginBottom: 14 }}>
      <div style={{
        fontSize: 10, color: T.ink40, fontFamily: T.mono,
        textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6,
      }}>{kicker}</div>
      <h2 style={{
        margin: 0, fontSize: 26, fontWeight: 500, letterSpacing: -0.5,
        fontFamily: T.serif, fontStyle: 'italic',
      }}>{children}</h2>
    </div>
  );
}

function Problem({ num, title, body, impact }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '40px 1fr',
      gap: 14, marginBottom: 18,
      paddingBottom: 18, borderBottom: `1px solid ${T.lineSoft}`,
    }}>
      <div style={{
        fontFamily: T.mono, fontSize: 11, color: T.urgent, fontWeight: 600,
        letterSpacing: 0.4,
      }}>{num}</div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 4, letterSpacing: -0.2 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: T.ink80, lineHeight: 1.55, marginBottom: 6 }}>{body}</div>
        <div style={{
          fontSize: 12, color: T.ink60, fontStyle: 'italic',
          paddingLeft: 10, borderLeft: `2px solid ${T.urgent}`,
        }}>{impact}</div>
      </div>
    </div>
  );
}

function Principle({ num, title, body }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '40px 1fr',
      gap: 14, marginBottom: 18,
    }}>
      <div style={{
        fontFamily: T.serif, fontSize: 24, color: T.accent, fontWeight: 500,
        fontStyle: 'italic',
      }}>{num}</div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 4, letterSpacing: -0.2 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: T.ink80, lineHeight: 1.55 }}>{body}</div>
      </div>
    </div>
  );
}

function FlowDiagram() {
  const steps = [
    { n: 1, t: 'Abrir app', d: 'Home con agenda' },
    { n: 2, t: 'Buscar paciente', d: 'o crear si es nuevo' },
    { n: 3, t: 'Abrir consulta', d: 'canvas SOAP prellenado' },
    { n: 4, t: 'Dictar / escribir', d: 'IA a demanda por sección' },
    { n: 5, t: 'Firmar y cerrar', d: 'auto-guardado en historial' },
  ];
  return (
    <div style={{
      padding: 16, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14,
      marginTop: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 6 }}>
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 26, height: 26, borderRadius: '50%',
                background: T.accent, color: '#fff',
                fontSize: 12, fontWeight: 600, marginBottom: 8,
              }}>{s.n}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.ink, letterSpacing: -0.1 }}>{s.t}</div>
              <div style={{ fontSize: 11, color: T.ink60, marginTop: 2 }}>{s.d}</div>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                paddingTop: 8,
              }}>
                <Icon name="arrowR" size={14} color={T.ink40}/>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Analysis });
