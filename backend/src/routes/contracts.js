const express = require('express');
const { body } = require('express-validator');
const {
  getContracts,
  getContract,
  createContract,
  updateContract,
  signContract,
  deleteContract,
} = require('../controllers/contractController');
const { authenticate, requireEditor } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation
const contractValidation = [
  body('title').trim().notEmpty(),
  body('content').optional().trim(),
  body('parties').optional().isArray(),
  body('status').optional().isIn(['draft', 'sent', 'partially_signed', 'signed', 'expired', 'cancelled']),
];

const signValidation = [
  body('partyEmail').isEmail(),
  body('signature').trim().notEmpty(),
];

// Routes
router.get('/', getContracts);
router.get('/:id', getContract);
router.post('/', requireEditor, contractValidation, createContract);
router.put('/:id', requireEditor, contractValidation, updateContract);
router.put('/:id/sign', signValidation, signContract);
router.delete('/:id', requireEditor, deleteContract);

module.exports = router;
