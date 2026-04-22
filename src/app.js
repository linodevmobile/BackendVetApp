const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const consultationRoutes = require('./routes/consultationRoutes');
const patientRoutes = require('./routes/patientRoutes');
const veterinarianRoutes = require('./routes/veterinarianRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const alertRoutes = require('./routes/alertRoutes');
const responseWrapper = require('./middlewares/responseWrapper');
const authMiddleware = require('./middlewares/authMiddleware');
const errorHandler = require('./middlewares/errorHandler');
const requestId = require('./middlewares/requestId');
const { authLimiter, processLimiter } = require('./middlewares/rateLimiters');
const { VALID_SECTIONS } = require('./services/promptRouter');

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestId);
app.use(responseWrapper);

app.get('/', (req, res) => {
  res.ok({
    mensaje: 'Backend VetApp funcionando',
    endpoints: {
      auth: { login: 'POST /auth/login', register: 'POST /auth/register' },
      veterinarians: { me: 'GET /veterinarians/me', get: 'GET /veterinarians/:id' },
      patients: {
        list: 'GET /patients',
        create: 'POST /patients',
        get: 'GET /patients/:id',
        update: 'PATCH /patients/:id',
        favorites_list: 'GET /patients/favorites',
        favorite_add: 'POST /patients/favorites/:patient_id',
        favorite_remove: 'DELETE /patients/favorites/:patient_id',
        alerts_list: 'GET /patients/:patient_id/alerts',
        alert_create: 'POST /patients/:patient_id/alerts',
      },
      appointments: {
        today: 'GET /appointments/today',
        create: 'POST /appointments',
        update: 'PATCH /appointments/:id',
        delete: 'DELETE /appointments/:id',
      },
      consultation: {
        process: 'POST /consultation/process',
        get: 'GET /consultation/:id',
        update_section: 'PATCH /consultation/:id/sections/:section',
        pause: 'PATCH /consultation/:id/pause',
        resume: 'PATCH /consultation/:id/resume',
        sign: 'PATCH /consultation/:id/sign',
        attachments_list: 'GET /consultation/:id/attachments',
        attachment_upload: 'POST /consultation/:id/attachments',
        attachment_delete: 'DELETE /consultation/:id/attachments/:attachmentId',
      },
      consultations_list: {
        recent: 'GET /consultations/recent',
        by_status: 'GET /consultations?status=paused',
      },
    },
    valid_sections: VALID_SECTIONS,
  });
});

app.use('/auth', authLimiter, authRoutes);

app.use('/veterinarians', authMiddleware, veterinarianRoutes);
app.use('/appointments', authMiddleware, appointmentRoutes);
app.use('/consultations', authMiddleware, dashboardRoutes);
app.use('/consultation', authMiddleware, processLimiter, consultationRoutes);
app.use('/patients', authMiddleware, patientRoutes);
app.use(authMiddleware, alertRoutes);

app.use(errorHandler);

module.exports = app;
