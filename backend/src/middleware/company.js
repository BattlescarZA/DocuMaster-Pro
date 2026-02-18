const { connectToDatabase } = require('../config/database');

const companyContext = async (req, res, next) => {
  const companyName = req.headers['x-company-name'];
  
  if (!companyName) {
    return res.status(400).json({ error: 'x-company-name header is required' });
  }
  
  try {
    const connection = await connectToDatabase(companyName);
    req.db = connection;
    req.companyName = companyName;
    next();
  } catch (error) {
    console.error('Failed to connect to company database:', error);
    return res.status(500).json({ error: 'Failed to connect to company database' });
  }
};

module.exports = {
  companyContext,
};