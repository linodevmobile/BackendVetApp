const express = require('express');
const ctrl = require('../controllers/consultationController');
const attachmentCtrl = require('../controllers/attachmentController');
const upload = require('../middlewares/upload');
const validate = require('../middlewares/validate');
const {
  processSchema,
  sectionParamSchema,
  updateSectionBodySchema,
  pauseSchema,
  signSchema,
} = require('../validators/consultationSchema');
const { uploadSchema } = require('../validators/attachmentSchema');

const router = express.Router();

router.post(
  '/process',
  upload.single('audio'),
  validate({ body: processSchema }),
  ctrl.processConsultation
);

router.get('/:id', ctrl.getConsultationById);

router.patch(
  '/:id/sections/:section',
  validate({ params: sectionParamSchema, body: updateSectionBodySchema }),
  ctrl.updateSection
);

router.patch('/:id/pause', validate({ body: pauseSchema }), ctrl.pause);
router.patch('/:id/resume', ctrl.resume);
router.patch('/:id/sign', validate({ body: signSchema }), ctrl.sign);

// Backwards-compat: /close is now an alias of /sign
router.patch('/:id/close', validate({ body: signSchema }), ctrl.sign);

router.post(
  '/:id/attachments',
  upload.single('file'),
  validate({ body: uploadSchema }),
  attachmentCtrl.upload
);
router.get('/:id/attachments', attachmentCtrl.list);
router.delete('/:id/attachments/:attachmentId', attachmentCtrl.remove);

module.exports = router;
