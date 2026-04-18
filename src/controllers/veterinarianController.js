const { getVeterinarian, listVeterinarians } = require('../services/stateService');
const logger = require('../utils/logger');

async function getById(req, res) {
  try {
    const vet = await getVeterinarian(req.params.id);
    res.json(vet);
  } catch (error) {
    logger.error('Error al obtener veterinario:', error.message);
    res.status(404).json({ error: 'Veterinario no encontrado', details: error.message });
  }
}

async function list(req, res) {
  try {
    const vets = await listVeterinarians();
    res.json(vets);
  } catch (error) {
    logger.error('Error al listar veterinarios:', error.message);
    res.status(500).json({ error: 'Error al listar veterinarios', details: error.message });
  }
}

module.exports = { getById, list };
