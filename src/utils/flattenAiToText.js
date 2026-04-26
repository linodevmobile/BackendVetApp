const { getLabel } = require('./sectionLabels');

function asLines(label, value, section) {
  if (value === undefined || value === null || value === '') return null;
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return `${label}:\n- ${value.join('\n- ')}`;
  }
  if (typeof value === 'object') {
    const inner = Object.entries(value)
      .map(([k, v]) => asLines(getLabel(section, k), v, section))
      .filter(Boolean)
      .join('\n');
    return inner ? `${label}:\n${inner}` : null;
  }
  return `${label}: ${value}`;
}

function flattenAiToText(section, aiJson) {
  if (!aiJson || typeof aiJson !== 'object') return '';
  try {
    const parts = Object.entries(aiJson)
      .map(([k, v]) => asLines(getLabel(section, k), v, section))
      .filter(Boolean);
    return parts.join('\n\n');
  } catch (_err) {
    return typeof aiJson === 'string' ? aiJson : JSON.stringify(aiJson, null, 2);
  }
}

module.exports = { flattenAiToText };
