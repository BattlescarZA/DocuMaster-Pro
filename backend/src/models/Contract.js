const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  parties: [{
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      enum: ['client', 'vendor', 'partner', 'employee'],
      default: 'client',
    },
    signedAt: {
      type: Date,
    },
    signature: {
      type: String, // Base64 signature image or hash
    },
    ipAddress: {
      type: String,
    },
  }],
  content: {
    type: String,
    required: true,
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template',
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'partially_signed', 'signed', 'expired', 'cancelled'],
    default: 'draft',
  },
  value: {
    type: Number,
    min: 0,
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true,
    maxlength: 3,
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
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
  auditTrail: [{
    action: {
      type: String,
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    performedAt: {
      type: Date,
      default: Date.now,
    },
    details: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
  }],
  tags: [{
    type: String,
    trim: true,
  }],
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    path: String,
  }],
}, {
  timestamps: true,
});

// Indexes
contractSchema.index({ title: 'text', content: 'text' });
contractSchema.index({ status: 1 });
contractSchema.index({ createdBy: 1 });
contractSchema.index({ 'parties.email': 1 });
contractSchema.index({ startDate: 1, endDate: 1 });

/**
 * Create Contract model for a specific company database
 * @param {mongoose.Connection} db - Company database connection
 * @returns {mongoose.Model} - Contract model
 */
const getContractModel = (db) => {
  return db.model('Contract', contractSchema, 'dm_contracts');
};

module.exports = {
  contractSchema,
  getContractModel,
};
