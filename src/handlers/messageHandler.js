// Message handler for processing incoming WhatsApp messages
const { findSellerByPhone } = require('../models/Seller');
const { findBuyerByPhone } = require('../models/Buyer');
const { findSessionByPhone } = require('../models/Session');
const sellerHandler = require('./sellerHandler');
const buyerHandler = require('./buyerHandler');
const { translate } = require('../utils/language');

/**
 * Process an incoming WhatsApp message
 * @param {Object} client - The WhatsApp client instance
 * @param {Object} message - The incoming message object
 * @param {Array} sellers - Array of verified sellers
 * @param {Array} awaitingSellers - Array of awaiting sellers
 * @param {Array} incompleteRegSellers - Array of incomplete registration sellers
 * @param {Array} buyers - Array of buyers
 * @param {Object} sessions - Map of active sessions
 * @param {Object} sellerMessageMap - Map of seller messages
 * @param {Object} reminderTimers - Map of reminder timers
 * @returns {Promise<Object>} - Updated data objects
 */
async function handleMessage(client, message, sellers, awaitingSellers, incompleteRegSellers, buyers, sessions, sellerMessageMap, reminderTimers) {
    try {
        // Skip system messages and messages without proper chat
        if (message.isStatus || !message.from) {
            return { sellers, awaitingSellers, incompleteRegSellers, buyers, sessions, sellerMessageMap, reminderTimers };
        }

        // Get the sender's phone number
        const sender = message.from;
        const isGroup = sender.includes('@g.us');

        // Skip group messages unless they are quoted replies
        if (isGroup && !isQuotedReply(message)) {
            return { sellers, awaitingSellers, incompleteRegSellers, buyers, sessions, sellerMessageMap, reminderTimers };
        }

        // Handle quoted replies in groups (seller responses)
        if (isGroup && isQuotedReply(message)) {
            return await sellerHandler.handleSellerResponse(
                client, message, sellers, buyers, sellerMessageMap, reminderTimers
            );
        }

        // Extract the phone number without the @c.us suffix
        const phone = sender.split('@')[0];

        // Check if the sender is a seller
        const sellerInfo = findSellerByPhone(sellers, awaitingSellers, incompleteRegSellers, phone);
        
        // Check if the sender is a buyer
        const buyer = findBuyerByPhone(buyers, phone);
        
        // Check if there's an active session
        const session = findSessionByPhone(sessions, phone);

        // Determine if this is a seller or buyer based on existing data or session
        let isSeller = false;
        
        if (sellerInfo) {
            isSeller = true;
        } else if (session) {
            isSeller = session.type === 'seller';
        } else if (!buyer) {
            // New user - check message content for seller registration intent
            const messageContent = message.body.toLowerCase();
            isSeller = messageContent.includes('register') || 
                      messageContent.includes('seller') || 
                      messageContent.includes('sell') || 
                      messageContent.includes('business');
        }

        // Handle the message based on user type
        if (isSeller) {
            return await sellerHandler.handleSellerMessage(
                client, message, phone, sellers, awaitingSellers, incompleteRegSellers, sessions
            );
        } else {
            return await buyerHandler.handleBuyerMessage(
                client, message, phone, sellers, buyers, sessions, sellerMessageMap, reminderTimers
            );
        }
    } catch (error) {
        console.error('Error handling message:', error);
        return { sellers, awaitingSellers, incompleteRegSellers, buyers, sessions, sellerMessageMap, reminderTimers };
    }
}

/**
 * Check if a message is a quoted reply
 * @param {Object} message - The message object
 * @returns {boolean} - True if the message is a quoted reply
 */
function isQuotedReply(message) {
    return message.hasQuotedMsg;
}

/**
 * Get the group ID by name
 * @param {Object} client - The WhatsApp client instance
 * @param {string} groupName - The name of the group
 * @returns {Promise<string|null>} - The group ID or null if not found
 */
async function getGroupIdByName(client, groupName) {
    try {
        const chats = await client.getChats();
        const group = chats.find(chat => 
            chat.isGroup && chat.name.toLowerCase().includes(groupName.toLowerCase())
        );
        return group ? group.id._serialized : null;
    } catch (error) {
        console.error('Error getting group ID:', error);
        return null;
    }
}

module.exports = {
    handleMessage,
    isQuotedReply,
    getGroupIdByName
};