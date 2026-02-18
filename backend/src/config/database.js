const mongoose = require('mongoose');

const connections = {};

const getDatabaseUri = (companyName) => {
  const baseUri = process.env.MONGODB_URI || 'mongodb://10.8.0.14:27017';
  const dbName = companyName ? `documaster_${companyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : 'documaster_default';
  return `${baseUri}/${dbName}`;
};

const connectToDatabase = async (companyName) => {
  const cacheKey = companyName || 'default';
  
  if (connections[cacheKey] && connections[cacheKey].readyState === 1) {
    return connections[cacheKey];
  }
  
  const uri = getDatabaseUri(companyName);
  
  try {
    const conn = await mongoose.createConnection(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    connections[cacheKey] = conn;
    
    conn.on('error', (err) => {
      console.error(`MongoDB connection error for ${cacheKey}:`, err);
      delete connections[cacheKey];
    });
    
    conn.on('disconnected', () => {
      console.log(`MongoDB disconnected for ${cacheKey}`);
      delete connections[cacheKey];
    });
    
    return conn;
  } catch (error) {
    console.error(`Failed to connect to database for ${cacheKey}:`, error);
    throw error;
  }
};

const getConnection = (companyName) => {
  const cacheKey = companyName || 'default';
  return connections[cacheKey];
};

const closeAllConnections = async () => {
  const keys = Object.keys(connections);
  for (const key of keys) {
    if (connections[key]) {
      await connections[key].close();
      delete connections[key];
    }
  }
};

module.exports = {
  connectToDatabase,
  getConnection,
  getDatabaseUri,
  closeAllConnections,
};