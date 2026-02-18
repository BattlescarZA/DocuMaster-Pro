const { getTemplateModel } = require('../models/Template');
const { getDocumentModel } = require('../models/Document');
const { getContractModel } = require('../models/Contract');
const { getAuditLogModel } = require('../models/AuditLog');

/**
 * Get all templates
 * GET /api/templates
 */
const getTemplates = async (req, res, next) => {
  try {
    const Template = getTemplateModel(req.companyDB);
    
    const { page = 1, limit = 20, type, category, search } = req.query;
    const query = {};
    
    if (type) query.type = type;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    
    const templates = await Template.find(query)
      .populate('createdBy', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ usageCount: -1, createdAt: -1 });
    
    const count = await Template.countDocuments(query);
    
    res.json({
      templates,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get template by ID
 * GET /api/templates/:id
 */
const getTemplate = async (req, res, next) => {
  try {
    const Template = getTemplateModel(req.companyDB);
    
    const template = await Template.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    res.json({ template });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new template
 * POST /api/templates
 */
const createTemplate = async (req, res, next) => {
  try {
    const { name, description, type, content, variables, category, tags, isPublic } = req.body;
    const Template = getTemplateModel(req.companyDB);
    const AuditLog = getAuditLogModel(req.companyDB);
    
    const template = await Template.create({
      name,
      description,
      type: type || 'document',
      content,
      variables: variables || [],
      category: category || 'General',
      tags: tags || [],
      isPublic: isPublic || false,
      createdBy: req.user.id,
    });
    
    await AuditLog.create({
      action: 'CREATE',
      entityType: 'Template',
      entityId: template._id,
      userId: req.user.id,
      userEmail: req.user.email,
      details: { name, type },
      ipAddress: req.ip,
    });
    
    res.status(201).json({
      message: 'Template created successfully',
      template: await Template.findById(template._id)
        .populate('createdBy', 'name email'),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update template
 * PUT /api/templates/:id
 */
const updateTemplate = async (req, res, next) => {
  try {
    const { name, description, content, variables, category, tags, isPublic } = req.body;
    const Template = getTemplateModel(req.companyDB);
    const AuditLog = getAuditLogModel(req.companyDB);
    
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    if (name) template.name = name;
    if (description !== undefined) template.description = description;
    if (content) template.content = content;
    if (variables) template.variables = variables;
    if (category) template.category = category;
    if (tags) template.tags = tags;
    if (typeof isPublic === 'boolean') template.isPublic = isPublic;
    
    template.updatedBy = req.user.id;
    await template.save();
    
    await AuditLog.create({
      action: 'UPDATE',
      entityType: 'Template',
      entityId: template._id,
      userId: req.user.id,
      userEmail: req.user.email,
      details: { updatedFields: Object.keys(req.body) },
      ipAddress: req.ip,
    });
    
    res.json({
      message: 'Template updated successfully',
      template: await Template.findById(template._id)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email'),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete template
 * DELETE /api/templates/:id
 */
const deleteTemplate = async (req, res, next) => {
  try {
    const Template = getTemplateModel(req.companyDB);
    const AuditLog = getAuditLogModel(req.companyDB);
    
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    await Template.findByIdAndDelete(req.params.id);
    
    await AuditLog.create({
      action: 'DELETE',
      entityType: 'Template',
      entityId: template._id,
      userId: req.user.id,
      userEmail: req.user.email,
      details: { name: template.name },
      ipAddress: req.ip,
    });
    
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Use template to create document or contract
 * POST /api/templates/:id/use
 */
const useTemplate = async (req, res, next) => {
  try {
    const { type, variables, title, parties, value, currency, startDate, endDate } = req.body;
    const Template = getTemplateModel(req.companyDB);
    const Document = getDocumentModel(req.companyDB);
    const Contract = getContractModel(req.companyDB);
    const AuditLog = getAuditLogModel(req.companyDB);
    
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    // Replace variables in content
    let content = template.content;
    if (variables) {
      Object.keys(variables).forEach(key => {
        content = content.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
      });
    }
    
    let result;
    
    if (type === 'contract' || template.type === 'contract') {
      // Create contract
      result = await Contract.create({
        title: title || template.name,
        parties: parties || [],
        content,
        templateId: template._id,
        value: value || 0,
        currency: currency || 'USD',
        startDate: startDate || null,
        endDate: endDate || null,
        createdBy: req.user.id,
        auditTrail: [{
          action: 'Contract created from template',
          performedBy: req.user.id,
          performedAt: new Date(),
          details: `Template: ${template.name}`,
          ipAddress: req.ip,
        }],
      });
    } else {
      // Create document
      result = await Document.create({
        title: title || template.name,
        description: `Created from template: ${template.name}`,
        filename: `doc-${Date.now()}.txt`,
        originalName: `${template.name}.txt`,
        mimeType: 'text/plain',
        size: Buffer.byteLength(content, 'utf8'),
        path: null, // No file for generated content
        content,
        createdBy: req.user.id,
      });
    }
    
    // Increment template usage
    template.usageCount += 1;
    await template.save();
    
    await AuditLog.create({
      action: 'CREATE',
      entityType: type === 'contract' ? 'Contract' : 'Document',
      entityId: result._id,
      userId: req.user.id,
      userEmail: req.user.email,
      details: { fromTemplate: template.name, templateId: template._id },
      ipAddress: req.ip,
    });
    
    res.status(201).json({
      message: `${type === 'contract' ? 'Contract' : 'Document'} created from template`,
      [type === 'contract' ? 'contract' : 'document']: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  useTemplate,
};
