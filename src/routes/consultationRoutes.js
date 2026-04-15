const express = require('express');
const multer = require('multer');
const path = require('path');
const { processConsultation } = require('../controllers/consultationController');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

router.post('/process', upload.single('audio'), processConsultation);

module.exports = router;
