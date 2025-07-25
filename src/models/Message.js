// Message model for managing seller messages

/**
 * Create a new seller message object
 * @param {string} sellerId - The seller's phone number
 * @param {string} buyerId - The buyer's phone number
 * @param {string} messageId - The WhatsApp message ID
 * @param {string} groupId - The WhatsApp group ID
 * @param {string} product - The product description
 * @param {Object} buyerLocation - The buyer's location
 * @returns {Object} - The seller message object
 */
function createSellerMessage(sellerId, buyerId, messageId, groupId, product, buyerLocation) {
    return {
        sellerId,
        buyerId,
        messageId,
        groupId,
        product,
        buyerLocation,
        timestamp: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours from now
        status: 'pending',
        reminderSent: false
    };
}

/**
 * Update a seller message's status
 * @param {Object} message - The seller message object
 * @param {string} status - The new status ('pending', 'accepted', 'rejected')
 * @returns {Object} - The updated seller message object
 */
function updateMessageStatus(message, status) {
    return {
        ...message,
        status,
        updatedAt: Date.now()
    };
}

/**
 * Mark a seller message as having had a reminder sent
 * @param {Object} message - The seller message object
 * @returns {Object} - The updated seller message object
 */
function markReminderSent(message) {
    return {
        ...message,
        reminderSent: true,
        reminderSentAt: Date.now()
    };
}

/**
 * Check if a seller message has expired
 * @param {Object} message - The seller message object
 * @returns {boolean} - True if the message has expired
 */
function isMessageExpired(message) {
    return Date.now() > message.expiresAt;
}

/**
 * Find messages for a specific seller
 * @param {Object} sellerMessageMap - Map of seller messages
 * @param {string} sellerId - The seller's phone number
 * @returns {Array} - Array of message objects for the seller
 */
function findMessagesForSeller(sellerMessageMap, sellerId) {
    if (!sellerMessageMap[sellerId]) {
        return [];
    }
    
    const messages = [];
    Object.keys(sellerMessageMap[sellerId]).forEach(buyerId => {
        messages.push({
            buyerId,
            ...sellerMessageMap[sellerId][buyerId]
        });
    });
    
    return messages;
}

/**
 * Find expired messages across all sellers
 * @param {Object} sellerMessageMap - Map of seller messages
 * @returns {Array} - Array of expired message objects with seller and buyer IDs
 */
function findExpiredMessages(sellerMessageMap) {
    const expiredMessages = [];
    
    Object.keys(sellerMessageMap).forEach(sellerId => {
        Object.keys(sellerMessageMap[sellerId]).forEach(buyerId => {
            const message = sellerMessageMap[sellerId][buyerId];
            if (isMessageExpired(message)) {
                expiredMessages.push({
                    sellerId,
                    buyerId,
                    ...message
                });
            }
        });
    });
    
    return expiredMessages;
}

/**
 * Remove expired messages from the seller message map
 * @param {Object} sellerMessageMap - Map of seller messages
 * @returns {Object} - The updated seller message map
 */
function removeExpiredMessages(sellerMessageMap) {
    const updatedMap = { ...sellerMessageMap };
    
    Object.keys(updatedMap).forEach(sellerId => {
        Object.keys(updatedMap[sellerId]).forEach(buyerId => {
            const message = updatedMap[sellerId][buyerId];
            if (isMessageExpired(message)) {
                delete updatedMap[sellerId][buyerId];
            }
        });
        
        // Remove seller entry if no messages remain
        if (Object.keys(updatedMap[sellerId]).length === 0) {
            delete updatedMap[sellerId];
        }
    });
    
    return updatedMap;
}

module.exports = {
    createSellerMessage,
    updateMessageStatus,
    markReminderSent,
    isMessageExpired,
    findMessagesForSeller,
    findExpiredMessages,
    removeExpiredMessages
};