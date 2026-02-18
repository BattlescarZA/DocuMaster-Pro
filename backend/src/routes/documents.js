const express = require('express');
const { body } = require('express-validator');
const {
  getDocuments,
  getDocument,
  uploadDocument,
  downloadDocument,
  updateDocument,
  deleteDocument,
} = require('../controllers/documentController');
const { authenticate, requireEditor } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation
const documentValidation = [
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('status').optional().isIn(['draft', 'published', 'archived']),
];

// Routes
router.get('/', getDocuments);
router.get('/:id', getDocument);
router.post(
  '/',
  requireEditor,
  upload.single('file'),
  handleUploadError,
  uploadDocument
);
router.get('/:id/download', downloadDocument);
router.put('/:id', requireEditor, documentValidation, updateDocument);
router.delete('/:id', requireEditor, deleteDocument);

module.exports = router;
