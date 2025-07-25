// Seller handler for processing seller-related messages
const { findSellerByPhone, createIncompleteSellerRegistration, updateSellerStage, createSeller } = require('../models/Seller');
const { createSession, setSessionData, findSessionByPhone } = require('../models/Session');
const { updateMessageStatus } = require('../models/Message');
const { translate } = require('../utils/language');
const { recordSellerResponse, saveSellersToDb, saveAwaitingSellersToDb, saveIncompleteRegSellersToDb } = require('../utils/database');
const { CATEGORIES } = require('../config/constants');

/**
 * Handle messages from sellers
 * @param {Object} client - The WhatsApp client instance
 * @param {Object} message - The incoming message object
 * @param {string} phone - The sender's phone number
 * @param {Array} sellers - Array of verified sellers
 * @param {Array} awaitingSellers - Array of awaiting sellers
 * @param {Array} incompleteRegSellers - Array of incomplete registration sellers
 * @param {Object} sessions - Map of active sessions
 * @returns {Promise<Object>} - Updated data objects
 */
async function handleSellerMessage(client, message, phone, sellers, awaitingSellers, incompleteRegSellers, sessions) {
    try {
        // Find seller in all collections
        const sellerInfo = findSellerByPhone(sellers, awaitingSellers, incompleteRegSellers, phone);
        
        // Get or create session
        let session = findSessionByPhone(sessions, phone);
        if (!session) {
            session = createSession(phone, 'seller');
            sessions[phone] = session;
        }
        
        // Handle seller registration or commands
        if (!sellerInfo) {
            // New seller registration
            return await handleNewSellerRegistration(client, message, phone, incompleteRegSellers, sessions);
        } else {
            // Existing seller
            return await handleExistingSellerMessage(client, message, sellerInfo, sellers, awaitingSellers, incompleteRegSellers, sessions);
        }
    } catch (error) {
        console.error('Error handling seller message:', error);
        return { sellers, awaitingSellers, incompleteRegSellers, sessions };
    }
}

/**
 * Handle a new seller registration
 * @param {Object} client - The WhatsApp client instance
 * @param {Object} message - The incoming message object
 * @param {string} phone - The sender's phone number
 * @param {Array} incompleteRegSellers - Array of incomplete registration sellers
 * @param {Object} sessions - Map of active sessions
 * @returns {Promise<Object>} - Updated data objects
 */
async function handleNewSellerRegistration(client, message, phone, incompleteRegSellers, sessions) {
    // Create a new incomplete seller registration
    const newSeller = createIncompleteSellerRegistration(phone);
    incompleteRegSellers.push(newSeller);
    
    // Save to database
    await saveIncompleteRegSellersToDb(incompleteRegSellers);
    
    // Send welcome message and ask for name
    await client.sendMessage(message.from, 
        'Welcome to *Bizz Bazzar*! 🛍️\n\n' +
        'Let\'s register you as a seller. Please provide the following information:\n\n' +
        '1. What is your full name?');
    
    return { incompleteRegSellers, sessions };
}

/**
 * Handle messages from existing sellers
 * @param {Object} client - The WhatsApp client instance
 * @param {Object} message - The incoming message object
 * @param {Object} sellerInfo - The seller information
 * @param {Array} sellers - Array of verified sellers
 * @param {Array} awaitingSellers - Array of awaiting sellers
 * @param {Array} incompleteRegSellers - Array of incomplete registration sellers
 * @param {Object} sessions - Map of active sessions
 * @returns {Promise<Object>} - Updated data objects
 */
async function handleExistingSellerMessage(client, message, sellerInfo, sellers, awaitingSellers, incompleteRegSellers, sessions) {
    const { seller, collection } = sellerInfo;
    
    // Handle commands for verified sellers
    if (collection === 'verified' && message.body.startsWith('/')) {
        return await handleSellerCommand(client, message, seller, sellers, sessions);
    }
    
    // Handle registration process for incomplete sellers
    if (collection === 'incomplete') {
        return await continueSellerRegistration(client, message, seller, incompleteRegSellers, awaitingSellers, sessions);
    }
    
    // Handle awaiting sellers (completed registration but not verified)
    if (collection === 'awaiting') {
        await client.sendMessage(message.from, 
            'Your seller registration is complete and awaiting verification. ' +
            'You will be notified once your account is verified.');
    }
    
    return { sellers, awaitingSellers, incompleteRegSellers, sessions };
}

/**
 * Continue the seller registration process
 * @param {Object} client - The WhatsApp client instance
 * @param {Object} message - The incoming message object
 * @param {Object} seller - The seller object
 * @param {Array} incompleteRegSellers - Array of incomplete registration sellers
 * @param {Array} awaitingSellers - Array of awaiting sellers
 * @param {Object} sessions - Map of active sessions
 * @returns {Promise<Object>} - Updated data objects
 */
async function continueSellerRegistration(client, message, seller, incompleteRegSellers, awaitingSellers, sessions) {
    // Get the current stage and message content
    const currentStage = seller.stage;
    const messageContent = message.body;
    
    // Update seller based on current stage
    let updatedSeller = { ...seller };
    let nextPrompt = '';
    let moveToNextStage = true;
    
    switch (currentStage) {
        case 'name':
            updatedSeller.name = messageContent;
            updatedSeller.stage = 'business_name';
            nextPrompt = '2. What is your business name?';
            break;
            
        case 'business_name':
            updatedSeller.businessName = messageContent;
            updatedSeller.stage = 'address';
            nextPrompt = '3. What is your business address?';
            break;
            
        case 'address':
            updatedSeller.address = messageContent;
            updatedSeller.stage = 'location';
            nextPrompt = '4. Please share your business location (use the location sharing feature in WhatsApp).';
            break;
            
        case 'location':
            // Check if the message contains location data
            if (message.location) {
                updatedSeller.location = {
                    latitude: message.location.latitude,
                    longitude: message.location.longitude
                };
                updatedSeller.stage = 'category';
                nextPrompt = '5. Please select your business category:\n\n' + getCategoryOptionsText();
            } else {
                moveToNextStage = false;
                nextPrompt = 'Please share your location using WhatsApp\'s location sharing feature. Tap the + icon and select Location.';
            }
            break;
            
        case 'category':
            // Validate category selection
            const categoryKey = messageContent.trim();
            if (CATEGORIES[categoryKey]) {
                updatedSeller.category = CATEGORIES[categoryKey];
                updatedSeller.stage = 'done';
                
                // Move from incomplete to awaiting verification
                const completedSeller = createSeller(
                    updatedSeller.phone,
                    updatedSeller.name,
                    updatedSeller.businessName,
                    updatedSeller.address,
                    updatedSeller.location,
                    updatedSeller.category
                );
                
                // Remove from incomplete and add to awaiting
                const index = incompleteRegSellers.findIndex(s => s.phone === seller.phone);
                if (index !== -1) {
                    incompleteRegSellers.splice(index, 1);
                }
                awaitingSellers.push(completedSeller);
                
                // Save changes to database
                await saveIncompleteRegSellersToDb(incompleteRegSellers);
                await saveAwaitingSellersToDb(awaitingSellers);
                
                nextPrompt = 'Thank you! Your seller registration is complete and awaiting verification. ' +
                            'You will be notified once your account is verified.';
            } else {
                moveToNextStage = false;
                nextPrompt = 'Please select a valid category number from the list:\n\n' + getCategoryOptionsText();
            }
            break;
    }
    
    // Update the seller in the appropriate collection
    if (moveToNextStage) {
        const index = incompleteRegSellers.findIndex(s => s.phone === seller.phone);
        if (index !== -1 && updatedSeller.stage !== 'done') {
            incompleteRegSellers[index] = updatedSeller;
            await saveIncompleteRegSellersToDb(incompleteRegSellers);
        }
    }
    
    // Send the next prompt
    await client.sendMessage(message.from, nextPrompt);
    
    return { incompleteRegSellers, awaitingSellers, sessions };
}

/**
 * Handle seller commands
 * @param {Object} client - The WhatsApp client instance
 * @param {Object} message - The incoming message object
 * @param {Object} seller - The seller object
 * @param {Array} sellers - Array of verified sellers
 * @param {Object} sessions - Map of active sessions
 * @returns {Promise<Object>} - Updated data objects
 */
async function handleSellerCommand(client, message, seller, sellers, sessions) {
    const command = message.body.toLowerCase();
    
    switch (command) {
        case '/help':
            await client.sendMessage(message.from, 
                'Available commands:\n\n' +
                '/help - Show this help message\n' +
                '/profile - View your seller profile\n' +
                '/update - Update your seller information');
            break;
            
        case '/profile':
            await client.sendMessage(message.from, 
                'Your Seller Profile:\n\n' +
                `Name: ${seller.name}\n` +
                `Business: ${seller.businessName}\n` +
                `Address: ${seller.address}\n` +
                `Category: ${seller.category}\n` +
                `Verified: ${seller.verified ? 'Yes' : 'No'}\n` +
                `Registration Date: ${new Date(seller.registrationDate).toLocaleDateString()}`);
            break;
            
        case '/update':
            // Start the update process
            sessions[seller.phone] = setSessionData(sessions[seller.phone], 'updating', true);
            await client.sendMessage(message.from, 
                'What would you like to update?\n\n' +
                '1. Business Name\n' +
                '2. Address\n' +
                '3. Location\n' +
                '4. Category\n\n' +
                'Reply with the number of your choice.');
            break;
            
        default:
            // Check if we're in the middle of an update process
            const session = sessions[seller.phone];
            if (session && session.data && session.data.updating) {
                return await handleSellerUpdate(client, message, seller, sellers, sessions);
            } else {
                await client.sendMessage(message.from, 
                    'Unknown command. Type /help to see available commands.');
            }
    }
    
    return { sellers, sessions };
}

/**
 * Handle seller profile updates
 * @param {Object} client - The WhatsApp client instance
 * @param {Object} message - The incoming message object
 * @param {Object} seller - The seller object
 * @param {Array} sellers - Array of verified sellers
 * @param {Object} sessions - Map of active sessions
 * @returns {Promise<Object>} - Updated data objects
 */
async function handleSellerUpdate(client, message, seller, sellers, sessions) {
    const session = sessions[seller.phone];
    const messageContent = message.body;
    
    // If we haven't selected what to update yet
    if (!session.data.updateField) {
        const choice = messageContent.trim();
        let updateField = '';
        let prompt = '';
        
        switch (choice) {
            case '1':
                updateField = 'businessName';
                prompt = 'Please enter your new business name:';
                break;
            case '2':
                updateField = 'address';
                prompt = 'Please enter your new address:';
                break;
            case '3':
                updateField = 'location';
                prompt = 'Please share your new location using WhatsApp\'s location sharing feature.';
                break;
            case '4':
                updateField = 'category';
                prompt = 'Please select your new business category:\n\n' + getCategoryOptionsText();
                break;
            default:
                await client.sendMessage(message.from, 
                    'Invalid choice. Please reply with a number from 1 to 4.');
                return { sellers, sessions };
        }
        
        // Update session with the field to update
        sessions[seller.phone] = setSessionData(session, 'updateField', updateField);
        await client.sendMessage(message.from, prompt);
    } else {
        // We know what to update, now get the new value
        const updateField = session.data.updateField;
        let updatedSeller = { ...seller };
        let updateComplete = true;
        
        switch (updateField) {
            case 'businessName':
                updatedSeller.businessName = messageContent;
                break;
            case 'address':
                updatedSeller.address = messageContent;
                break;
            case 'location':
                if (message.location) {
                    updatedSeller.location = {
                        latitude: message.location.latitude,
                        longitude: message.location.longitude
                    };
                } else {
                    await client.sendMessage(message.from, 
                        'Please share your location using WhatsApp\'s location sharing feature. Tap the + icon and select Location.');
                    updateComplete = false;
                }
                break;
            case 'category':
                const categoryKey = messageContent.trim();
                if (CATEGORIES[categoryKey]) {
                    updatedSeller.category = CATEGORIES[categoryKey];
                } else {
                    await client.sendMessage(message.from, 
                        'Please select a valid category number from the list:\n\n' + getCategoryOptionsText());
                    updateComplete = false;
                }
                break;
        }
        
        if (updateComplete) {
            // Update the seller in the sellers array
            const index = sellers.findIndex(s => s.phone === seller.phone);
            if (index !== -1) {
                sellers[index] = updatedSeller;
                await saveSellersToDb(sellers);
            }
            
            // Clear the update session data
            delete session.data.updating;
            delete session.data.updateField;
            
            await client.sendMessage(message.from, 
                'Your profile has been updated successfully!');
        }
    }
    
    return { sellers, sessions };
}

/**
 * Handle seller responses to buyer inquiries
 * @param {Object} client - The WhatsApp client instance
 * @param {Object} message - The incoming message object
 * @param {Array} sellers - Array of verified sellers
 * @param {Array} buyers - Array of buyers
 * @param {Object} sellerMessageMap - Map of seller messages
 * @param {Object} reminderTimers - Map of reminder timers
 * @returns {Promise<Object>} - Updated data objects
 */
async function handleSellerResponse(client, message, sellers, buyers, sellerMessageMap, reminderTimers) {
    try {
        // Get the quoted message
        const quotedMsg = await message.getQuotedMessage();
        if (!quotedMsg) {
            return { sellers, buyers, sellerMessageMap, reminderTimers };
        }
        
        // Extract seller phone from the group participant
        const participant = message.author || message.from;
        const sellerPhone = participant.split('@')[0];
        
        // Find the seller
        const seller = sellers.find(s => s.phone === sellerPhone);
        if (!seller) {
            return { sellers, buyers, sellerMessageMap, reminderTimers };
        }
        
        // Check if this is a response to a buyer inquiry
        const messageContent = message.body.toLowerCase();
        let status = '';
        
        if (messageContent.includes('yes') || messageContent.includes('available') || messageContent.includes('have')) {
            status = 'accepted';
        } else if (messageContent.includes('no') || messageContent.includes('not available') || messageContent.includes('don\'t have')) {
            status = 'rejected';
        } else {
            // Not a clear response
            return { sellers, buyers, sellerMessageMap, reminderTimers };
        }
        
        // Find the buyer ID from the quoted message
        // This would require storing the message ID when sending to the group
        // For now, we'll assume we can extract it from the quoted message somehow
        const buyerInfo = extractBuyerInfoFromQuotedMessage(quotedMsg);
        if (!buyerInfo) {
            return { sellers, buyers, sellerMessageMap, reminderTimers };
        }
        
        // Record the seller's response
        await recordSellerResponse(sellerPhone, buyerInfo.buyerId, status);
        
        // Update the seller message map
        if (sellerMessageMap[sellerPhone] && sellerMessageMap[sellerPhone][buyerInfo.buyerId]) {
            sellerMessageMap[sellerPhone][buyerInfo.buyerId] = updateMessageStatus(
                sellerMessageMap[sellerPhone][buyerInfo.buyerId],
                status
            );
            
            // Clear any reminder timer for this message
            if (reminderTimers[`${sellerPhone}_${buyerInfo.buyerId}`]) {
                clearTimeout(reminderTimers[`${sellerPhone}_${buyerInfo.buyerId}`]);
                delete reminderTimers[`${sellerPhone}_${buyerInfo.buyerId}`];
            }
        }
        
        // Notify the buyer of the seller's response
        const buyer = buyers.find(b => b.phone === buyerInfo.buyerId);
        if (buyer) {
            const responseMessage = status === 'accepted' ?
                `Good news! A seller (${seller.businessName}) has confirmed they have the product you were looking for.\n\nThey will contact you shortly.` :
                `A seller (${seller.businessName}) has informed us they don't have the product you were looking for.\n\nWe'll continue looking for other sellers.`;
            
            await client.sendMessage(`${buyerInfo.buyerId}@c.us`, responseMessage);
        }
        
        return { sellers, buyers, sellerMessageMap, reminderTimers };
    } catch (error) {
        console.error('Error handling seller response:', error);
        return { sellers, buyers, sellerMessageMap, reminderTimers };
    }
}

/**
 * Extract buyer information from a quoted message
 * @param {Object} quotedMsg - The quoted message object
 * @returns {Object|null} - The buyer information or null if not found
 */
function extractBuyerInfoFromQuotedMessage(quotedMsg) {
    try {
        // This is a placeholder implementation
        // In a real implementation, you would extract the buyer ID from the quoted message
        // This might involve parsing the message body or using metadata stored in the message
        
        // For now, we'll return null to indicate we couldn't extract the information
        return null;
    } catch (error) {
        console.error('Error extracting buyer info from quoted message:', error);
        return null;
    }
}

/**
 * Get formatted text for category options
 * @returns {string} - Formatted category options text
 */
function getCategoryOptionsText() {
    return Object.entries(CATEGORIES)
        .map(([key, value]) => `${key}: ${value.replace(/_/g, ' ')}`)
        .join('\n');
}

module.exports = {
    handleSellerMessage,
    handleSellerResponse,
    getCategoryOptionsText
};