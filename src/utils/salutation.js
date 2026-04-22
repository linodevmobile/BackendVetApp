function buildSalutation(fullName, explicit) {
  if (explicit && explicit.trim()) return explicit.trim();
  if (!fullName) return null;
  const parts = fullName.trim().split(/\s+/);
  const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  return `Dr. ${lastName}`;
}

module.exports = { buildSalutation };
