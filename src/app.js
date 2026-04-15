const express = require('express');
const cors = require('cors');
const consultationRoutes = require('./routes/consultationRoutes');
const { VALID_SECTIONS } = require('./services/promptRouter');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/consultation', consultationRoutes);

app.get('/', (req, res) => {
  res.json({
    mensaje: 'Backend VetApp funcionando',
    endpoint: 'POST /consultation/process',
    campos: {
      audio: 'archivo de audio (multipart/form-data)',
      section: `sección de la historia clínica: ${VALID_SECTIONS.join(', ')}`,
      consultation_id: 'ID de consulta existente (opcional)',
    },
  });
});

module.exports = app;
