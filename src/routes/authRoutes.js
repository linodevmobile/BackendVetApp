const express = require('express');
const { login, register } = require('../controllers/authController');
const validate = require('../middlewares/validate');
const { loginSchema, registerSchema } = require('../validators/authSchema');

const router = express.Router();

router.post('/login', validate({ body: loginSchema }), login);
router.post('/register', validate({ body: registerSchema }), register);

module.exports = router;
