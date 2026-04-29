const express = require('express');
const ctrl = require('../controllers/patientController');
const measurementsCtrl = require('../controllers/measurementsController');
const validate = require('../middlewares/validate');
const {
  createSchema,
  updateSchema,
  listQuerySchema,
  measurementsListQuerySchema,
  timelineListQuerySchema,
} = require('../validators/patientSchema');

const router = express.Router();

router.get('/favorites', ctrl.listFavorites);
router.post('/favorites/:patient_id', ctrl.addFavorite);
router.delete('/favorites/:patient_id', ctrl.removeFavorite);

router.post('/', validate({ body: createSchema }), ctrl.create);
router.get('/', validate({ query: listQuerySchema }), ctrl.list);
router.get('/:id', ctrl.getById);
router.patch('/:id', validate({ body: updateSchema }), ctrl.update);

router.get('/:id/timeline', validate({ query: timelineListQuerySchema }), ctrl.timeline);
router.get('/:id/measurements', validate({ query: measurementsListQuerySchema }), measurementsCtrl.listByPatient);

module.exports = router;
