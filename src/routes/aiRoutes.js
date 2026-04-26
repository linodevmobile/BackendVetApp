const express = require('express');
const aiCtrl = require('../controllers/aiController');
const upload = require('../middlewares/upload');
const validate = require('../middlewares/validate');
const { processSectionSchema } = require('../validators/aiSchema');

const router = express.Router();

router.post(
  '/process-section',
  upload.single('audio'),
  validate({ body: processSectionSchema }),
  aiCtrl.processSection
);

module.exports = router;
