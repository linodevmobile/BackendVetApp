const express = require('express');
const { today, create, update, remove } = require('../controllers/appointmentController');
const validate = require('../middlewares/validate');
const { createSchema, updateSchema } = require('../validators/appointmentSchema');

const router = express.Router();

router.get('/today', today);
router.post('/', validate({ body: createSchema }), create);
router.patch('/:id', validate({ body: updateSchema }), update);
router.delete('/:id', remove);

module.exports = router;
