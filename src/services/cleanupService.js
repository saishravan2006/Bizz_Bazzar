// Cleanup service for handling periodic cleanup tasks
const { findExpiredMessages, removeExpiredMessages } = require('../models/Message');
const { saveSellerMessageMapToDb } = require('../utils/database');
const { cleanupInactiveSessions } = require('../models/Session');

/**
 * Clean up old seller messages
 * @param {Object} client - The WhatsApp client instance
 * @param {Object} sellerMessageMap - Map of seller messages
 * @param {Array} sellers - Array of sellers
 * @returns {Promise<Object>} - Object containing updated sellerMessageMap and sellers
 */
async function cleanupOldSellerMessages(client, sellerMessageMap, sellers) {
    try {
        // Find expired messages
        const expiredMessages = findExpiredMessages(sellerMessageMap);
        
        // Notify sellers about expired messages
        for (const message of expiredMessages) {
            try {
                await client.sendMessage(`${message.sellerId}@c.us`, 
                    `A buyer inquiry for "${message.product}" has expired. No response was recorded.`);
            } catch (error) {
                console.error(`Error notifying seller ${message.sellerId} about expired message:`, error);
            }
        }
        
        // Remove expired messages from the map
        const updatedMap = removeExpiredMessages(sellerMessageMap);
        
        // Save the updated map to the database
        await saveSellerMessageMapToDb(updatedMap);
        
        console.log(`Cleaned up ${expiredMessages.length} expired seller messages`);
        return { sellerMessageMap: updatedMap, sellers };
    } catch (error) {
        console.error('Error cleaning up old seller messages:', error);
        return { sellerMessageMap, sellers };
    }
}

/**
 * Clean up seller reminder timers
 * @param {Object} reminderTimers - Map of reminder timers
 * @returns {Object} - Updated reminder timers map
 */
function cleanupSellerReminders(reminderTimers) {
    try {
        // Clear all timers
        Object.keys(reminderTimers).forEach(key => {
            clearTimeout(reminderTimers[key]);
        });
        
        console.log(`Cleaned up ${Object.keys(reminderTimers).length} seller reminder timers`);
        return {};
    } catch (error) {
        console.error('Error cleaning up seller reminders:', error);
        return reminderTimers;
    }
}

/**
 * Clean up incomplete seller registrations
 * @param {Array} incompleteRegSellers - Array of incomplete registration sellers
 * @param {Function} saveIncompleteRegSellersToDb - Function to save incomplete registration sellers to database
 * @returns {Promise<Array>} - Updated incomplete registration sellers array
 */
async function cleanupIncompleteRegistrations(incompleteRegSellers, saveIncompleteRegSellersToDb) {
    try {
        // Filter out sellers without a category or not in 'done' stage
        const validSellers = incompleteRegSellers.filter(seller => 
            seller.category && seller.stage === 'done'
        );
        
        // Save the updated array to the database
        if (validSellers.length !== incompleteRegSellers.length) {
            await saveIncompleteRegSellersToDb(validSellers);
            console.log(`Cleaned up ${incompleteRegSellers.length - validSellers.length} incomplete seller registrations`);
        }
        
        return validSellers;
    } catch (error) {
        console.error('Error cleaning up incomplete registrations:', error);
        return incompleteRegSellers;
    }
}

/**
 * Clean up inactive sessions
 * @param {Object} sessions - Map of sessions
 * @param {number} maxInactiveTime - Maximum inactive time in milliseconds
 * @returns {Object} - Updated sessions map
 */
function cleanupInactiveUserSessions(sessions, maxInactiveTime = 30 * 60 * 1000) {
    try {
        const updatedSessions = cleanupInactiveSessions(sessions, maxInactiveTime);
        console.log(`Cleaned up ${Object.keys(sessions).length - Object.keys(updatedSessions).length} inactive sessions`);
        return updatedSessions;
    } catch (error) {
        console.error('Error cleaning up inactive sessions:', error);
        return sessions;
    }
}

module.exports = {
    cleanupOldSellerMessages,
    cleanupSellerReminders,
    cleanupIncompleteRegistrations,
    cleanupInactiveUserSessions
};