const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const consultationRoutes = require('./routes/consultationRoutes');
const patientRoutes = require('./routes/patientRoutes');
const veterinarianRoutes = require('./routes/veterinarianRoutes');
const { VALID_SECTIONS } = require('./services/promptRouter');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/consultation', consultationRoutes);
app.use('/patients', patientRoutes);
app.use('/veterinarians', veterinarianRoutes);

app.get('/', (req, res) => {
  res.json({
    mensaje: 'Backend VetApp funcionando',
    endpoints: {
      auth: {
        login: 'POST /auth/login',
        register: 'POST /auth/register',
      },
      patients: {
        create: 'POST /patients',
        list: 'GET /patients',
        get: 'GET /patients/:id',
        update: 'PATCH /patients/:id',
      },
      veterinarians: {
        list: 'GET /veterinarians',
        get: 'GET /veterinarians/:id',
      },
      consultation: {
        process: 'POST /consultation/process',
        get: 'GET /consultation/:id',
        close: 'PATCH /consultation/:id/close',
      },
    },
    valid_sections: VALID_SECTIONS,
  });
});

module.exports = app;
