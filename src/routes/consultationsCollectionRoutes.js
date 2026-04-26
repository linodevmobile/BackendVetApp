const express = require('express');
const { recentConsultations, consultationsByStatus } = require('../controllers/dashboardController');
const consultationCtrl = require('../controllers/consultationController');
const validate = require('../middlewares/validate');
const { createConsultationSchema } = require('../validators/consultationSchema');

const router = express.Router();

// Collection-level operations on consultations.
router.get('/recent', recentConsultations);
router.get('/', consultationsByStatus);
router.post('/', validate({ body: createConsultationSchema }), consultationCtrl.createConsultation);

module.exports = router;
