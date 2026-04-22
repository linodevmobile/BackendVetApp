const express = require('express');
const ctrl = require('../controllers/patientController');
const validate = require('../middlewares/validate');
const { createSchema, updateSchema, listQuerySchema } = require('../validators/patientSchema');

const router = express.Router();

router.get('/favorites', ctrl.listFavorites);
router.post('/favorites/:patient_id', ctrl.addFavorite);
router.delete('/favorites/:patient_id', ctrl.removeFavorite);

router.post('/', validate({ body: createSchema }), ctrl.create);
router.get('/', validate({ query: listQuerySchema }), ctrl.list);
router.get('/:id', ctrl.getById);
router.patch('/:id', validate({ body: updateSchema }), ctrl.update);

module.exports = router;
