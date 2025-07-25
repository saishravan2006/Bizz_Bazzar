// WhatsApp client initialization and event handling
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Import utilities and services
const { ensureDirectoriesExist } = require('./utils/fileSystem');
const { cleanupIncompleteRegistrations } = require('./services/cleanupService');
const { loadData } = require('./services/dataService');
const { saveIncompleteRegSellersToDb } = require('./utils/database');
const { handleMessage } = require('./handlers/messageHandler');

/**
 * Initialize the WhatsApp client with proper configuration
 * @returns {Promise<Object>} The initialized client and data objects
 */
async function initializeClient() {
    // Initialize in-memory data stores
    let sellers = [];
    let awaitingSellers = [];
    let incompleteRegSellers = [];
    let buyers = [];
    let sessions = {};
    let sellerMessageMap = {};
    let reminderTimers = {};

    // Create a new WhatsApp client instance
    const client = new Client({
        authStrategy: new LocalAuth({ clientId: 'whatsapp-bot' }),
        puppeteer: { 
            headless: false, 
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ],
            defaultViewport: null
        },
        webVersionCache: {
            type: 'local'
        },
        webVersion: '2.3000.0'
    });

    // Set up event handlers
    client.on('qr', qr => qrcode.generate(qr, { small: true }));
    
    client.on('authenticated', () => console.log('✅ AUTHENTICATED'));
    
    client.on('ready', async () => {
        console.log('✅ CLIENT IS READY');
        
        // Load existing data
        const data = await loadData();
        sellers = data.sellers;
        awaitingSellers = data.awaitingSellers;
        incompleteRegSellers = data.incompleteRegSellers;
        buyers = data.buyers;
        sellerMessageMap = data.sellerMessageMap;

        // Ensure necessary directories exist
        ensureDirectoriesExist();

        // Clean up incomplete registrations
        incompleteRegSellers = await cleanupIncompleteRegistrations(incompleteRegSellers, saveIncompleteRegSellersToDb);

        console.log(`Loaded ${sellers.length} sellers, ${buyers.length} buyers`);
    });

    // Set up message handler
    client.on('message', async (message) => {
        const result = await handleMessage(
            client, message, sellers, awaitingSellers, incompleteRegSellers,
            buyers, sessions, sellerMessageMap, reminderTimers
        );

        // Update data stores with the result
        if (result.sellers) sellers = result.sellers;
        if (result.awaitingSellers) awaitingSellers = result.awaitingSellers;
        if (result.incompleteRegSellers) incompleteRegSellers = result.incompleteRegSellers;
        if (result.buyers) buyers = result.buyers;
        if (result.sessions) sessions = result.sessions;
        if (result.sellerMessageMap) sellerMessageMap = result.sellerMessageMap;
        if (result.reminderTimers) reminderTimers = result.reminderTimers;
    });

    // Initialize the client
    await client.initialize();
    
    return {
        client,
        data: {
            sellers,
            awaitingSellers,
            incompleteRegSellers,
            buyers,
            sessions,
            sellerMessageMap,
            reminderTimers
        }
    };
}

module.exports = {
    initializeClient
};