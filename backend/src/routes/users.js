const express = require('express');
const { body } = require('express-validator');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
} = require('../controllers/userController');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation
const createUserValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().notEmpty(),
  body('role').optional().isIn(['admin', 'editor', 'viewer']),
];

const updateUserValidation = [
  body('name').optional().trim().notEmpty(),
  body('role').optional().isIn(['admin', 'editor', 'viewer']),
  body('isActive').optional().isBoolean(),
];

const resetPasswordValidation = [
  body('newPassword').isLength({ min: 6 }),
];

// Routes
router.get('/', getUsers);
router.get('/:id', getUser);
router.post('/', requireAdmin, createUserValidation, createUser);
router.put('/:id', requireAdmin, updateUserValidation, updateUser);
router.delete('/:id', requireAdmin, deleteUser);
router.put('/:id/password', requireAdmin, resetPasswordValidation, resetPassword);

module.exports = router;
