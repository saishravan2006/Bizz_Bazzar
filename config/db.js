const mongoose = require('mongoose');

// MongoDB connection function
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

    return conn;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    return null;
  }
};

module.exports = connectDB;