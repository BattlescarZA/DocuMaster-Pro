const express = require('express');
const { body } = require('express-validator');
const {
  getFolders,
  getFolder,
  createFolder,
  updateFolder,
  deleteFolder,
} = require('../controllers/folderController');
const { authenticate, requireEditor } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation
const folderValidation = [
  body('name').trim().notEmpty().isLength({ min: 1, max: 100 }),
  body('parentId').optional({ nullable: true }).isMongoId(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  body('icon').optional().trim(),
];

// Routes
router.get('/', getFolders);
router.get('/:id', getFolder);
router.post('/', requireEditor, folderValidation, createFolder);
router.put('/:id', requireEditor, folderValidation, updateFolder);
router.delete('/:id', requireEditor, deleteFolder);

module.exports = router;
