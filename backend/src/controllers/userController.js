const { getUserModel } = require('../models/User');
const { getAuditLogModel } = require('../models/AuditLog');

/**
 * Get all users
 * GET /api/users
 */
const getUsers = async (req, res, next) => {
  try {
    const User = getUserModel(req.companyDB);
    
    const { page = 1, limit = 20, role, search } = req.query;
    const query = { isActive: true };
    
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    
    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const count = await User.countDocuments(query);
    
    res.json({
      users,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 * GET /api/users/:id
 */
const getUser = async (req, res, next) => {
  try {
    const User = getUserModel(req.companyDB);
    
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new user
 * POST /api/users
 */
const createUser = async (req, res, next) => {
  try {
    const { email, password, name, role, permissions } = req.body;
    const User = getUserModel(req.companyDB);
    const AuditLog = getAuditLogModel(req.companyDB);
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }
    
    const user = await User.create({
      email,
      password,
      name,
      role: role || 'viewer',
      permissions: permissions || [],
      company: req.companyName,
    });
    
    await AuditLog.create({
      action: 'CREATE',
      entityType: 'User',
      entityId: user._id,
      userId: req.user.id,
      userEmail: req.user.email,
      details: { createdUserEmail: email, role },
      ipAddress: req.ip,
    });
    
    res.status(201).json({
      message: 'User created successfully',
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user
 * PUT /api/users/:id
 */
const updateUser = async (req, res, next) => {
  try {
    const { name, role, permissions, isActive } = req.body;
    const User = getUserModel(req.companyDB);
    const AuditLog = getAuditLogModel(req.companyDB);
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent self-demotion from admin
    if (user._id.toString() === req.user.id && role && role !== 'admin') {
      return res.status(403).json({ message: 'Cannot change your own admin role' });
    }
    
    if (name) user.name = name;
    if (role) user.role = role;
    if (permissions) user.permissions = permissions;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    
    await user.save();
    
    await AuditLog.create({
      action: 'UPDATE',
      entityType: 'User',
      entityId: user._id,
      userId: req.user.id,
      userEmail: req.user.email,
      details: { updatedFields: Object.keys(req.body) },
      ipAddress: req.ip,
    });
    
    res.json({
      message: 'User updated successfully',
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user
 * DELETE /api/users/:id
 */
const deleteUser = async (req, res, next) => {
  try {
    const User = getUserModel(req.companyDB);
    const AuditLog = getAuditLogModel(req.companyDB);
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent self-deletion
    if (user._id.toString() === req.user.id) {
      return res.status(403).json({ message: 'Cannot delete your own account' });
    }
    
    await User.findByIdAndDelete(req.params.id);
    
    await AuditLog.create({
      action: 'DELETE',
      entityType: 'User',
      entityId: user._id,
      userId: req.user.id,
      userEmail: req.user.email,
      details: { deletedUserEmail: user.email },
      ipAddress: req.ip,
    });
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset user password (Admin only)
 * PUT /api/users/:id/password
 */
const resetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const User = getUserModel(req.companyDB);
    const AuditLog = getAuditLogModel(req.companyDB);
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    
    const user = await User.findById(req.params.id).select('+password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.password = newPassword;
    await user.save();
    
    await AuditLog.create({
      action: 'UPDATE',
      entityType: 'User',
      entityId: user._id,
      userId: req.user.id,
      userEmail: req.user.email,
      details: { action: 'Password reset by admin' },
      ipAddress: req.ip,
    });
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
};
