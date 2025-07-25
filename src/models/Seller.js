// Seller model

/**
 * Create a new seller object
 * @param {string} phone - The seller's phone number
 * @param {string} name - The seller's name
 * @param {string} businessName - The seller's business name
 * @param {string} address - The seller's address
 * @param {Object} location - The seller's location coordinates
 * @param {string} category - The seller's business category
 * @returns {Object} - The seller object
 */
function createSeller(phone, name, businessName, address, location, category) {
    return {
        phone,
        name,
        businessName,
        address,
        location,
        category,
        registrationDate: new Date().toISOString(),
        stage: 'done',
        verified: false
    };
}

/**
 * Create a new incomplete seller registration
 * @param {string} phone - The seller's phone number
 * @returns {Object} - The incomplete seller registration object
 */
function createIncompleteSellerRegistration(phone) {
    return {
        phone,
        stage: 'name',
        registrationDate: new Date().toISOString(),
        verified: false
    };
}

/**
 * Update a seller's registration stage
 * @param {Object} seller - The seller object
 * @param {string} stage - The new registration stage
 * @param {*} value - The value for the current stage
 * @returns {Object} - The updated seller object
 */
function updateSellerStage(seller, stage, value) {
    const updatedSeller = { ...seller };
    
    // Update the stage
    updatedSeller.stage = stage;
    
    // Update the corresponding field based on the stage
    switch (seller.stage) {
        case 'name':
            updatedSeller.name = value;
            break;
        case 'business_name':
            updatedSeller.businessName = value;
            break;
        case 'address':
            updatedSeller.address = value;
            break;
        case 'location':
            updatedSeller.location = value;
            break;
        case 'category':
            updatedSeller.category = value;
            break;
    }
    
    return updatedSeller;
}

/**
 * Find a seller by phone number in all seller collections
 * @param {Array} sellers - Array of verified sellers
 * @param {Array} awaitingSellers - Array of awaiting sellers
 * @param {Array} incompleteRegSellers - Array of incomplete registration sellers
 * @param {string} phone - The phone number to search for
 * @returns {Object|null} - The seller object or null if not found
 */
function findSellerByPhone(sellers, awaitingSellers, incompleteRegSellers, phone) {
    // Check in verified sellers
    const verifiedSeller = sellers.find(s => s.phone === phone);
    if (verifiedSeller) return { seller: verifiedSeller, collection: 'verified' };
    
    // Check in awaiting sellers
    const awaitingSeller = awaitingSellers.find(s => s.phone === phone);
    if (awaitingSeller) return { seller: awaitingSeller, collection: 'awaiting' };
    
    // Check in incomplete registration sellers
    const incompleteSeller = incompleteRegSellers.find(s => s.phone === phone);
    if (incompleteSeller) return { seller: incompleteSeller, collection: 'incomplete' };
    
    return null;
}

/**
 * Get verified sellers by category
 * @param {Array} sellers - Array of verified sellers
 * @param {string} category - The category to filter by
 * @returns {Array} - Array of sellers in the specified category
 */
function getVerifiedSellersByCategory(sellers, category) {
    return sellers.filter(seller => 
        seller.category === category && seller.verified === true
    );
}

/**
 * Find nearby sellers based on buyer's location and category
 * @param {Array} sellers - Array of verified sellers
 * @param {string} category - The product category
 * @param {Object} buyerLocation - The buyer's location coordinates
 * @param {Function} calculateDistance - Function to calculate distance between coordinates
 * @param {number} maxDistance - Maximum distance in kilometers (optional, defaults to 10)
 * @returns {Array} - Array of nearby sellers with distance information
 */
function findNearbySellers(sellers, category, buyerLocation, calculateDistance, maxDistance = 10) {
    const categorySellers = getVerifiedSellersByCategory(sellers, category);
    
    // Filter sellers by distance and add distance information
    return categorySellers
        .filter(seller => seller.location && seller.location.latitude && seller.location.longitude)
        .map(seller => {
            const distance = calculateDistance(
                buyerLocation.latitude,
                buyerLocation.longitude,
                seller.location.latitude,
                seller.location.longitude
            );
            
            return {
                ...seller,
                distance: parseFloat(distance)
            };
        })
        .filter(seller => seller.distance <= maxDistance)
        .sort((a, b) => a.distance - b.distance);
}

module.exports = {
    createSeller,
    createIncompleteSellerRegistration,
    updateSellerStage,
    findSellerByPhone,
    getVerifiedSellersByCategory,
    findNearbySellers
};