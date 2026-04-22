const express = require('express');
const { recentConsultations, consultationsByStatus } = require('../controllers/dashboardController');

const router = express.Router();

router.get('/recent', recentConsultations);
router.get('/', consultationsByStatus);

module.exports = router;
