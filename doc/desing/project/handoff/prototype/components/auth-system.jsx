// Login + Splash screens, Toast system, Info Dialog

function Splash() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: T.accent, color: '#fff',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}>
      <div style={{
        width: 84, height: 84, borderRadius: 20,
        background: 'rgba(255,255,255,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24, backdropFilter: 'blur(12px)',
      }}>
        <Icon name="paw" size={44} color="#fff" strokeWidth={1.8}/>
      </div>
      <div style={{
        fontFamily: T.serif, fontSize: 44, fontStyle: 'italic',
        fontWeight: 500, letterSpacing: -1, lineHeight: 1,
      }}>VetApp</div>
      <div style={{
        fontSize: 11, color: 'rgba(255,255,255,0.65)', fontFamily: T.mono,
        textTransform: 'uppercase', letterSpacing: 2, marginTop: 10,
      }}>Clínica · Historia · Hospital</div>

      <div style={{ position: 'absolute', bottom: 60, display: 'flex', gap: 4 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%', background: '#fff',
            animation: `pulse 1.2s ease-in-out ${i * 0.15}s infinite`,
          }}/>
        ))}
      </div>
    </div>
  );
}

function Login({ goto, toast }) {
  const [email, setEmail] = React.useState('mariana.rivas@clinica.co');
  const [password, setPassword] = React.useState('••••••••');
  const [loading, setLoading] = React.useState(false);

  const submit = () => {
    if (!email || !password) {
      toast('error', 'Completa ambos campos');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast('success', 'Bienvenida, Dra. Rivas');
      setTimeout(() => goto('dashboard'), 400);
    }, 900);
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      background: T.bg, padding: '60px 24px 32px',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Brand mark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 60 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: T.accent, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="paw" size={18} color="#fff" strokeWidth={2}/>
        </div>
        <div style={{
          fontFamily: T.serif, fontSize: 22, fontStyle: 'italic', fontWeight: 500,
          letterSpacing: -0.4, color: T.ink,
        }}>VetApp</div>
      </div>

      <div style={{ flex: 1 }}>
        <h1 style={{
          margin: '0 0 8px', fontFamily: T.serif, fontStyle: 'italic',
          fontSize: 34, fontWeight: 500, letterSpacing: -0.8, color: T.ink,
          lineHeight: 1.1,
        }}>Hola de nuevo.</h1>
        <p style={{
          margin: '0 0 32px', fontSize: 14, color: T.ink60, lineHeight: 1.5,
        }}>
          Accede con tus credenciales profesionales.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Correo profesional">
            <TextInput placeholder="tu@clinica.co" value={email} onChange={setEmail}/>
          </Field>
          <Field label="Contraseña">
            <TextInput placeholder="••••••••" value={password} onChange={setPassword}/>
          </Field>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.ink60, cursor: 'pointer' }}>
              <div style={{
                width: 16, height: 16, borderRadius: 4,
                background: T.accent, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><Icon name="check" size={11} color="#fff"/></div>
              Mantener sesión
            </label>
            <span style={{ fontSize: 12, color: T.accent, fontWeight: 500, cursor: 'pointer' }}>
              ¿Olvidaste?
            </span>
          </div>
        </div>
      </div>

      <div>
        <Btn variant="primary" size="lg" full icon={loading ? undefined : 'arrowR'} onClick={submit} disabled={loading}>
          {loading ? 'Verificando…' : 'Entrar'}
        </Btn>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: T.ink60 }}>
          ¿Nuevo en la clínica? <span style={{ color: T.accent, fontWeight: 500 }}>Solicita acceso</span>
        </div>
        <div style={{
          marginTop: 20, textAlign: 'center',
          fontSize: 10, color: T.ink40, fontFamily: T.mono,
          textTransform: 'uppercase', letterSpacing: 1,
        }}>
          v2.4 · Comvezcol Res. 8430
        </div>
      </div>
    </div>
  );
}

// Info dialog — lighter than confirm, for informational screens
function InfoDialog({ title, body, onClose, tone = 'info' }) {
  const tones = {
    info:    { bg: T.accentSoft, fg: T.accent,  icon: 'alert' },
    success: { bg: T.okSoft,     fg: T.ok,      icon: 'check' },
    warn:    { bg: T.warnSoft,   fg: T.warn,    icon: 'alert' },
    error:   { bg: T.urgentSoft, fg: T.urgent,  icon: 'alert' },
  }[tone];
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, background: 'rgba(14,23,38,0.55)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, animation: 'fadeIn 0.15s ease-out',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.surface, borderRadius: 16, width: '100%', maxWidth: 320,
        padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: tones.bg, color: tones.fg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <Icon name={tones.icon} size={28}/>
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.2, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 13, color: T.ink60, lineHeight: 1.5, marginBottom: 16 }}>{body}</div>
        <Btn variant="primary" full onClick={onClose}>Entendido</Btn>
      </div>
    </div>
  );
}

// Confirm dialog — two buttons (cancel + destructive/primary)
function ConfirmDialog({ title, body, confirm = 'Confirmar', cancel = 'Cancelar', onConfirm, onCancel, destructive = false }) {
  return (
    <div onClick={onCancel} style={{
      position: 'absolute', inset: 0, background: 'rgba(14,23,38,0.55)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, animation: 'fadeIn 0.15s ease-out',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.surface, borderRadius: 16, width: '100%', maxWidth: 320,
        padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.2, marginBottom: 6 }}>{title}</div>
        {body && <div style={{ fontSize: 13, color: T.ink60, lineHeight: 1.5, marginBottom: 16 }}>{body}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: body ? 0 : 16 }}>
          <Btn variant="secondary" full onClick={onCancel}>{cancel}</Btn>
          <Btn variant={destructive ? 'danger' : 'primary'} full onClick={onConfirm}>{confirm}</Btn>
        </div>
      </div>
    </div>
  );
}

// Toast system — small notifications
function ToastStack({ toasts }) {
  return (
    <div style={{
      position: 'absolute', top: 58, left: 16, right: 16, zIndex: 300,
      display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <Toast key={t.id} tone={t.tone} text={t.text}/>
      ))}
    </div>
  );
}

function Toast({ tone, text }) {
  const tones = {
    success: { bg: '#0E1726', fg: '#fff', iconBg: T.ok,     icon: 'check' },
    error:   { bg: '#0E1726', fg: '#fff', iconBg: T.urgent, icon: 'alert' },
    info:    { bg: '#0E1726', fg: '#fff', iconBg: T.accent, icon: 'alert' },
    warn:    { bg: '#0E1726', fg: '#fff', iconBg: T.warn,   icon: 'alert' },
  }[tone] || { bg: '#0E1726', fg: '#fff', iconBg: T.accent, icon: 'alert' };
  return (
    <div style={{
      background: tones.bg, color: tones.fg,
      borderRadius: 12, padding: '10px 12px',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 10px 28px rgba(0,0,0,0.25)',
      animation: 'fadeIn 0.2s ease-out',
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        background: tones.iconBg, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon name={tones.icon} size={14} color="#fff" strokeWidth={2.4}/>
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{text}</div>
    </div>
  );
}

// Hook for toast management
function useToasts() {
  const [toasts, setToasts] = React.useState([]);
  const push = React.useCallback((tone, text) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, tone, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);
  return { toasts, push };
}

Object.assign(window, { Splash, Login, InfoDialog, ConfirmDialog, ToastStack, Toast, useToasts });
