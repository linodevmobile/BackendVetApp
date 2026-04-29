const express = require('express');
const ctrl = require('../controllers/patientController');
const measurementsCtrl = require('../controllers/measurementsController');
const upload = require('../middlewares/upload');
const validate = require('../middlewares/validate');
const {
  createSchema,
  updateSchema,
  listQuerySchema,
  measurementsListQuerySchema,
  timelineListQuerySchema,
  hospitalizationsQuerySchema,
  appointmentsQuerySchema,
  attachmentsQuerySchema,
  attachmentUploadSchema,
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
router.get('/:id/hospitalizations', validate({ query: hospitalizationsQuerySchema }), ctrl.listHospitalizations);
router.get('/:id/appointments', validate({ query: appointmentsQuerySchema }), ctrl.listAppointments);
router.get('/:id/attachments', validate({ query: attachmentsQuerySchema }), ctrl.listAttachments);
router.post(
  '/:id/attachments',
  upload.single('file'),
  validate({ body: attachmentUploadSchema }),
  ctrl.uploadAttachmentForPatient
);

module.exports = router;
