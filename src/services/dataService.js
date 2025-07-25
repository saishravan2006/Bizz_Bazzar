// Data service for handling data loading and saving
const {
    loadSellers,
    loadAwaitingSellers,
    loadIncompleteRegSellers,
    loadBuyers,
    loadSellerMessageMap,
    saveSellersToDb,
    saveAwaitingSellersToDb,
    saveIncompleteRegSellersToDb,
    saveBuyersToDb,
    saveSellerMessageMapToDb
} = require('../utils/database');

/**
 * Load all data from the database
 * @returns {Promise<Object>} - Object containing all loaded data
 */
async function loadData() {
    try {
        console.log('Loading data from database...');
        
        // Load all data in parallel
        const [
            sellers,
            awaitingSellers,
            incompleteRegSellers,
            buyers,
            sellerMessageMap
        ] = await Promise.all([
            loadSellers(),
            loadAwaitingSellers(),
            loadIncompleteRegSellers(),
            loadBuyers(),
            loadSellerMessageMap()
        ]);
        
        console.log(`Loaded ${sellers.length} sellers, ${awaitingSellers.length} awaiting sellers, ` +
                    `${incompleteRegSellers.length} incomplete sellers, ${buyers.length} buyers, ` +
                    `and ${Object.keys(sellerMessageMap).length} seller message entries`);
        
        return {
            sellers,
            awaitingSellers,
            incompleteRegSellers,
            buyers,
            sellerMessageMap
        };
    } catch (error) {
        console.error('Error loading data:', error);
        return {
            sellers: [],
            awaitingSellers: [],
            incompleteRegSellers: [],
            buyers: [],
            sellerMessageMap: {}
        };
    }
}

/**
 * Save all data to the database
 * @param {Object} data - Object containing all data to save
 * @param {Array} data.sellers - Array of verified sellers
 * @param {Array} data.awaitingSellers - Array of awaiting sellers
 * @param {Array} data.incompleteRegSellers - Array of incomplete registration sellers
 * @param {Array} data.buyers - Array of buyers
 * @param {Object} data.sellerMessageMap - Map of seller messages
 * @returns {Promise<boolean>} - Success status
 */
async function saveAllData(data) {
    try {
        console.log('Saving all data to database...');
        
        const {
            sellers = [],
            awaitingSellers = [],
            incompleteRegSellers = [],
            buyers = [],
            sellerMessageMap = {}
        } = data;
        
        // Save all data in parallel
        await Promise.all([
            saveSellersToDb(sellers),
            saveAwaitingSellersToDb(awaitingSellers),
            saveIncompleteRegSellersToDb(incompleteRegSellers),
            saveBuyersToDb(buyers),
            saveSellerMessageMapToDb(sellerMessageMap)
        ]);
        
        console.log('All data saved successfully');
        return true;
    } catch (error) {
        console.error('Error saving all data:', error);
        return false;
    }
}

module.exports = {
    loadData,
    saveAllData
};