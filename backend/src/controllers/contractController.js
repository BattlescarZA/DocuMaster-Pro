const { getContractModel } = require('../models/Contract');
const { getTemplateModel } = require('../models/Template');
const { getAuditLogModel } = require('../models/AuditLog');

/**
 * Get all contracts
 * GET /api/contracts
 */
const getContracts = async (req, res, next) => {
  try {
    const Contract = getContractModel(req.companyDB);
    
    const { page = 1, limit = 20, status, search } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'parties.name': { $regex: search, $options: 'i' } },
        { 'parties.email': { $regex: search, $options: 'i' } },
      ];
    }
    
    const contracts = await Contract.find(query)
      .populate('createdBy', 'name email')
      .populate('templateId', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ updatedAt: -1 });
    
    const count = await Contract.countDocuments(query);
    
    res.json({
      contracts,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get contract by ID
 * GET /api/contracts/:id
 */
const getContract = async (req, res, next) => {
  try {
    const Contract = getContractModel(req.companyDB);
    
    const contract = await Contract.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('templateId', 'name type');
    
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    
    res.json({ contract });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new contract
 * POST /api/contracts
 */
const createContract = async (req, res, next) => {
  try {
    const { title, parties, content, templateId, value, currency, startDate, endDate, tags } = req.body;
    const Contract = getContractModel(req.companyDB);
    const Template = getTemplateModel(req.companyDB);
    const AuditLog = getAuditLogModel(req.companyDB);
    
    let contractContent = content;
    
    // If templateId provided, use template content
    if (templateId) {
      const template = await Template.findById(templateId);
      if (template) {
        contractContent = template.content;
        // Increment template usage
        template.usageCount += 1;
        await template.save();
      }
    }
    
    const contract = await Contract.create({
      title,
      parties: parties || [],
      content: contractContent,
      templateId: templateId || null,
      value: value || 0,
      currency: currency || 'USD',
      startDate: startDate || null,
      endDate: endDate || null,
      tags: tags || [],
      createdBy: req.user.id,
      auditTrail: [{
        action: 'Contract created',
        performedBy: req.user.id,
        performedAt: new Date(),
        details: templateId ? 'Created from template' : 'Created manually',
        ipAddress: req.ip,
      }],
    });
    
    await AuditLog.create({
      action: 'CREATE',
      entityType: 'Contract',
      entityId: contract._id,
      userId: req.user.id,
      userEmail: req.user.email,
      details: { title, parties: parties?.length || 0 },
      ipAddress: req.ip,
    });
    
    res.status(201).json({
      message: 'Contract created successfully',
      contract: await Contract.findById(contract._id)
        .populate('createdBy', 'name email'),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update contract
 * PUT /api/contracts/:id
 */
const updateContract = async (req, res, next) => {
  try {
    const { title, parties, content, value, currency, startDate, endDate, tags, status } = req.body;
    const Contract = getContractModel(req.companyDB);
    const AuditLog = getAuditLogModel(req.companyDB);
    
    const contract = await Contract.findById(req.params.id);
    
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    
    if (title) contract.title = title;
    if (parties) contract.parties = parties;
    if (content) contract.content = content;
    if (value !== undefined) contract.value = value;
    if (currency) contract.currency = currency;
    if (startDate !== undefined) contract.startDate = startDate;
    if (endDate !== undefined) contract.endDate = endDate;
    if (tags) contract.tags = tags;
    if (status) contract.status = status;
    
    contract.updatedBy = req.user.id;
    
    contract.auditTrail.push({
      action: 'Contract updated',
      performedBy: req.user.id,
      performedAt: new Date(),
      details: `Updated fields: ${Object.keys(req.body).join(', ')}`,
      ipAddress: req.ip,
    });
    
    await contract.save();
    
    await AuditLog.create({
      action: 'UPDATE',
      entityType: 'Contract',
      entityId: contract._id,
      userId: req.user.id,
      userEmail: req.user.email,
      details: { updatedFields: Object.keys(req.body) },
      ipAddress: req.ip,
    });
    
    res.json({
      message: 'Contract updated successfully',
      contract: await Contract.findById(contract._id)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email'),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sign contract
 * PUT /api/contracts/:id/sign
 */
const signContract = async (req, res, next) => {
  try {
    const { partyEmail, signature } = req.body;
    const Contract = getContractModel(req.companyDB);
    const AuditLog = getAuditLogModel(req.companyDB);
    
    const contract = await Contract.findById(req.params.id);
    
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    
    // Find party by email
    const partyIndex = contract.parties.findIndex(p => p.email === partyEmail);
    if (partyIndex === -1) {
      return res.status(400).json({ message: 'Party not found in contract' });
    }
    
    // Update party signature
    contract.parties[partyIndex].signedAt = new Date();
    contract.parties[partyIndex].signature = signature;
    contract.parties[partyIndex].ipAddress = req.ip;
    
    // Check if all parties have signed
    const allSigned = contract.parties.every(p => p.signedAt);
    if (allSigned) {
      contract.status = 'signed';
    } else if (contract.parties.some(p => p.signedAt)) {
      contract.status = 'partially_signed';
    }
    
    contract.auditTrail.push({
      action: 'Contract signed',
      performedBy: req.user.id,
      performedAt: new Date(),
      details: `Signed by ${partyEmail}`,
      ipAddress: req.ip,
    });
    
    await contract.save();
    
    await AuditLog.create({
      action: 'SIGN',
      entityType: 'Contract',
      entityId: contract._id,
      userId: req.user.id,
      userEmail: req.user.email,
      details: { signedBy: partyEmail, status: contract.status },
      ipAddress: req.ip,
    });
    
    res.json({
      message: 'Contract signed successfully',
      contract: await Contract.findById(contract._id)
        .populate('createdBy', 'name email'),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete contract
 * DELETE /api/contracts/:id
 */
const deleteContract = async (req, res, next) => {
  try {
    const Contract = getContractModel(req.companyDB);
    const AuditLog = getAuditLogModel(req.companyDB);
    
    const contract = await Contract.findById(req.params.id);
    
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    
    await Contract.findByIdAndDelete(req.params.id);
    
    await AuditLog.create({
      action: 'DELETE',
      entityType: 'Contract',
      entityId: contract._id,
      userId: req.user.id,
      userEmail: req.user.email,
      details: { title: contract.title },
      ipAddress: req.ip,
    });
    
    res.json({ message: 'Contract deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getContracts,
  getContract,
  createContract,
  updateContract,
  signContract,
  deleteContract,
};
