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
  preventiveCareListQuerySchema,
  preventiveCareCreateSchema,
  preventiveCareUpdateSchema,
  preventiveCareApplyNextSchema,
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

router.get(
  '/:id/preventive-care',
  validate({ query: preventiveCareListQuerySchema }),
  ctrl.listPreventiveCare
);
router.post(
  '/:id/preventive-care',
  validate({ body: preventiveCareCreateSchema }),
  ctrl.createPreventiveCare
);
router.patch(
  '/:id/preventive-care/:event_id',
  validate({ body: preventiveCareUpdateSchema }),
  ctrl.updatePreventiveCare
);
router.get('/:id/preventive-care/suggested-plan', ctrl.suggestedPreventiveCarePlan);
router.post(
  '/:id/preventive-care/apply-next',
  validate({ body: preventiveCareApplyNextSchema }),
  ctrl.applyNextPreventiveCare
);

module.exports = router;
