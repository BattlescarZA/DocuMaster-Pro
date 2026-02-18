const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  role: {
    type: String,
    enum: ['admin', 'editor', 'viewer'],
    default: 'viewer',
  },
  permissions: [{
    type: String,
    enum: ['documents.read', 'documents.write', 'documents.delete', 
           'contracts.read', 'contracts.write', 'contracts.sign',
           'users.read', 'users.write', 'users.delete',
           'templates.read', 'templates.write', 'templates.delete',
           'folders.read', 'folders.write', 'folders.delete'],
  }],
  company: {
    type: String,
    required: true,
  },
  lastLogin: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  avatar: {
    type: String,
  },
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get user without sensitive data
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

/**
 * Create User model for a specific company database
 * @param {mongoose.Connection} db - Company database connection
 * @returns {mongoose.Model} - User model
 */
const getUserModel = (db) => {
  return db.model('User', userSchema, 'dm_users');
};

module.exports = {
  userSchema,
  getUserModel,
};
