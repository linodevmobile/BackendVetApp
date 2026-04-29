// Primitives — icons, chips, buttons, inputs. Tiny, deliberate, all in same hairline style.

const Icon = ({ name, size = 18, color = 'currentColor', strokeWidth = 1.6 }) => {
  const s = { width: size, height: size, display: 'inline-block', flexShrink: 0 };
  const p = { fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    // nav
    home: <g {...p}><path d="M3 10l9-7 9 7v10a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1V10z"/></g>,
    paw: <g {...p}><circle cx="5" cy="9" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="19" cy="9" r="2"/><circle cx="8.5" cy="14" r="1.7"/><circle cx="15.5" cy="14" r="1.7"/><path d="M7 20c0-3 2.3-5 5-5s5 2 5 5"/></g>,
    clipboard: <g {...p}><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4v-1a1 1 0 011-1h4a1 1 0 011 1v1"/><path d="M9 10h6M9 14h6M9 18h3"/></g>,
    calendar: <g {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></g>,
    user: <g {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></g>,
    // actions
    plus: <g {...p}><path d="M12 5v14M5 12h14"/></g>,
    search: <g {...p}><circle cx="11" cy="11" r="7"/><path d="M16 16l4 4"/></g>,
    mic: <g {...p}><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3M8 21h8"/></g>,
    stop: <g {...p}><rect x="6" y="6" width="12" height="12" rx="1"/></g>,
    chevronR: <g {...p}><path d="M9 6l6 6-6 6"/></g>,
    chevronL: <g {...p}><path d="M15 6l-6 6 6 6"/></g>,
    chevronD: <g {...p}><path d="M6 9l6 6 6-6"/></g>,
    close: <g {...p}><path d="M6 6l12 12M18 6L6 18"/></g>,
    check: <g {...p}><path d="M4 12l5 5L20 6"/></g>,
    more: <g {...p}><circle cx="5" cy="12" r="1.2" fill={color} stroke="none"/><circle cx="12" cy="12" r="1.2" fill={color} stroke="none"/><circle cx="19" cy="12" r="1.2" fill={color} stroke="none"/></g>,
    alert: <g {...p}><path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18v.5"/></g>,
    pill: <g {...p}><rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-35 12 12)"/><path d="M12 7.5l4.5 4.5" /></g>,
    sparkle: <g {...p}><path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z"/><path d="M19 17l.7 2 2 .7-2 .7L19 22l-.7-1.6-2-.7 2-.7z"/></g>,
    file: <g {...p}><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"/><path d="M14 3v5h5"/></g>,
    edit: <g {...p}><path d="M4 20h4L20 8l-4-4L4 16v4z"/></g>,
    save: <g {...p}><path d="M5 3h11l3 3v13a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"/><path d="M7 3v6h8V3M7 21v-7h10v7"/></g>,
    arrowR: <g {...p}><path d="M5 12h14M13 5l7 7-7 7"/></g>,
    x: <g {...p}><path d="M6 6l12 12M18 6L6 18"/></g>,
    settings: <g {...p}><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></g>,
    thermo: <g {...p}><path d="M12 14V4a2 2 0 00-4 0v10a4 4 0 104 0z"/></g>,
    heart: <g {...p}><path d="M12 20s-8-5-8-11a4 4 0 018-1 4 4 0 018 1c0 6-8 11-8 11z"/></g>,
    lungs: <g {...p}><path d="M12 3v12M6 8c-3 2-3 7-2 10 1 2 4 1 5-1V8c-1-1-2-1-3 0zM18 8c3 2 3 7 2 10-1 2-4 1-5-1V8c1-1 2-1 3 0z"/></g>,
    weight: <g {...p}><path d="M4 7h16l-1 13H5L4 7z"/><path d="M9 7a3 3 0 016 0"/></g>,
    bed: <g {...p}><path d="M3 18V8M3 12h18v6M12 12V8h9v4"/><circle cx="7" cy="11" r="2"/></g>,
    back: <g {...p}><path d="M20 12H4M10 18l-6-6 6-6"/></g>,
    share: <g {...p}><path d="M12 15V3M8 7l4-4 4 4"/><path d="M5 15v4a2 2 0 002 2h10a2 2 0 002-2v-4"/></g>,
    clock: <g {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></g>,
    keyboard: <g {...p}><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/></g>,
    trash: <g {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/></g>,
    pause: <g {...p}><rect x="7" y="5" width="3" height="14" rx="0.5"/><rect x="14" y="5" width="3" height="14" rx="0.5"/></g>,
    play: <g {...p}><path d="M7 4v16l13-8z"/></g>,
    hash: <g {...p}><path d="M5 9h14M5 15h14M10 3L8 21M16 3l-2 18"/></g>,
  };
  return <svg viewBox="0 0 24 24" style={s}>{paths[name] || null}</svg>;
};

const Chip = ({ tone = 'neutral', children, size = 'sm' }) => {
  const tones = {
    neutral: { bg: T.surfaceAlt, fg: T.ink80 },
    accent:  { bg: T.accentSoft, fg: T.accentInk },
    urgent:  { bg: T.urgentSoft, fg: T.urgent },
    warn:    { bg: T.warnSoft, fg: T.warn },
    ok:      { bg: T.okSoft, fg: T.ok },
    ai:      { bg: T.aiSoft, fg: T.ai },
    outline: { bg: 'transparent', fg: T.ink60, border: `1px solid ${T.line}` },
  }[tone];
  const sz = size === 'xs'
    ? { fontSize: 10, padding: '3px 7px', height: 18, letterSpacing: 0.4 }
    : { fontSize: 11, padding: '4px 9px', height: 22, letterSpacing: 0.3 };
  return (
    <span style={{
      ...sz,
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: tones.bg, color: tones.fg,
      border: tones.border || 'none',
      borderRadius: 999, fontWeight: 500,
      textTransform: 'uppercase',
      fontFamily: T.sans,
      whiteSpace: 'nowrap',
    }}>{children}</span>
  );
};

const Btn = ({ children, variant = 'primary', size = 'md', icon, onClick, full, style = {}, disabled }) => {
  const variants = {
    primary: { bg: T.accent, fg: '#fff', border: `1px solid ${T.accent}` },
    secondary: { bg: T.surface, fg: T.ink, border: `1px solid ${T.line}` },
    ghost: { bg: 'transparent', fg: T.ink80, border: '1px solid transparent' },
    danger: { bg: T.urgent, fg: '#fff', border: `1px solid ${T.urgent}` },
    ai: { bg: T.ink, fg: '#fff', border: `1px solid ${T.ink}` },
  }[variant];
  const sizes = {
    sm: { height: 32, padding: '0 12px', fontSize: 13 },
    md: { height: 42, padding: '0 16px', fontSize: 14 },
    lg: { height: 52, padding: '0 20px', fontSize: 15 },
  }[size];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...sizes,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      background: variants.bg, color: variants.fg, border: variants.border,
      borderRadius: 10, fontWeight: 500, fontFamily: T.sans,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      width: full ? '100%' : 'auto',
      letterSpacing: -0.1,
      ...style,
    }}>
      {icon && <Icon name={icon} size={16}/>}
      {children}
    </button>
  );
};

const Card = ({ children, pad = 16, style = {}, onClick }) => (
  <div onClick={onClick} style={{
    background: T.surface, border: `1px solid ${T.line}`,
    borderRadius: T.r3, padding: pad, cursor: onClick ? 'pointer' : 'default',
    ...style,
  }}>{children}</div>
);

const Field = ({ label, children, hint, align = 'block' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    {label && <label style={{
      fontSize: 11, fontWeight: 600, color: T.ink60,
      textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: T.sans,
    }}>{label}</label>}
    {children}
    {hint && <span style={{ fontSize: 11, color: T.ink40 }}>{hint}</span>}
  </div>
);

const TextInput = ({ placeholder, value, onChange, multiline, rows = 3, aiActive, style = {} }) => {
  const base = {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 12px',
    background: aiActive ? T.aiSoft : T.surface,
    border: `1px solid ${aiActive ? T.ai : T.line}`,
    borderRadius: 8,
    fontSize: 14, color: T.ink, fontFamily: T.sans,
    outline: 'none', resize: 'none',
    transition: 'border 0.2s, background 0.2s',
    ...style,
  };
  return multiline
    ? <textarea rows={rows} placeholder={placeholder} value={value} onChange={e => onChange?.(e.target.value)} style={base}/>
    : <input placeholder={placeholder} value={value} onChange={e => onChange?.(e.target.value)} style={base}/>;
};

// Striped placeholder block (image / visual stand-in)
const Placeholder = ({ label = 'image', height = 140, rounded = T.r2, style = {} }) => (
  <div style={{
    height, borderRadius: rounded,
    background: `repeating-linear-gradient(135deg, ${T.surfaceAlt}, ${T.surfaceAlt} 8px, ${T.lineSoft} 8px, ${T.lineSoft} 16px)`,
    border: `1px solid ${T.line}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: T.ink40, fontFamily: T.mono, fontSize: 10,
    letterSpacing: 1, textTransform: 'uppercase',
    ...style,
  }}>{label}</div>
);

// Species-specific pet avatar (no photo)
const PetAvatar = ({ species = 'dog', size = 40, urgent }) => {
  const glyphs = {
    dog: '🐕', cat: '🐈', rabbit: '🐇', bird: '🐦', other: '🐾',
  };
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: urgent ? T.urgentSoft : T.accentSoft,
      color: urgent ? T.urgent : T.accentInk,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.5, flexShrink: 0,
      border: `1px solid ${urgent ? '#E8C0B3' : '#BFDAD5'}`,
    }}>{glyphs[species] || glyphs.other}</div>
  );
};

// Section header
const SectionTitle = ({ kicker, title, meta, trailing }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
    <div>
      {kicker && <div style={{
        fontSize: 10, fontWeight: 600, color: T.ink40,
        textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 2,
        fontFamily: T.mono,
      }}>{kicker}</div>}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h3 style={{
          margin: 0, fontSize: 15, fontWeight: 600, color: T.ink,
          letterSpacing: -0.2,
        }}>{title}</h3>
        {meta && <span style={{ fontSize: 12, color: T.ink40 }}>{meta}</span>}
      </div>
    </div>
    {trailing}
  </div>
);

Object.assign(window, { Icon, Chip, Btn, Card, Field, TextInput, Placeholder, PetAvatar, SectionTitle });
