// Main entry point for Bizz Bazzar
require('dotenv').config();

// Import modules
const { server } = require('../server');
const { initializeClient } = require('./client');
const { cleanupOldSellerMessages } = require('./services/cleanupService');
const { saveAllData } = require('./services/dataService');

// Start the WhatsApp bot
(async () => {
    try {
        console.log('Starting WhatsApp bot...');
        
        // Initialize WhatsApp client and load data
        const { client, data } = await initializeClient();
        
        // Set up periodic cleanup of old seller messages (every hour)
        setInterval(async () => {
            try {
                const updatedData = await cleanupOldSellerMessages(client, data.sellerMessageMap, data.sellers);
                if (updatedData.sellerMessageMap) data.sellerMessageMap = updatedData.sellerMessageMap;
                if (updatedData.sellers) data.sellers = updatedData.sellers;
                
                // Save data after cleanup
                await saveAllData(data);
            } catch (err) {
                console.error('Cleanup error:', err);
            }
        }, 60 * 60 * 1000);
        
        // Set up periodic data saving (every 5 minutes)
        setInterval(async () => {
            try {
                await saveAllData(data);
                console.log('Data saved successfully');
            } catch (err) {
                console.error('Error saving data:', err);
            }
        }, 5 * 60 * 1000);
        
        console.log('WhatsApp bot started successfully!');
    } catch (error) {
        console.error('Failed to initialize WhatsApp bot:', error);
        process.exit(1);
    }
})();