// Database utility functions
const fs = require('fs');
const path = require('path');
const { FILE_PATHS } = require('../config/constants');

// MongoDB models (placeholders for now)
let Seller = null;
let Buyer = null;
let SellerMessage = null;

// Flag to track MongoDB connection status
let isMongoConnected = false;

/**
 * Set the MongoDB connection status
 * @param {boolean} status - Connection status
 */
function setMongoConnectionStatus(status) {
    isMongoConnected = status;
}

/**
 * Save sellers data to database
 * @param {Array} sellers - Array of seller objects
 * @returns {Promise<boolean>} - Success status
 */
async function saveSellersToDb(sellers) {
    try {
        if (isMongoConnected && Seller) {
            // MongoDB implementation would go here
            console.log('Saving sellers to MongoDB');
            return true;
        } else {
            // Save to local JSON file
            fs.writeFileSync(FILE_PATHS.SELLERS_FILE, JSON.stringify(sellers, null, 2));
            console.log('Saved sellers to local JSON file');
            return true;
        }
    } catch (error) {
        console.error('Error saving sellers:', error);
        return false;
    }
}

/**
 * Load sellers from database
 * @returns {Promise<Array>} - Array of seller objects
 */
async function loadSellers() {
    try {
        if (isMongoConnected && Seller) {
            // MongoDB implementation would go here
            console.log('Loading sellers from MongoDB');
            return [];
        } else {
            // Load from local JSON file
            if (fs.existsSync(FILE_PATHS.SELLERS_FILE)) {
                const data = fs.readFileSync(FILE_PATHS.SELLERS_FILE, 'utf8');
                return JSON.parse(data);
            }
            return [];
        }
    } catch (error) {
        console.error('Error loading sellers:', error);
        return [];
    }
}

/**
 * Save awaiting sellers data to database
 * @param {Array} awaitingSellers - Array of awaiting seller objects
 * @returns {Promise<boolean>} - Success status
 */
async function saveAwaitingSellersToDb(awaitingSellers) {
    try {
        // Save to local JSON file (MongoDB implementation would be similar to saveSellersToDb)
        fs.writeFileSync(FILE_PATHS.AWAITING_SELLERS_FILE, JSON.stringify(awaitingSellers, null, 2));
        console.log('Saved awaiting sellers to local JSON file');
        return true;
    } catch (error) {
        console.error('Error saving awaiting sellers:', error);
        return false;
    }
}

/**
 * Load awaiting sellers from database
 * @returns {Promise<Array>} - Array of awaiting seller objects
 */
async function loadAwaitingSellers() {
    try {
        // Load from local JSON file
        if (fs.existsSync(FILE_PATHS.AWAITING_SELLERS_FILE)) {
            const data = fs.readFileSync(FILE_PATHS.AWAITING_SELLERS_FILE, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('Error loading awaiting sellers:', error);
        return [];
    }
}

/**
 * Save incomplete registration sellers data to database
 * @param {Array} incompleteRegSellers - Array of incomplete registration seller objects
 * @returns {Promise<boolean>} - Success status
 */
async function saveIncompleteRegSellersToDb(incompleteRegSellers) {
    try {
        // Save to local JSON file
        fs.writeFileSync(FILE_PATHS.INCOMPLETE_REG_SELLERS_FILE, JSON.stringify(incompleteRegSellers, null, 2));
        console.log('Saved incomplete registration sellers to local JSON file');
        return true;
    } catch (error) {
        console.error('Error saving incomplete registration sellers:', error);
        return false;
    }
}

/**
 * Load incomplete registration sellers from database
 * @returns {Promise<Array>} - Array of incomplete registration seller objects
 */
async function loadIncompleteRegSellers() {
    try {
        // Load from local JSON file
        if (fs.existsSync(FILE_PATHS.INCOMPLETE_REG_SELLERS_FILE)) {
            const data = fs.readFileSync(FILE_PATHS.INCOMPLETE_REG_SELLERS_FILE, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('Error loading incomplete registration sellers:', error);
        return [];
    }
}

/**
 * Save buyers data to database
 * @param {Array} buyers - Array of buyer objects
 * @param {boolean} [skipTempCheck=false] - Skip temporary registration check
 * @returns {Promise<boolean>} - Success status
 */
async function saveBuyersToDb(buyers) {
    try {
        if (isMongoConnected && Buyer) {
            // MongoDB implementation would go here
            console.log('Saving buyers to MongoDB');
            return true;
        } else {
            // Save to local JSON file
            // Note: This function is now only used for saving buyer inquiry data
            // The actual buyer registration data is handled in final.js with temp storage
            fs.writeFileSync(FILE_PATHS.BUYERS_FILE, JSON.stringify(buyers, null, 2));
            console.log('Saved buyers to local JSON file');
            return true;
        }
    } catch (error) {
        console.error('Error saving buyers:', error);
        return false;
    }
}

/**
 * Load buyers from database
 * @returns {Promise<Array>} - Array of buyer objects
 */
async function loadBuyers() {
    try {
        if (isMongoConnected && Buyer) {
            // MongoDB implementation would go here
            console.log('Loading buyers from MongoDB');
            return [];
        } else {
            // Load from local JSON file
            if (fs.existsSync(FILE_PATHS.BUYERS_FILE)) {
                const data = fs.readFileSync(FILE_PATHS.BUYERS_FILE, 'utf8');
                return JSON.parse(data);
            }
            return [];
        }
    } catch (error) {
        console.error('Error loading buyers:', error);
        return [];
    }
}

/**
 * Save seller message map to database
 * @param {Object} sellerMessageMap - Map of seller messages
 * @returns {Promise<boolean>} - Success status
 */
async function saveSellerMessageMapToDb(sellerMessageMap) {
    try {
        if (isMongoConnected && SellerMessage) {
            // MongoDB implementation would go here
            console.log('Saving seller messages to MongoDB');
            return true;
        } else {
            // Save to local JSON file
            fs.writeFileSync(FILE_PATHS.SELLER_MESSAGES_FILE, JSON.stringify(sellerMessageMap, null, 2));
            console.log('Saved seller messages to local JSON file');
            return true;
        }
    } catch (error) {
        console.error('Error saving seller messages:', error);
        return false;
    }
}

/**
 * Load seller message map from database
 * @returns {Promise<Object>} - Map of seller messages
 */
async function loadSellerMessageMap() {
    try {
        if (isMongoConnected && SellerMessage) {
            // MongoDB implementation would go here
            console.log('Loading seller messages from MongoDB');
            return {};
        } else {
            // Load from local JSON file
            if (fs.existsSync(FILE_PATHS.SELLER_MESSAGES_FILE)) {
                const data = fs.readFileSync(FILE_PATHS.SELLER_MESSAGES_FILE, 'utf8');
                return JSON.parse(data);
            }
            return {};
        }
    } catch (error) {
        console.error('Error loading seller messages:', error);
        return {};
    }
}

/**
 * Record a seller's response to a buyer's inquiry
 * @param {string} sellerId - The seller's ID
 * @param {string} buyerId - The buyer's ID
 * @param {string} status - The response status
 * @returns {Promise<boolean>} - Success status
 */
async function recordSellerResponse(sellerId, buyerId, status) {
    try {
        const sellerMessageMap = await loadSellerMessageMap();
        
        if (!sellerMessageMap[sellerId]) {
            sellerMessageMap[sellerId] = {};
        }
        
        sellerMessageMap[sellerId][buyerId] = {
            status,
            timestamp: Date.now()
        };
        
        await saveSellerMessageMapToDb(sellerMessageMap);
        return true;
    } catch (error) {
        console.error('Error recording seller response:', error);
        return false;
    }
}

module.exports = {
    setMongoConnectionStatus,
    saveSellersToDb,
    loadSellers,
    saveAwaitingSellersToDb,
    loadAwaitingSellers,
    saveIncompleteRegSellersToDb,
    loadIncompleteRegSellers,
    saveBuyersToDb,
    loadBuyers,
    saveSellerMessageMapToDb,
    loadSellerMessageMap,
    recordSellerResponse
};