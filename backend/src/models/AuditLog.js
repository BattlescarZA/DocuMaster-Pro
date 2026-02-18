const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'DOWNLOAD', 'SHARE', 'SIGN'],
  },
  entityType: {
    type: String,
    required: true,
    enum: ['User', 'Document', 'Contract', 'Template', 'Folder', 'Auth'],
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  userEmail: {
    type: String,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

// Indexes for efficient querying
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ action: 1 });

/**
 * Create AuditLog model for a specific company database
 * @param {mongoose.Connection} db - Company database connection
 * @returns {mongoose.Model} - AuditLog model
 */
const getAuditLogModel = (db) => {
  return db.model('AuditLog', auditLogSchema, 'dm_audit_logs');
};

module.exports = {
  auditLogSchema,
  getAuditLogModel,
};
