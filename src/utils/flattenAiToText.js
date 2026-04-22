function asLines(label, value) {
  if (value === undefined || value === null || value === '') return null;
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return `${label}:\n- ${value.join('\n- ')}`;
  }
  if (typeof value === 'object') {
    const inner = Object.entries(value)
      .map(([k, v]) => asLines(k.replace(/_/g, ' '), v))
      .filter(Boolean)
      .join('\n');
    return inner ? `${label}:\n${inner}` : null;
  }
  return `${label}: ${value}`;
}

function flattenJson(obj) {
  if (!obj || typeof obj !== 'object') return '';
  const parts = Object.entries(obj)
    .map(([k, v]) => asLines(k.replace(/_/g, ' '), v))
    .filter(Boolean);
  return parts.join('\n\n');
}

function flattenAiToText(section, aiJson) {
  if (!aiJson) return '';
  try {
    return flattenJson(aiJson);
  } catch (_err) {
    return typeof aiJson === 'string' ? aiJson : JSON.stringify(aiJson, null, 2);
  }
}

module.exports = { flattenAiToText };
