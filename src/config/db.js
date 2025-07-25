// Database configuration
const mongoose = require('mongoose');

/**
 * Connect to MongoDB if URI is provided in environment variables
 * @returns {Promise<mongoose.Connection|null>} MongoDB connection or null if not connected
 */
const connectDB = async () => {
  try {
    // Check if MongoDB URI is defined in environment variables
    if (!process.env.MONGODB_URI) {
      console.log('MongoDB URI not found in environment variables');
      return null;
    }
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    return null;
  }
};

module.exports = connectDB;