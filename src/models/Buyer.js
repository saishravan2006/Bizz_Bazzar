// Buyer model

/**
 * Create a new buyer object
 * @param {string} phone - The buyer's phone number
 * @returns {Object} - The buyer object
 */
function createBuyer(phone) {
    return {
        phone,
        stage: 'category',
        inquiryDate: new Date().toISOString(),
        inquiries: []
    };
}

/**
 * Update a buyer's inquiry stage
 * @param {Object} buyer - The buyer object
 * @param {string} stage - The new inquiry stage
 * @param {*} value - The value for the current stage
 * @returns {Object} - The updated buyer object
 */
function updateBuyerStage(buyer, stage, value) {
    const updatedBuyer = { ...buyer };
    
    // Update the stage
    updatedBuyer.stage = stage;
    
    // Update the corresponding field based on the stage
    switch (buyer.stage) {
        case 'category':
            if (!updatedBuyer.currentInquiry) {
                updatedBuyer.currentInquiry = {};
            }
            updatedBuyer.currentInquiry.category = value;
            break;
        case 'product':
            if (!updatedBuyer.currentInquiry) {
                updatedBuyer.currentInquiry = {};
            }
            updatedBuyer.currentInquiry.product = value;
            break;
        case 'location':
            if (!updatedBuyer.currentInquiry) {
                updatedBuyer.currentInquiry = {};
            }
            updatedBuyer.currentInquiry.location = value;
            break;
        case 'done':
            // Move current inquiry to inquiries array and clear current inquiry
            if (updatedBuyer.currentInquiry) {
                updatedBuyer.inquiries.push({
                    ...updatedBuyer.currentInquiry,
                    timestamp: new Date().toISOString()
                });
                delete updatedBuyer.currentInquiry;
            }
            break;
    }
    
    return updatedBuyer;
}

/**
 * Find a buyer by phone number
 * @param {Array} buyers - Array of buyers
 * @param {string} phone - The phone number to search for
 * @returns {Object|null} - The buyer object or null if not found
 */
function findBuyerByPhone(buyers, phone) {
    return buyers.find(b => b.phone === phone) || null;
}

/**
 * Save a buyer's inquiry data
 * @param {Object} buyer - The buyer object
 * @param {string} category - The product category
 * @param {string} product - The product description
 * @param {Object} location - The buyer's location
 * @returns {Object} - The updated buyer object
 */
function saveBuyerInquiry(buyer, category, product, location) {
    const updatedBuyer = { ...buyer };
    
    // Add the inquiry to the inquiries array
    updatedBuyer.inquiries.push({
        category,
        product,
        location,
        timestamp: new Date().toISOString()
    });
    
    // Reset the stage for a new inquiry
    updatedBuyer.stage = 'category';
    delete updatedBuyer.currentInquiry;
    
    return updatedBuyer;
}

module.exports = {
    createBuyer,
    updateBuyerStage,
    findBuyerByPhone,
    saveBuyerInquiry
};