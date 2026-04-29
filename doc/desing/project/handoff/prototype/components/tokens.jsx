// Design tokens — alineados al DESIGN.md oficial.
// Inter · Primary #0052CC · Tertiary #D73A49 · Neutral #F8F9FA (cool gray)
const T = {
  // Surface tones — cool neutral (per DESIGN.md)
  bg:        '#F8F9FA',     // page bg — cool neutral base
  surface:   '#FFFFFF',     // cards
  surfaceAlt:'#EEF0F3',     // subtle fill
  line:      '#DDE2E8',     // hairlines
  lineSoft:  '#E9ECF0',

  // Ink scale — cool-toned
  ink:       '#0E1726',     // near-black, cool
  ink80:     '#2B3748',
  ink60:     '#5A6576',
  ink40:     '#8B94A3',
  ink20:     '#C2C8D1',

  // Primary — brand blue per DESIGN.md
  accent:    '#0052CC',
  accentSoft:'#E1ECFB',
  accentInk: '#003D99',

  // Signal colors — tertiary crimson for criticals
  urgent:    '#D73A49',
  urgentSoft:'#FBE2E4',
  warn:      '#B8860B',
  warnSoft:  '#F7ECD0',
  ok:        '#2E7D3A',
  okSoft:    '#DCEBDF',

  // AI — same blue family, darker for distinction (no out-of-system amber)
  ai:        '#003D99',
  aiSoft:    '#E1ECFB',

  // Type — Inter across all roles per DESIGN.md
  sans: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, Menlo, monospace',
  serif:'"Instrument Serif", "Times New Roman", serif',

  // Shape — roundedness (1) per DESIGN.md = subtle
  r1: 4, r2: 8, r3: 12, r4: 16,
};

window.T = T;
