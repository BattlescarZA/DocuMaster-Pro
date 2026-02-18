const express = require('express');
const { body } = require('express-validator');
const { login, register, changePassword, getMe } = require('../controllers/authController');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().notEmpty(),
  body('role').optional().isIn(['admin', 'editor', 'viewer']),
];

const passwordValidation = [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
];

// Routes
router.post('/login', loginValidation, login);
router.post('/register', authenticate, requireAdmin, registerValidation, register);
router.put('/password', authenticate, passwordValidation, changePassword);
router.get('/me', authenticate, getMe);

module.exports = router;
