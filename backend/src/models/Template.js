const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  type: {
    type: String,
    enum: ['document', 'contract'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  variables: [{
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    defaultValue: {
      type: String,
    },
    required: {
      type: Boolean,
      default: false,
    },
  }],
  category: {
    type: String,
    trim: true,
    default: 'General',
  },
  tags: [{
    type: String,
    trim: true,
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  usageCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Indexes
templateSchema.index({ name: 'text', description: 'text' });
templateSchema.index({ type: 1 });
templateSchema.index({ category: 1 });
templateSchema.index({ createdBy: 1 });

/**
 * Create Template model for a specific company database
 * @param {mongoose.Connection} db - Company database connection
 * @returns {mongoose.Model} - Template model
 */
const getTemplateModel = (db) => {
  return db.model('Template', templateSchema, 'dm_templates');
};

module.exports = {
  templateSchema,
  getTemplateModel,
};
