const express = require('express');
const { me, getById } = require('../controllers/veterinarianController');

const router = express.Router();

router.get('/me', me);
router.get('/:id', getById);

module.exports = router;
