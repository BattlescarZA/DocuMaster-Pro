const { getFolderModel } = require('../models/Folder');
const { getAuditLogModel } = require('../models/AuditLog');

/**
 * Build folder tree recursively
 */
const buildFolderTree = async (Folder, parentId = null, path = '/') => {
  const folders = await Folder.find({ parentId })
    .populate('createdBy', 'name email')
    .sort({ name: 1 });
  
  const tree = [];
  
  for (const folder of folders) {
    const children = await buildFolderTree(Folder, folder._id, `${path}${folder.name}/`);
    tree.push({
      ...folder.toObject(),
      path: `${path}${folder.name}/`,
      children,
    });
  }
  
  return tree;
};

/**
 * Get all folders (flat or tree)
 * GET /api/folders
 */
const getFolders = async (req, res, next) => {
  try {
    const Folder = getFolderModel(req.companyDB);
    
    const { tree = false, parentId } = req.query;
    
    if (tree === 'true') {
      // Return tree structure
      const folderTree = await buildFolderTree(Folder, parentId || null);
      res.json({ folders: folderTree });
    } else {
      // Return flat list
      const query = {};
      if (parentId !== undefined) {
        query.parentId = parentId === 'null' ? null : parentId;
      }
      
      const folders = await Folder.find(query)
        .populate('createdBy', 'name email')
        .sort({ name: 1 });
      
      res.json({ folders });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get folder by ID
 * GET /api/folders/:id
 */
const getFolder = async (req, res, next) => {
  try {
    const Folder = getFolderModel(req.companyDB);
    
    const folder = await Folder.findById(req.params.id)
      .populate('createdBy', 'name email');
    
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    
    // Get children
    const children = await Folder.find({ parentId: folder._id })
      .populate('createdBy', 'name email')
      .sort({ name: 1 });
    
    res.json({ folder, children });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new folder
 * POST /api/folders
 */
const createFolder = async (req, res, next) => {
  try {
    const { name, parentId, color, icon } = req.body;
    const Folder = getFolderModel(req.companyDB);
    const AuditLog = getAuditLogModel(req.companyDB);
    
    if (!name) {
      return res.status(400).json({ message: 'Folder name is required' });
    }
    
    // Check for duplicate in same parent
    const existingFolder = await Folder.findOne({
      name: name.trim(),
      parentId: parentId || null,
    });
    
    if (existingFolder) {
      return res.status(409).json({ message: 'Folder with this name already exists in this location' });
    }
    
    // Build path
    let folderPath = '/';
    if (parentId) {
      const parent = await Folder.findById(parentId);
      if (parent) {
        folderPath = `${parent.path}${parent.name}/`;
      }
    }
    
    const folder = await Folder.create({
      name: name.trim(),
      parentId: parentId || null,
      path: folderPath,
      color: color || '#3b82f6',
      icon: icon || 'folder',
      createdBy: req.user.id,
    });
    
    await AuditLog.create({
      action: 'CREATE',
      entityType: 'Folder',
      entityId: folder._id,
      userId: req.user.id,
      userEmail: req.user.email,
      details: { name, parentId: parentId || 'root' },
      ipAddress: req.ip,
    });
    
    res.status(201).json({
      message: 'Folder created successfully',
      folder: await Folder.findById(folder._id)
        .populate('createdBy', 'name email'),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update folder
 * PUT /api/folders/:id
 */
const updateFolder = async (req, res, next) => {
  try {
    const { name, parentId, color, icon } = req.body;
    const Folder = getFolderModel(req.companyDB);
    const AuditLog = getAuditLogModel(req.companyDB);
    
    const folder = await Folder.findById(req.params.id);
    
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    
    // Prevent moving folder into itself or its children
    if (parentId) {
      let current = await Folder.findById(parentId);
      while (current) {
        if (current._id.toString() === folder._id.toString()) {
          return res.status(400).json({ message: 'Cannot move folder into itself or its children' });
        }
        current = current.parentId ? await Folder.findById(current.parentId) : null;
      }
    }
    
    const oldName = folder.name;
    
    if (name) {
      // Check for duplicates
      const existing = await Folder.findOne({
        name: name.trim(),
        parentId: parentId || folder.parentId,
        _id: { $ne: folder._id },
      });
      
      if (existing) {
        return res.status(409).json({ message: 'Folder with this name already exists' });
      }
      
      folder.name = name.trim();
    }
    
    if (parentId !== undefined) {
      folder.parentId = parentId || null;
      
      // Recalculate path
      if (parentId) {
        const parent = await Folder.findById(parentId);
        folder.path = parent ? `${parent.path}${parent.name}/` : '/';
      } else {
        folder.path = '/';
      }
    }
    
    if (color) folder.color = color;
    if (icon) folder.icon = icon;
    
    await folder.save();
    
    await AuditLog.create({
      action: 'UPDATE',
      entityType: 'Folder',
      entityId: folder._id,
      userId: req.user.id,
      userEmail: req.user.email,
      details: { oldName, newName: folder.name },
      ipAddress: req.ip,
    });
    
    res.json({
      message: 'Folder updated successfully',
      folder: await Folder.findById(folder._id)
        .populate('createdBy', 'name email'),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete folder
 * DELETE /api/folders/:id
 */
const deleteFolder = async (req, res, next) => {
  try {
    const Folder = getFolderModel(req.companyDB);
    const AuditLog = getAuditLogModel(req.companyDB);
    
    const folder = await Folder.findById(req.params.id);
    
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    
    // Check if folder has children
    const children = await Folder.countDocuments({ parentId: folder._id });
    if (children > 0) {
      return res.status(400).json({ message: 'Cannot delete folder that contains subfolders' });
    }
    
    await Folder.findByIdAndDelete(req.params.id);
    
    await AuditLog.create({
      action: 'DELETE',
      entityType: 'Folder',
      entityId: folder._id,
      userId: req.user.id,
      userEmail: req.user.email,
      details: { name: folder.name },
      ipAddress: req.ip,
    });
    
    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFolders,
  getFolder,
  createFolder,
  updateFolder,
  deleteFolder,
};
