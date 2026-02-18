const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
  },
  filename: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50,
  }],
  version: {
    type: Number,
    default: 1,
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
  },
  sharedWith: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    permission: {
      type: String,
      enum: ['read', 'write'],
      default: 'read',
    },
    sharedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  metadata: {
    type: Map,
    of: String,
  },
}, {
  timestamps: true,
});

// Index for search
documentSchema.index({ title: 'text', description: 'text', tags: 'text' });
documentSchema.index({ folderId: 1 });
documentSchema.index({ createdBy: 1 });
documentSchema.index({ status: 1 });

/**
 * Create Document model for a specific company database
 * @param {mongoose.Connection} db - Company database connection
 * @returns {mongoose.Model} - Document model
 */
const getDocumentModel = (db) => {
  return db.model('Document', documentSchema, 'dm_documents');
};

module.exports = {
  documentSchema,
  getDocumentModel,
};
