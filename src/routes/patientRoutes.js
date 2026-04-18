const express = require('express');
const patientController = require('../controllers/patientController');

const router = express.Router();

router.post('/', patientController.create);
router.get('/', patientController.list);
router.get('/:id', patientController.getById);
router.patch('/:id', patientController.update);

module.exports = router;
