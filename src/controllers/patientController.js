const { createPatient, getPatient, listPatients, updatePatient } = require('../services/stateService');
const logger = require('../utils/logger');

async function create(req, res) {
  const { name, species, breed, sex, date_of_birth, weight_kg, microchip, owner_name, owner_phone, owner_email } = req.body;

  if (!name || !species || !sex || !owner_name) {
    return res.status(400).json({
      error: 'Campos requeridos: name, species, sex, owner_name',
    });
  }

  try {
    const patient = await createPatient({
      name, species, breed, sex, date_of_birth, weight_kg, microchip,
      owner_name, owner_phone, owner_email,
    });
    res.status(201).json(patient);
  } catch (error) {
    logger.error('Error al crear paciente:', error.message);
    res.status(500).json({ error: 'Error al crear paciente', details: error.message });
  }
}

async function getById(req, res) {
  try {
    const patient = await getPatient(req.params.id);
    res.json(patient);
  } catch (error) {
    logger.error('Error al obtener paciente:', error.message);
    res.status(404).json({ error: 'Paciente no encontrado', details: error.message });
  }
}

async function list(req, res) {
  try {
    const patients = await listPatients();
    res.json(patients);
  } catch (error) {
    logger.error('Error al listar pacientes:', error.message);
    res.status(500).json({ error: 'Error al listar pacientes', details: error.message });
  }
}

async function update(req, res) {
  try {
    const patient = await updatePatient(req.params.id, req.body);
    res.json(patient);
  } catch (error) {
    logger.error('Error al actualizar paciente:', error.message);
    res.status(500).json({ error: 'Error al actualizar paciente', details: error.message });
  }
}

module.exports = { create, getById, list, update };
