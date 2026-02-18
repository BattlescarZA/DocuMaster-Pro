module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'documaster-pro-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  bcryptSaltRounds: 12,
};