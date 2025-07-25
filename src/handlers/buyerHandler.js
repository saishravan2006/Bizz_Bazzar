// Buyer handler for processing buyer-related messages
const { findBuyerByPhone, createBuyer, updateBuyerStage, saveBuyerInquiry } = require('../models/Buyer');
const { findNearbySellers } = require('../models/Seller');
const { createSession, setSessionData, findSessionByPhone } = require('../models/Session');
const { createSellerMessage } = require('../models/Message');
const { translate } = require('../utils/language');
const { calculateDistance } = require('../utils/geo');
const { saveBuyersToDb } = require('../utils/database');
const { categorizeProductWithAI } = require('../utils/ai');
const { getGroupIdByName } = require('./messageHandler');
const { CATEGORIES, CATEGORY_GROUP_MAP } = require('../config/constants');

/**
 * Handle messages from buyers
 * @param {Object} client - The WhatsApp client instance
 * @param {Object} message - The incoming message object
 * @param {string} phone - The sender's phone number
 * @param {Array} sellers - Array of verified sellers
 * @param {Array} buyers - Array of buyers
 * @param {Object} sessions - Map of active sessions
 * @param {Object} sellerMessageMap - Map of seller messages
 * @param {Object} reminderTimers - Map of reminder timers
 * @returns {Promise<Object>} - Updated data objects
 */
async function handleBuyerMessage(client, message, phone, sellers, buyers, sessions, sellerMessageMap, reminderTimers) {
    try {
        // Find or create buyer
        let buyer = findBuyerByPhone(buyers, phone);
        if (!buyer) {
            buyer = createBuyer(phone);
            buyers.push(buyer);
        }
        
        // Get or create session
        let session = findSessionByPhone(sessions, phone);
        if (!session) {
            session = createSession(phone, 'buyer');
            sessions[phone] = session;
        }
        
        // Handle buyer inquiry based on stage
        const stage = buyer.stage;
        
        switch (stage) {
            case 'category':
                return await handleCategorySelection(client, message, buyer, buyers, sessions);
                
            case 'product':
                return await handleProductDescription(client, message, buyer, buyers, sessions);
                
            case 'location':
                return await handleLocationSharing(client, message, buyer, buyers, sellers, sessions, sellerMessageMap, reminderTimers);
                
            case 'done':
                return await handleNewInquiry(client, message, buyer, buyers, sessions);
                
            default:
                // Reset to category stage if unknown stage
                buyer.stage = 'category';
                await saveBuyersToDb(buyers);
                return await handleCategorySelection(client, message, buyer, buyers, sessions);
        }
    } catch (error) {
        console.error('Error handling buyer message:', error);
        return { sellers, buyers, sessions, sellerMessageMap, reminderTimers };
    }
}

/**
 * Handle category selection stage
 * @param {Object} client - The WhatsApp client instance
 * @param {Object} message - The incoming message object
 * @param {Object} buyer - The buyer object
 * @param {Array} buyers - Array of buyers
 * @param {Object} sessions - Map of active sessions
 * @returns {Promise<Object>} - Updated data objects
 */
async function handleCategorySelection(client, message, buyer, buyers, sessions) {
    // If this is the first message, send category options
    if (!message.body.match(/^\d+$/)) {
        await client.sendMessage(message.from, 
            'Welcome to *Bizz Bazzar*! 🛍️\n\n' +
            'What type of product are you looking for? Please select a category:\n\n' +
            getBuyerCategoryOptionsText());
        return { buyers, sessions };
    }
    
    // Process category selection
    const categoryKey = message.body.trim();
    if (CATEGORIES[categoryKey]) {
        // Update buyer with selected category
        const updatedBuyer = updateBuyerStage(buyer, 'product', CATEGORIES[categoryKey]);
        
        // Update in buyers array
        const index = buyers.findIndex(b => b.phone === buyer.phone);
        if (index !== -1) {
            buyers[index] = updatedBuyer;
            await saveBuyersToDb(buyers);
        }
        
        // Ask for product description
        await client.sendMessage(message.from, 
            `Great! You selected ${CATEGORIES[categoryKey].replace(/_/g, ' ')}.\n\n` +
            'Please describe the specific product you are looking for:');
    } else {
        // Invalid category selection
        await client.sendMessage(message.from, 
            'Please select a valid category number from the list:\n\n' +
            getBuyerCategoryOptionsText());
    }
    
    return { buyers, sessions };
}

/**
 * Handle product description stage
 * @param {Object} client - The WhatsApp client instance
 * @param {Object} message - The incoming message object
 * @param {Object} buyer - The buyer object
 * @param {Array} buyers - Array of buyers
 * @param {Object} sessions - Map of active sessions
 * @returns {Promise<Object>} - Updated data objects
 */
async function handleProductDescription(client, message, buyer, buyers, sessions) {
    // Get product description from message
    const productDescription = message.body.trim();
    
    if (productDescription.length < 3) {
        await client.sendMessage(message.from, 
            'Please provide a more detailed description of the product you are looking for:');
        return { buyers, sessions };
    }
    
    // Update buyer with product description
    const updatedBuyer = updateBuyerStage(buyer, 'location', productDescription);
    
    // Update in buyers array
    const index = buyers.findIndex(b => b.phone === buyer.phone);
    if (index !== -1) {
        buyers[index] = updatedBuyer;
        await saveBuyersToDb(buyers);
    }
    
    // Ask for location
    await client.sendMessage(message.from, 
        'Thank you! To find sellers near you, please share your location using WhatsApp\'s location sharing feature.\n\n' +
        'Tap the + icon and select Location.');
    
    return { buyers, sessions };
}

/**
 * Handle location sharing stage
 * @param {Object} client - The WhatsApp client instance
 * @param {Object} message - The incoming message object
 * @param {Object} buyer - The buyer object
 * @param {Array} buyers - Array of buyers
 * @param {Array} sellers - Array of verified sellers
 * @param {Object} sessions - Map of active sessions
 * @param {Object} sellerMessageMap - Map of seller messages
 * @param {Object} reminderTimers - Map of reminder timers
 * @returns {Promise<Object>} - Updated data objects
 */
async function handleLocationSharing(client, message, buyer, buyers, sellers, sessions, sellerMessageMap, reminderTimers) {
    // Check if the message contains location data
    if (!message.location) {
        await client.sendMessage(message.from, 
            'Please share your location using WhatsApp\'s location sharing feature.\n\n' +
            'Tap the + icon and select Location.');
        return { buyers, sessions, sellerMessageMap, reminderTimers };
    }
    
    // Get location from message
    const location = {
        latitude: message.location.latitude,
        longitude: message.location.longitude
    };
    
    // Get product category and description from buyer
    const category = buyer.currentInquiry.category;
    const productDescription = buyer.currentInquiry.product;
    
    // Find nearby sellers
    const nearbySellers = findNearbySellers(sellers, category, location, calculateDistance);
    
    // Update buyer with location and mark as done
    const updatedBuyer = updateBuyerStage(buyer, 'done', location);
    
    // Update in buyers array
    const index = buyers.findIndex(b => b.phone === buyer.phone);
    if (index !== -1) {
        buyers[index] = updatedBuyer;
        await saveBuyersToDb(buyers);
    }
    
    // Send response to buyer
    if (nearbySellers.length > 0) {
        await client.sendMessage(message.from, 
            `We found ${nearbySellers.length} sellers near you for ${productDescription}!\n\n` +
            'We are notifying them about your request. You will receive updates when sellers respond.');
        
        // Notify sellers in the appropriate category group
        await notifySellers(client, category, productDescription, location, buyer.phone, nearbySellers, sellerMessageMap, reminderTimers);
    } else {
        await client.sendMessage(message.from, 
            `We couldn't find any sellers near you for ${productDescription}.\n\n` +
            'We will keep looking and notify you if we find any sellers.');
    }
    
    return { buyers, sessions, sellerMessageMap, reminderTimers };
}

/**
 * Handle new inquiry after completing a previous one
 * @param {Object} client - The WhatsApp client instance
 * @param {Object} message - The incoming message object
 * @param {Object} buyer - The buyer object
 * @param {Array} buyers - Array of buyers
 * @param {Object} sessions - Map of active sessions
 * @returns {Promise<Object>} - Updated data objects
 */
async function handleNewInquiry(client, message, buyer, buyers, sessions) {
    // Check if the message indicates a new inquiry
    const messageContent = message.body.toLowerCase();
    if (messageContent.includes('new') || messageContent.includes('another') || messageContent.includes('search') || messageContent.includes('looking')) {
        // Reset buyer to category stage for a new inquiry
        const updatedBuyer = { ...buyer, stage: 'category' };
        
        // Update in buyers array
        const index = buyers.findIndex(b => b.phone === buyer.phone);
        if (index !== -1) {
            buyers[index] = updatedBuyer;
            await saveBuyersToDb(buyers);
        }
        
        // Send category options for new inquiry
        await client.sendMessage(message.from, 
            'Let\'s start a new search! What type of product are you looking for? Please select a category:\n\n' +
            getBuyerCategoryOptionsText());
    } else {
        // Generic response for other messages
        await client.sendMessage(message.from, 
            'If you want to search for another product, just let me know by saying "new search" or "looking for something".');
    }
    
    return { buyers, sessions };
}

/**
 * Notify sellers about a buyer's inquiry
 * @param {Object} client - The WhatsApp client instance
 * @param {string} category - The product category
 * @param {string} productDescription - The product description
 * @param {Object} buyerLocation - The buyer's location
 * @param {string} buyerPhone - The buyer's phone number
 * @param {Array} nearbySellers - Array of nearby sellers
 * @param {Object} sellerMessageMap - Map of seller messages
 * @param {Object} reminderTimers - Map of reminder timers
 * @returns {Promise<void>}
 */
async function notifySellers(client, category, productDescription, buyerLocation, buyerPhone, nearbySellers, sellerMessageMap, reminderTimers) {
    try {
        // Get the appropriate group ID for the category
        const groupId = CATEGORY_GROUP_MAP[category];
        if (!groupId) {
            console.error(`No group found for category: ${category}`);
            return;
        }
        
        // Format the message for the group
        const sellerNames = nearbySellers.map(seller => 
            `${seller.name} (${seller.businessName}) - ${seller.distance} km`
        ).join('\n');
        
        const groupMessage = 
            `🔔 NEW BUYER REQUEST 🔔\n\n` +
            `Product: ${productDescription}\n\n` +
            `Nearby Sellers:\n${sellerNames}\n\n` +
            `Sellers, please reply to this message with "Yes" if you have this product available, or "No" if you don't.`;
        
        // Send the message to the group
        const sentMsg = await client.sendMessage(groupId, groupMessage);
        
        // Record the message for each seller
        nearbySellers.forEach(seller => {
            // Initialize seller in the message map if not exists
            if (!sellerMessageMap[seller.phone]) {
                sellerMessageMap[seller.phone] = {};
            }
            
            // Create a seller message record
            sellerMessageMap[seller.phone][buyerPhone] = createSellerMessage(
                seller.phone,
                buyerPhone,
                sentMsg.id._serialized,
                groupId,
                productDescription,
                buyerLocation
            );
            
            // Schedule a reminder for this seller
            scheduleReminder(client, seller, buyerPhone, productDescription, reminderTimers);
        });
    } catch (error) {
        console.error('Error notifying sellers:', error);
    }
}

/**
 * Schedule a reminder for a seller to respond to a buyer inquiry
 * @param {Object} client - The WhatsApp client instance
 * @param {Object} seller - The seller object
 * @param {string} buyerPhone - The buyer's phone number
 * @param {string} productDescription - The product description
 * @param {Object} reminderTimers - Map of reminder timers
 */
function scheduleReminder(client, seller, buyerPhone, productDescription, reminderTimers) {
    // Set a reminder for 1 hour
    const reminderId = `${seller.phone}_${buyerPhone}`;
    const reminderTime = 60 * 60 * 1000; // 1 hour in milliseconds
    
    // Clear any existing reminder
    if (reminderTimers[reminderId]) {
        clearTimeout(reminderTimers[reminderId]);
    }
    
    // Set new reminder
    reminderTimers[reminderId] = setTimeout(async () => {
        try {
            // Send reminder to seller
            await client.sendMessage(`${seller.phone}@c.us`, 
                `Reminder: A buyer is looking for ${productDescription}. Please check your category group and respond if you have this product available.`);
            
            // Mark reminder as sent in the seller message map
            if (sellerMessageMap[seller.phone] && sellerMessageMap[seller.phone][buyerPhone]) {
                sellerMessageMap[seller.phone][buyerPhone].reminderSent = true;
            }
        } catch (error) {
            console.error('Error sending reminder:', error);
        }
    }, reminderTime);
}

/**
 * Get formatted text for buyer category options
 * @returns {string} - Formatted category options text
 */
function getBuyerCategoryOptionsText() {
    return Object.entries(CATEGORIES)
        .map(([key, value]) => `${key}: ${value.replace(/_/g, ' ')}`)
        .join('\n');
}

/**
 * Categorize a product using AI or manual selection
 * @param {string} productDescription - The product description
 * @returns {Promise<string>} - The category key
 */
async function categorizeProduct(productDescription) {
    try {
        // Use AI to categorize the product
        return await categorizeProductWithAI(productDescription, CATEGORIES);
    } catch (error) {
        console.error('Error categorizing product:', error);
        return '15'; // Default to category 15 (electricals) on error
    }
}

module.exports = {
    handleBuyerMessage,
    getBuyerCategoryOptionsText,
    categorizeProduct
};