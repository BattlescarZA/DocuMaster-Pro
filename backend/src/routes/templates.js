const express = require('express');
const { body } = require('express-validator');
const {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  useTemplate,
} = require('../controllers/templateController');
const { authenticate, requireEditor } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation
const templateValidation = [
  body('name').trim().notEmpty(),
  body('type').isIn(['document', 'contract']),
  body('content').trim().notEmpty(),
  body('category').optional().trim(),
];

const useTemplateValidation = [
  body('type').optional().isIn(['document', 'contract']),
  body('title').optional().trim(),
  body('parties').optional().isArray(),
];

// Routes
router.get('/', getTemplates);
router.get('/:id', getTemplate);
router.post('/', requireEditor, templateValidation, createTemplate);
router.put('/:id', requireEditor, templateValidation, updateTemplate);
router.delete('/:id', requireEditor, deleteTemplate);
router.post('/:id/use', useTemplateValidation, useTemplate);

module.exports = router;
