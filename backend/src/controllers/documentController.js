const fs = require('fs');
const path = require('path');
const { getDocumentModel } = require('../models/Document');
const { getAuditLogModel } = require('../models/AuditLog');

/**
 * Get all documents
 * GET /api/documents
 */
const getDocuments = async (req, res, next) => {
  try {
    const Document = getDocumentModel(req.companyDB);
    
    const { page = 1, limit = 20, folderId, status, search, tags } = req.query;
    const query = {};
    
    if (folderId) query.folderId = folderId;
    if (status) query.status = status;
    if (tags) query.tags = { $in: tags.split(',') };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    
    const documents = await Document.find(query)
      .populate('createdBy', 'name email')
      .populate('folderId', 'name path')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ updatedAt: -1 });
    
    const count = await Document.countDocuments(query);
    
    res.json({
      documents,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get document by ID
 * GET /api/documents/:id
 */
const getDocument = async (req, res, next) => {
  try {
    const Document = getDocumentModel(req.companyDB);
    
    const document = await Document.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('folderId', 'name path');
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    res.json({ document });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload new document
 * POST /api/documents
 */
const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const { title, description, folderId, tags } = req.body;
    const Document = getDocumentModel(req.companyDB);
    const AuditLog = getAuditLogModel(req.companyDB);
    
    const document = await Document.create({
      title: title || req.file.originalname,
      description,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      folderId: folderId || null,
      createdBy: req.user.id,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
    });
    
    await AuditLog.create({
      action: 'CREATE',
      entityType: 'Document',
      entityId: document._id,
      userId: req.user.id,
      userEmail: req.user.email,
      details: { 
        filename: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      },
      ipAddress: req.ip,
    });
    
    res.status(201).json({
      message: 'Document uploaded successfully',
      document: await Document.findById(document._id)
        .populate('createdBy', 'name email'),
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

/**
 * Download document
 * GET /api/documents/:id/download
 */
const downloadDocument = async (req, res, next) => {
  try {
    const Document = getDocumentModel(req.companyDB);
    const AuditLog = getAuditLogModel(req.companyDB);
    
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    if (!fs.existsSync(document.path)) {
      return res.status(404).json({ message: 'File not found on server' });
    }
    
    // Log download
    await AuditLog.create({
      action: 'DOWNLOAD',
      entityType: 'Document',
      entityId: document._id,
      userId: req.user.id,
      userEmail: req.user.email,
      details: { filename: document.originalName },
      ipAddress: req.ip,
    });
    
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    
    const fileStream = fs.createReadStream(document.path);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Update document metadata
 * PUT /api/documents/:id
 */
const updateDocument = async (req, res, next) => {
  try {
    const { title, description, folderId, tags, status } = req.body;
    const Document = getDocumentModel(req.companyDB);
    const AuditLog = getAuditLogModel(req.companyDB);
    
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    if (title) document.title = title;
    if (description !== undefined) document.description = description;
    if (folderId !== undefined) document.folderId = folderId || null;
    if (tags) document.tags = tags.split(',').map(t => t.trim());
    if (status) document.status = status;
    
    document.updatedBy = req.user.id;
    await document.save();
    
    await AuditLog.create({
      action: 'UPDATE',
      entityType: 'Document',
      entityId: document._id,
      userId: req.user.id,
      userEmail: req.user.email,
      details: { updatedFields: Object.keys(req.body) },
      ipAddress: req.ip,
    });
    
    res.json({
      message: 'Document updated successfully',
      document: await Document.findById(document._id)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email'),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete document
 * DELETE /api/documents/:id
 */
const deleteDocument = async (req, res, next) => {
  try {
    const Document = getDocumentModel(req.companyDB);
    const AuditLog = getAuditLogModel(req.companyDB);
    
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Delete file from filesystem
    if (fs.existsSync(document.path)) {
      fs.unlinkSync(document.path);
    }
    
    await Document.findByIdAndDelete(req.params.id);
    
    await AuditLog.create({
      action: 'DELETE',
      entityType: 'Document',
      entityId: document._id,
      userId: req.user.id,
      userEmail: req.user.email,
      details: { filename: document.originalName },
      ipAddress: req.ip,
    });
    
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDocuments,
  getDocument,
  uploadDocument,
  downloadDocument,
  updateDocument,
  deleteDocument,
};
