const express = require('express');
const veterinarianController = require('../controllers/veterinarianController');

const router = express.Router();

router.get('/', veterinarianController.list);
router.get('/:id', veterinarianController.getById);

module.exports = router;
