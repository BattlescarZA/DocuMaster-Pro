const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Folder name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
  },
  path: {
    type: String,
    required: true,
    default: '/',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  color: {
    type: String,
    default: '#3b82f6', // Default blue color
  },
  icon: {
    type: String,
    default: 'folder',
  },
}, {
  timestamps: true,
});

// Indexes
folderSchema.index({ parentId: 1 });
folderSchema.index({ path: 1 });
folderSchema.index({ createdBy: 1 });

/**
 * Create Folder model for a specific company database
 * @param {mongoose.Connection} db - Company database connection
 * @returns {mongoose.Model} - Folder model
 */
const getFolderModel = (db) => {
  return db.model('Folder', folderSchema, 'dm_folders');
};

module.exports = {
  folderSchema,
  getFolderModel,
};
