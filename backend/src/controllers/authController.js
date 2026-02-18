const { generateToken } = require('../config/auth');
const { getUserModel } = require('../models/User');
const { getAuditLogModel } = require('../models/AuditLog');

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const User = getUserModel(req.companyDB);
    const AuditLog = getAuditLogModel(req.companyDB);
    
    // Find user
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Log the login
    await AuditLog.create({
      action: 'LOGIN',
      entityType: 'Auth',
      userId: user._id,
      userEmail: user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    // Generate token
    const token = generateToken(user);
    
    res.json({
      message: 'Login successful',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register new user (Admin only)
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { email, password, name, role = 'viewer', permissions = [] } = req.body;
    const User = getUserModel(req.companyDB);
    const AuditLog = getAuditLogModel(req.companyDB);
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }
    
    // Create user
    const user = await User.create({
      email,
      password,
      name,
      role,
      permissions,
      company: req.companyName,
    });
    
    // Log the creation
    await AuditLog.create({
      action: 'CREATE',
      entityType: 'User',
      entityId: user._id,
      userId: req.user?.id,
      userEmail: req.user?.email,
      details: { createdUserEmail: email },
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
 * Change password
 * PUT /api/auth/password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const User = getUserModel(req.companyDB);
    
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const User = getUserModel(req.companyDB);
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ user: user.toJSON() });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  register,
  changePassword,
  getMe,
};
