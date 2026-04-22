const express = require('express');
const ctrl = require('../controllers/alertController');
const validate = require('../middlewares/validate');
const { createSchema } = require('../validators/alertSchema');

const router = express.Router();

router.post('/patients/:patient_id/alerts', validate({ body: createSchema }), ctrl.create);
router.get('/patients/:patient_id/alerts', ctrl.listByPatient);
router.patch('/patient-alerts/:id/deactivate', ctrl.deactivate);
router.delete('/patient-alerts/:id', ctrl.remove);

module.exports = router;
