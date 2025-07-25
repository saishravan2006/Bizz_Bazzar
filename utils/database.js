const fs = require('fs');
const path = require('path');

// Render persistent disk path
const PERSISTENT_DIR = '/var/data';

// File paths - using Render persistent disk
const SELLERS_FILE = path.join(PERSISTENT_DIR, 'sellers.json');
const BUYERS_FILE = path.join(PERSISTENT_DIR, 'buyers.json');
const SELLER_MESSAGES_FILE = path.join(PERSISTENT_DIR, 'seller_messages.json');

// MongoDB models (will be used if MongoDB is connected)
let Seller;
let Buyer;
let SellerMessage;

// Connection status
let isMongoConnected = false;

// Set MongoDB connection status
function setMongoConnectionStatus(status) {
  isMongoConnected = status;
  
  // If MongoDB is connected, import models
  if (status) {
    try {
      // These would be imported from a models directory in a full implementation
      // For now, we'll just set placeholders
      Seller = {};
      Buyer = {};
      SellerMessage = {};
    } catch (err) {
      console.error('Error importing MongoDB models:', err);
    }
  }
}

// Save sellers to database or JSON
async function saveSellersToDb(sellers) {
  if (isMongoConnected) {
    // MongoDB implementation would go here
    console.log('Saving sellers to MongoDB');
    return true;
  } else {
    try {
      await fs.promises.writeFile(SELLERS_FILE, JSON.stringify(sellers, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving sellers to JSON:', error);
      return false;
    }
  }
}

// Load sellers from database or JSON
async function loadSellers() {
  if (isMongoConnected) {
    // MongoDB implementation would go here
    console.log('Loading sellers from MongoDB');
    return {};
  } else {
    try {
      if (fs.existsSync(SELLERS_FILE)) {
        const data = await fs.promises.readFile(SELLERS_FILE, 'utf8');
        return JSON.parse(data);
      }
      return {};
    } catch (error) {
      console.error('Error loading sellers from JSON:', error);
      return {};
    }
  }
}

// Save buyers to database or JSON
async function saveBuyersToDb(buyers) {
  if (isMongoConnected) {
    // MongoDB implementation would go here
    console.log('Saving buyers to MongoDB');
    return true;
  } else {
    try {
      // Note: This function is now only used for saving buyer inquiry data
      // The actual buyer registration data is handled in final.js with temp storage
      await fs.promises.writeFile(BUYERS_FILE, JSON.stringify(buyers, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving buyers to JSON:', error);
      return false;
    }
  }
}

// Load buyers from database or JSON
async function loadBuyers() {
  if (isMongoConnected) {
    // MongoDB implementation would go here
    console.log('Loading buyers from MongoDB');
    return {};
  } else {
    try {
      if (fs.existsSync(BUYERS_FILE)) {
        const data = await fs.promises.readFile(BUYERS_FILE, 'utf8');
        return JSON.parse(data);
      }
      return {};
    } catch (error) {
      console.error('Error loading buyers from JSON:', error);
      return {};
    }
  }
}

// Save seller message map to database or JSON
async function saveSellerMessageMapToDb(sellerMessageMap) {
  if (isMongoConnected) {
    // MongoDB implementation would go here
    console.log('Saving seller message map to MongoDB');
    return true;
  } else {
    try {
      await fs.promises.writeFile(SELLER_MESSAGES_FILE, JSON.stringify(sellerMessageMap, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving seller message map to JSON:', error);
      return false;
    }
  }
}

// Load seller message map from database or JSON
async function loadSellerMessageMap() {
  if (isMongoConnected) {
    // MongoDB implementation would go here
    console.log('Loading seller message map from MongoDB');
    return {};
  } else {
    try {
      if (fs.existsSync(SELLER_MESSAGES_FILE)) {
        const data = await fs.promises.readFile(SELLER_MESSAGES_FILE, 'utf8');
        return JSON.parse(data);
      }
      return {};
    } catch (error) {
      console.error('Error loading seller message map from JSON:', error);
      return {};
    }
  }
}

// Record seller response
async function recordSellerResponse(sellerId, buyerId, responded) {
  const key = `${sellerId}_${buyerId}`;
  
  if (isMongoConnected) {
    // MongoDB implementation would go here
    console.log(`Recording seller response: ${sellerId} to ${buyerId} - ${responded}`);
    return true;
  } else {
    try {
      // Load current data
      let sellerMessageMap = {};
      if (fs.existsSync(SELLER_MESSAGES_FILE)) {
        const data = await fs.promises.readFile(SELLER_MESSAGES_FILE, 'utf8');
        sellerMessageMap = JSON.parse(data);
      }
      
      // Update data
      sellerMessageMap[key] = {
        ...sellerMessageMap[key],
        responded,
        timestamp: Date.now()
      };
      
      // Save updated data
      await fs.promises.writeFile(SELLER_MESSAGES_FILE, JSON.stringify(sellerMessageMap, null, 2));
      return true;
    } catch (error) {
      console.error('Error recording seller response:', error);
      return false;
    }
  }
}

module.exports = {
  setMongoConnectionStatus,
  saveSellersToDb,
  loadSellers,
  saveBuyersToDb,
  loadBuyers,
  saveSellerMessageMapToDb,
  loadSellerMessageMap,
  recordSellerResponse
};