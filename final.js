// Required modules
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const https = require('https');
const path = require('path');
const axios = require('axios');
const { OpenAI } = require('openai');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Render persistent disk path
const PERSISTENT_DIR = '/var/data';

// Import custom modules
const connectDB = require('./config/db');
const { 
  setMongoConnectionStatus, 
  saveSellersToDb, 
  loadSellers, 
  saveBuyersToDb, 
  loadBuyers, 
  saveSellerMessageMapToDb, 
  loadSellerMessageMap,
  recordSellerResponse
} = require('./utils/database');
const { translate, setUserLanguage, getUserLanguage } = require('./utils/language');

// Start the dashboard server
const { server } = require('./server');


// Helper functions to save seller data to different files
async function saveVerifiedSellers() {
  try {
    console.log('💾 Saving verified sellers to sellers.json...');
    console.log('📊 Current sellers object keys:', Object.keys(sellers));
    console.log('📁 Writing to file:', SELLERS_FILE);
    
    // Normalize all 'verified' values to Boolean
    for (const key in sellers) {
        if (sellers.hasOwnProperty(key)) {
            sellers[key].verified = Boolean(sellers[key].verified);
            if (!Array.isArray(sellers[key].additionalCategories)) {
              sellers[key].additionalCategories = [];
            }
        }
    }
    
    await require('fs').promises.writeFile(SELLERS_FILE, JSON.stringify(sellers, null, 2));
    console.log('✅ File written successfully to', SELLERS_FILE);
    console.log('✅ Successfully saved', Object.keys(sellers).length, 'verified sellers');
  } catch (error) {
    console.error('❌ Error saving verified sellers to JSON:', error);
  }
}

async function saveAwaitingSellers() {
  try {
    console.log(`📊 Current awaitingSellers object:`, Object.keys(awaitingSellers));
    console.log(`📁 Writing to file: ${AWAITING_SELLERS_FILE}`);
    
    // Normalize all 'verified' values to Boolean
    for (const key in awaitingSellers) {
        if (awaitingSellers.hasOwnProperty(key)) {
            awaitingSellers[key].verified = Boolean(awaitingSellers[key].verified);
            if (!Array.isArray(awaitingSellers[key].additionalCategories)) {
              awaitingSellers[key].additionalCategories = [];
            }
        }
    }
    await require('fs').promises.writeFile(AWAITING_SELLERS_FILE, JSON.stringify(awaitingSellers, null, 2));
    console.log(`✅ File written successfully to ${AWAITING_SELLERS_FILE}`);
  } catch (error) {
    console.error('❌ Error saving awaiting sellers to JSON:', error);
  }
}

async function saveIncompleteRegSellers() {
  try {
    await require('fs').promises.writeFile(INCOMPLETE_REG_SELLERS_FILE, JSON.stringify(incompleteRegSellers, null, 2));
  } catch (error) {
    console.error('Error saving incomplete registration sellers to JSON:', error);
  }
}

// Legacy function for backward compatibility
async function saveSellerData() {
  await saveVerifiedSellers();
  await saveAwaitingSellers();
  await saveIncompleteRegSellers();
}

// Helper function to save buyers data
async function saveBuyerData() {
  try {
    await require('fs').promises.writeFile(BUYERS_FILE, JSON.stringify(buyers, null, 2));
  } catch (error) {
    console.error('Error saving buyers to JSON:', error);
  }
}

// Function to handle first-time user flow
async function handleFirstTimeUserFlow(client, msg, sender, senderNumber) {
  // Check if this is the first time interaction
  if (!firstTimeInteractions[sender]) {
    // Record first time interaction
    firstTimeInteractions[sender] = {
      timestamp: Date.now(),
      number: senderNumber
    };
    await saveFirstTimeInteractions();
async function showFinalConfirmation(msg, session) {
    const summary = `📦 **Product:** ${session.productName}\n` + 
                    `🏷️ **Brand:** ${session.brand || 'Any'}\n` + 
                    `🔢 **Quantity:** ${session.quantity || 'Not Specified'}\n` + 
                    `📝 **Details:** ${session.requirements || 'None'}\n` + 
                    `📂 **Category:** ${(session.category || 'N/A').toUpperCase()}`;

    const cartMessage = `🛒 **Please confirm your request:**\n` + 
                        `➖➖➖➖➖➖➖➖➖➖\n` + 
                        `${summary}\n` + 
                        `➖➖➖➖➖➖➖➖➖➖\n\n` + 
                        `**1️⃣ Confirm & Find Sellers**\n` + 
                        `**2️⃣ Make a Change**\n\n` + 
                        `👉 Please reply with \`\`\`1\`\`\` or \`\`\`2\`\`\`. You can also type \`\`\`cancel\`\`\` to exit.`;

    return msg.reply(cartMessage);
}
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    // --- New Enhanced Welcome Sequence ---
    await client.sendMessage(sender, '⚡️ Welcome to *Bizz Bazzar*!');
    await delay(2000);

    await client.sendMessage(sender, 'Tired of searching from shop to shop? 🏃‍♂️💨');
    await delay(2000);

    await client.sendMessage(sender, 'I can find products and compare prices in your local stores, instantly! 🛍️✨');
    await delay(3000);

    await client.sendMessage(sender, "*Here's how I help:*\n\n🔎 *FIND ANYTHING*\nFrom special edition chocolates to electronic parts.\n\n🤫 *COMPARE PRICES*\nKnow the cost before you even step out.\n\n✅ *SAVE TIME*\nNo more wasted trips for out-of-stock items.");
    await delay(3000);
    
    await client.sendMessage(sender, "👉 *Ready to start?*\n\n*Just type the* ***NAME OF THE PRODUCT*** *you're looking for!* \n\n(For example: *Figaro Olive Oil* or *Syska LED Bulb*)");
    
    // Mark this user as waiting for product input
    firstTimeInteractions[sender].awaitingProductInput = true;
    await saveFirstTimeInteractions();
    await client.sendMessage(sender, "➡️ *Type the name below* (e.g., \"Harry Potter Kinder Joy\")");
    
    // Mark this user as waiting for product input
    firstTimeInteractions[sender].awaitingProductInput = true;
    await saveFirstTimeInteractions();

  } else {
    // For returning users who haven't completed registration, send a message to type 'start'
    await client.sendMessage(sender, 'Welcome back! Type *"start"* to begin your product search.');
  }
}

// Reusable Distance Calculation

// utils/geo.js (embedded directly)
function calculateDistance(lat1, lon1, lat2, lon2) {
    // Convert latitude and longitude from degrees to radians
    const toRadians = (degrees) => degrees * Math.PI / 180;
    
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    
    return distance.toFixed(1); // Return with 1 decimal place
}

// AI API configuration
const AI_API_KEY = process.env.AI_API_KEY || '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';
const AI_BASE_URL = process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1';

// Function to make AI API calls
async function makeAIRequest(prompt) {
    try {
        // Initialize OpenAI client with proper configuration
        const client = new OpenAI({
            baseURL: AI_BASE_URL.replace('/chat/completions', ''),
            apiKey: AI_API_KEY,
            defaultHeaders: {
                "HTTP-Referer": "bizzbazzar", // Site URL for rankings on openrouter.ai
            "X-Title": "Bizz Bazzar" // Site title for rankings on openrouter.ai
            }
        });
        
        // Create completion using the OpenAI client
        const completion = await client.chat.completions.create({
            model: "deepseek/deepseek-chat-v3-0324:free", // Updated to the model you specified
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 500
        });
        
        // Return in the same format as the axios response
        return {
            choices: [
                {
                    message: {
                        content: completion.choices[0].message.content
                    }
                }
            ]
        };
    } catch (error) {
        console.error('AI API Error:', error.response?.data || error.message || error);
        throw error;
    }
}

// File paths for three-tier seller system - using Render persistent disk
const SELLERS_FILE = path.join(PERSISTENT_DIR, 'sellers.json'); // Verified sellers
const AWAITING_SELLERS_FILE = path.join(PERSISTENT_DIR, 'awaiting_sellers.json'); // Completed but unverified
const INCOMPLETE_REG_SELLERS_FILE = path.join(PERSISTENT_DIR, 'incomplete_reg_sellers.json'); // Cancelled/incomplete
const BUYERS_FILE = path.join(PERSISTENT_DIR, 'buyers.json');
const TEMP_BUYER_REGISTRATIONS_FILE = path.join(PERSISTENT_DIR, 'temp_buyer_registrations.json'); // Temporary buyer registrations
const SELLER_MESSAGES_FILE = path.join(PERSISTENT_DIR, 'seller_messages.json');
const FIRST_TIME_INTERACTION_FILE = path.join(PERSISTENT_DIR, 'first_time_interaction.json'); // First time user interactions

// Connect to MongoDB
// connectDB()
//   .then((conn) => {
//     if (conn) {
//       setMongoConnectionStatus(true);
//       console.log('MongoDB connected for WhatsApp bot');
//     } else {
//       setMongoConnectionStatus(false);
//       console.log('Using local JSON storage for WhatsApp bot');
//     }
//   })
//   .catch((err) => {
//     setMongoConnectionStatus(false);
//     console.error('MongoDB connection error:', err);
//     console.log('Using local JSON storage for WhatsApp bot');
//   });

// Force using local JSON storage only
setMongoConnectionStatus(false);
console.log('Using local JSON storage for WhatsApp bot');

// Initialize data stores for three-tier seller system
let sellers = {}; // Verified sellers
let awaitingSellers = {}; // Completed but unverified sellers
let incompleteRegSellers = {}; // Cancelled/incomplete registrations
let buyers = {};
let buyerSessions = {};
let sellerSessions = {}; // Initialize sellerSessions
let sellerMessageMap = {};
let firstTimeInteractions = {}; // Store first time user interactions

// Track active user sessions to prevent multiple processes
let userSessions = {};

// Helper function to save first time interaction data
async function saveFirstTimeInteractions() {
  try {
    await require('fs').promises.writeFile(FIRST_TIME_INTERACTION_FILE, JSON.stringify(firstTimeInteractions, null, 2));
    console.log('✅ Successfully saved first time interactions data');
  } catch (error) {
    console.error('❌ Error saving first time interactions data:', error);
  }
}

// Helper function to load first time interaction data
async function loadFirstTimeInteractions() {
  try {
    if (fs.existsSync(FIRST_TIME_INTERACTION_FILE)) {
      const data = await require('fs').promises.readFile(FIRST_TIME_INTERACTION_FILE, 'utf8');
      firstTimeInteractions = JSON.parse(data);
      console.log(`✅ Loaded ${Object.keys(firstTimeInteractions).length} first time interactions`);
    } else {
      console.log('⚠️ First time interactions file not found, creating new one');
      firstTimeInteractions = {};
      await saveFirstTimeInteractions();
    }
  } catch (error) {
    console.error('❌ Error loading first time interactions data:', error);
    firstTimeInteractions = {};
  }
}

// Track temporary registrations (in-memory only)
let tempSellerRegistrations = {};
let tempBuyerRegistrations = {};

// Reminder tracker
let reminderTimers = {};

// Function to schedule reminder to seller if no response in X ms
function scheduleReminder(sellerId, delayMs = 2 * 60 * 60 * 1000) { // Default: 2 hours
    if (reminderTimers[sellerId]) clearTimeout(reminderTimers[sellerId]);
    reminderTimers[sellerId] = setTimeout(async () => {
        if (!sellerMessageMap[sellerId]?.responded && !sellers[sellerId]?.paused) {
            try {
                await client.sendMessage(sellerId.includes('@') ? sellerId : sellerId + '@c.us',
                    '⏰ *Reminder:* You have a pending buyer request. Please respond soon if you’re available.');
                console.log('🔔 Reminder sent to:', sellerId);
            } catch (err) {
                console.error('❌ Reminder error for seller:', sellerId, err.message);
            }
        }
    }, delayMs);
}


// Helper function to find seller across all three files
function findSellerInAllFiles(senderNumber) {
  if (sellers[senderNumber]) {
    return { seller: sellers[senderNumber], location: 'verified' };
  }
  if (awaitingSellers[senderNumber]) {
    return { seller: awaitingSellers[senderNumber], location: 'awaiting' };
  }
  if (incompleteRegSellers[senderNumber]) {
    return { seller: incompleteRegSellers[senderNumber], location: 'incomplete' };
  }
  return null;
}

// Ensure persistent directory exists
async function ensurePersistentDirExists() {
  try {
    if (!fs.existsSync(PERSISTENT_DIR)) {
      fs.mkdirSync(PERSISTENT_DIR, { recursive: true });
      console.log(`✅ Created persistent directory: ${PERSISTENT_DIR}`);
    }
  } catch (error) {
    console.error('❌ Error creating persistent directory:', error);
  }
}

// Load data from storage (only JSON)
async function loadData() {
  // Ensure persistent directory exists first
  await ensurePersistentDirExists();
  try {
    // Load from all three seller files
    sellers = fs.existsSync(SELLERS_FILE) ? JSON.parse(fs.readFileSync(SELLERS_FILE)) : {};
    awaitingSellers = fs.existsSync(AWAITING_SELLERS_FILE) ? JSON.parse(fs.readFileSync(AWAITING_SELLERS_FILE)) : {};
    incompleteRegSellers = fs.existsSync(INCOMPLETE_REG_SELLERS_FILE) ? JSON.parse(fs.readFileSync(INCOMPLETE_REG_SELLERS_FILE)) : {};
    buyers = fs.existsSync(BUYERS_FILE) ? JSON.parse(fs.readFileSync(BUYERS_FILE)) : {};
    sellerMessageMap = fs.existsSync(SELLER_MESSAGES_FILE) ? JSON.parse(fs.readFileSync(SELLER_MESSAGES_FILE)) : {};
    
    // Load temporary registrations
    tempBuyerRegistrations = fs.existsSync(TEMP_BUYER_REGISTRATIONS_FILE) ? JSON.parse(fs.readFileSync(TEMP_BUYER_REGISTRATIONS_FILE)) : {};
    
    // Load first time interaction data
    await loadFirstTimeInteractions();
    
    console.log('Data loaded successfully from JSON files');
  } catch (error) {
    console.error('Error loading data from JSON:', error);
    sellers = {};
    awaitingSellers = {};
    incompleteRegSellers = {};
    buyers = {};
    sellerMessageMap = {};
    tempBuyerRegistrations = {};
    firstTimeInteractions = {};
  }
}

// Category constants
const CATEGORIES = {
    '3': 'pharmaceuticals_health',
    '4': 'houseware',
    '5': 'ayurveda_siddha',
    '6': 'computers_computer_accessories',
    '7': 'automobile_spares',
    '8': 'battery_products',
    '9': 'sports_equipment',
    '10': 'mobiles_mobile_accessories',
    '11': 'hardware_construction',
    '12': 'grocery',
    '13': 'stationary_office',
    '14': 'fancy_gifts_toys',
    '15': 'electricals',
    '16': 'electronics',
    '17': 'supermarket'
};

const CATEGORY_GROUP_MAP = {
    electricals: '120363419554098698@g.us',
    pharmaceuticals_health: '120363419421502705@g.us',
    houseware: '120363403001587464@g.us',
    ayurveda_siddha: '120363419737528338@g.us',
    computers_computer_accessories: '120363417452547751@g.us',
    automobile_spares: '120363404066333711@g.us',
    battery_products: '120363420017831391@g.us',
    electronics: '120363417601490336@g.us',
    sports_equipment: '120363422449698679@g.us',
    mobiles_mobile_accessories: '120363420130592792@g.us',
    hardware_construction: '120363421499934563@g.us',
    grocery: '120363399885229859@g.us',
    stationary_office: '120363418241590496@g.us',
    fancy_gifts_toys: '120363402453594985@g.us',
    supermarket: 'PLACEHOLDER_FOR_SUPERMARKET_GROUP' // Will be updated when group is found
};

const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'whatsapp-bot', dataPath: PERSISTENT_DIR }),
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

client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('authenticated', () => console.log('✅ AUTHENTICATED'));
// Add this function to clean up incomplete seller registrations
async function cleanupIncompleteRegistrations() {
  try {
    let cleanupNeeded = false;
    // Check each seller
    for (const key in sellers) {
      if (sellers.hasOwnProperty(key)) {
        // If seller has no category or is not in 'done' stage, remove them
        if (!sellers[key].category || sellers[key].stage !== 'done') {
          console.log(`Cleaning up incomplete registration for ${key}`);
          delete sellers[key];
          cleanupNeeded = true;
        }
      }
    }
    // Only save if we actually cleaned something up
    if (cleanupNeeded) {
      await saveVerifiedSellers();
      await saveAwaitingSellers();
      await saveIncompleteRegSellers();
    }
  } catch (error) {
    console.error('Error cleaning up incomplete registrations:', error);
  }
}

client.on('ready', async () => {
    console.log('✅ CLIENT IS READY');
    
    // Load data from storage
    await loadData();
    console.log(`Loaded ${Object.keys(sellers).length} sellers and ${Object.keys(buyers).length} buyers`);
    
    // Ensure directories exist for videos
    ensureDirectoriesExist();
    
    // Clean up any incomplete registrations
    await cleanupIncompleteRegistrations();
    console.log(`Cleaned up incomplete seller registrations`);
    
    // Update group IDs for new categories
    console.log('\n🔄 Updating group IDs for new categories...');
    
    // Get group IDs by name
    const sportsGroupId = await getGroupIdByName('Sports & Equipments');
    if (sportsGroupId) {
        CATEGORY_GROUP_MAP.sports_equipment = sportsGroupId;
        console.log(`✅ Updated Sports & Equipments group ID: ${sportsGroupId}`);
    }
    
    const fancyGroupId = await getGroupIdByName('Fancy & Gifts');
    if (fancyGroupId) {
        CATEGORY_GROUP_MAP.fancy_gifts_toys = fancyGroupId;
        console.log(`✅ Updated Fancy & Gifts Items group ID: ${fancyGroupId}`);
    }
    
    const mobileGroupId = await getGroupIdByName('Mobile & Accessories');
    if (mobileGroupId) {
        CATEGORY_GROUP_MAP.mobiles_mobile_accessories = mobileGroupId;
        console.log(`✅ Updated Mobile & Accessories group ID: ${mobileGroupId}`);
    }
    
    const supermarketGroupId = await getGroupIdByName('supermarket');
    if (supermarketGroupId) {
        CATEGORY_GROUP_MAP.supermarket = supermarketGroupId;
        console.log(`✅ Updated Supermarket group ID: ${supermarketGroupId}`);
    }
    
    console.log('\n📊 Updated Category Group Map:', CATEGORY_GROUP_MAP);
    
    // Log dashboard URL
    const port = process.env.PORT || 3000;
    console.log(`\n📊 Analytics Dashboard available at: http://localhost:${port}\n`);
});

// Also run cleanup periodically (every hour)
setInterval(cleanupIncompleteRegistrations, 60 * 60 * 1000);

// AI function to categorize product
async function categorizeProduct(productName, specificInfo = '') {
    try {
        const availableCategories = Object.values(CATEGORIES).join(', ');
        
        const prompt = `
        Categorize the following product into EXACTLY one of these categories:
        ${availableCategories}
        
        Category descriptions:
        - electricals: Electrical equipment, wiring, switches, electrical tools, etc.
        - electronics: Electronic devices, gadgets, appliances, etc.
        - pharmaceuticals_health: Medicines, health supplements, medical equipment, etc.
        - housewear: Home decor, kitchenware, furniture, etc.
        - ayurveda_siddha: Ayurvedic medicines, herbs, traditional remedies, etc.
        - computers_computer_accessories: Laptops, desktops, printers, keyboards, mice, etc.
        - automobile_spares: Car parts, bike parts, vehicle accessories, etc.
        - battery_products: All types of batteries, power banks, UPS, etc.
        - sports_equipment: Sports gear, fitness equipment, outdoor activities, etc.
        - mobiles_mobile_accessories: Phone cases, chargers, headphones, screen protectors, etc.
        - hardware_construction: Building materials, tools, paints, plumbing supplies, etc.
        - grocery: Food items, household supplies, etc.
        - stationary_office: Office supplies, school supplies, etc.
        - fancy_gifts_toys: Gift items, decorative items, toys, novelty products, etc.
        
        Product: "${productName}"
        Additional Info: "${specificInfo}"
        
        Rules:
        - Return ONLY the category name (lowercase), nothing else
        - Must be one of: ${availableCategories}
        - If unsure, return "unknown"
        `;

        const response = await makeAIRequest(prompt);
        const category = response.choices[0].message.content.trim().toLowerCase();
        console.log('🤖 AI Categorized as:', category);
        
        // Validate category
        if (Object.values(CATEGORIES).includes(category)) {
            return category;
        } else {
            return 'unknown';
        }
        
    } catch (error) {
        console.error('❌ AI Categorization Error:', error);
        return 'unknown';
    }
}

// Helper function to get verified sellers by category
function getVerifiedSellersByCategory(category) {
    console.log(`\n🔍 Searching for verified sellers in category: ${category}`);
    
    const verifiedSellers = [];
    
    for (const [sellerNumber, sellerData] of Object.entries(sellers)) {
        console.log(`\n📋 Checking seller: ${sellerNumber}`);
        console.log(`  - Shop: ${sellerData.shop}`);
        console.log(`  - Category: ${sellerData.category}`);
        console.log(`  - Additional Categories: ${sellerData.additionalCategories ? sellerData.additionalCategories.join(', ') : 'None'}`);
        console.log(`  - Stage: ${sellerData.stage}`);
        console.log(`  - Verified: ${sellerData.verified}`);
        console.log(`  - Paused: ${sellerData.paused}`);
        
        // Check if category matches primary category or is in additional categories
        const primaryCategoryMatch = sellerData.category === category;
        const additionalCategoryMatch = sellerData.additionalCategories && sellerData.additionalCategories.includes(category);
        const categoryMatch = primaryCategoryMatch || additionalCategoryMatch;
        
        const isVerified = sellerData.verified === true || sellerData.verified === 'true';
        const stageComplete = sellerData.stage === 'done';
        const isNotPaused = !sellerData.paused; // Add paused check
        
        if (categoryMatch && isVerified && stageComplete && isNotPaused) {
            console.log(`  ✅ SELLER QUALIFIED!`);
            verifiedSellers.push({
                number: sellerNumber.includes('@') ? sellerNumber : sellerNumber + '@c.us',
                data: sellerData
            });
        } else if (sellerData.paused) {
            console.log(`  ⏸️ SELLER PAUSED - SKIPPED`);
        }
    }
    
    console.log(`\n📊 Total verified sellers found: ${verifiedSellers.length}\n`);
    return verifiedSellers;
}

// Helper function to save seller message mapping
async function saveSellerMessages() {
  try {
    await require('fs').promises.writeFile(SELLER_MESSAGES_FILE, JSON.stringify(sellerMessageMap, null, 2));
  } catch (error) {
    console.error('Error saving seller message map to JSON:', error);
  }
}

// Helper function to save temporary buyer registrations
async function saveTempBuyerRegistrations() {
  try {
    console.log('💾 Saving temporary buyer registrations to temp_buyer_registrations.json...');
    console.log('📊 Current tempBuyerRegistrations object keys:', Object.keys(tempBuyerRegistrations));
    console.log('📁 Writing to file:', TEMP_BUYER_REGISTRATIONS_FILE);
    
    await require('fs').promises.writeFile(TEMP_BUYER_REGISTRATIONS_FILE, JSON.stringify(tempBuyerRegistrations, null, 2));
    console.log('✅ Temporary buyer registrations saved successfully');
  } catch (error) {
    console.error('❌ Error saving temporary buyer registrations:', error);
  }
}

// Robust media sending function
async function sendMediaFile(sender, filePath, caption) {
  try {
    const fs = require('fs');
    const { MessageMedia } = require('whatsapp-web.js');
    if (fs.existsSync(filePath)) {
      const media = MessageMedia.fromFilePath(filePath);
      await client.sendMessage(sender, media, { caption });
    }
  } catch (err) {
    console.error('❌ Error sending media file:', err.message);
  }
}

// Helper function to format category options
function getCategoryOptionsText() {
    return `*Please select your shop's primary category:*\n\n` +
           `3️⃣ *Pharmaceuticals & Health*\n` +
           `4️⃣ *Houseware*\n` +
           `5️⃣ *Ayurveda & Siddha*\n` +
           `6️⃣ *Computers & Computer Accessories*\n` +
           `7️⃣ *Automobile Spares*\n` +
           `8️⃣ *Battery Products*\n` +
           `9️⃣ *Sports Equipment*\n` +
           `🔟 *Mobiles & Mobile Accessories*\n` +
           `1️⃣1️⃣ *Hardware & Construction*\n` +
           `1️⃣2️⃣ *Grocery*\n` +
           `1️⃣3️⃣ *Stationary & Office Supplies*\n` +
           `1️⃣4️⃣ *Fancy, Gifts & Toys*\n` +
           `1️⃣5️⃣ *Electricals*\n` +
           `1️⃣6️⃣ *Electronics*\n` +
           `1️⃣7️⃣ *Supermarket*\n\n` +
           `➡️ *Just type the corresponding number below (e.g., 12 for Grocery).*`;
}

// New function specifically for buyer category selection
function getBuyerCategoryOptionsText() {
    return `🤖 *I was unable to categorize your item. Please select the best fit from the list below:*\n\n` +
           `3️⃣ *Pharmaceuticals & Health*\n` +
           `4️⃣ *Houseware*\n` +
           `5️⃣ *Ayurveda & Siddha*\n` +
           `6️⃣ *Computers & Computer Accessories*\n` +
           `7️⃣ *Automobile Spares*\n` +
           `8️⃣ *Battery Products*\n` +
           `9️⃣ *Sports Equipment*\n` +
           `🔟 *Mobiles & Mobile Accessories*\n` +
           `1️⃣1️⃣ *Hardware & Construction*\n` +
           `1️⃣2️⃣ *Grocery*\n` +
           `1️⃣3️⃣ *Stationary & Office Supplies*\n` +
           `1️⃣4️⃣ *Fancy, Gifts & Toys*\n` +
           `1️⃣5️⃣ *Electricals*\n` +
           `1️⃣6️⃣ *Electronics*\n` +
           `1️⃣7️⃣ *Supermarket*\n\n` +
           `➡️ *Just type the corresponding number below (e.g., 12 for Grocery).*`;
}

// Helper function to build structured step messages for buyer flow
function buildBuyerStepMessage(options) {
    const { step, total, question, examples = [], summary = '' } = options;

    // This function no longer includes the header or progress bar.

    // Formatted question
    let message = `*${question}*\n\n`;

    if (examples && examples.length > 0) {
        // Formatted examples
        message += `💡 *Examples:*\n${examples.join('\n')}\n\n`;
    }

    message += `❌ Type \`cancel\` to exit at any time.`;
    return message;
}

// Helper function to get group ID by group name
async function getGroupIdByName(groupName) {
    try {
        const chats = await client.getChats();
        const groups = chats.filter(chat => chat.isGroup);
        
        console.log(`\n🔍 Searching for group: ${groupName}`);
        console.log(`📋 Found ${groups.length} groups total`);
        
        // Strict match first
        for (const group of groups) {
            console.log(`  - Group: ${group.name} (${group.id._serialized})`);
            if (group.name.toLowerCase() === groupName.toLowerCase()) {
                console.log(`  ✅ EXACT MATCH FOUND: ${group.name} (${group.id._serialized})`);
                return group.id._serialized;
            }
        }
        
        // Fallback to includes
        for (const group of groups) {
            if (group.name.toLowerCase().includes(groupName.toLowerCase())) {
                console.log(`  ✅ PARTIAL MATCH FOUND: ${group.name} (${group.id._serialized})`);
                return group.id._serialized;
            }
        }
        
        console.log(`❌ No group found with name: ${groupName}`);
        return null;
    } catch (error) {
        console.error('Error getting group ID by name:', error);
        return null;
    }
}

client.on('message', async (msg) => {
    try {
        const sender = msg.from;
        const senderNumber = sender.split('@')[0];
        const message = msg.body?.trim();

        // Debug logging
        console.log(`\n📨 Message received from: ${sender}`);
        console.log(`📝 Message content: ${message}`);
    
    // Get user's language preference (default to English if not set)
    const userLang = await getUserLanguage(sender) || 'en';
    
    // Helper function to translate messages
    const t = (key, params = {}) => translate(sender, key, params);
    
    // Check if this is a user who has received the product prompt and is now responding with a product name
    if (!msg.from.endsWith('@g.us') && firstTimeInteractions[sender] && firstTimeInteractions[sender].awaitingProductInput && 
        !buyerSessions[sender] && !userSessions[sender]) {
        try {
            // Initialize session and mark as a first-time user
            buyerSessions[sender] = { 
                stage: 'awaiting_brand',  // Skip directly to brand since we already have the product name
                timestamp: Date.now(),
                productName: message,  // Store the product name from the user's message
                isFirstTimeUser: true  // Mark this as a first-time user flow
            };
            
            // Mark user as in buyer session
            userSessions[sender] = 'buyer';
            
            // Remove the awaitingProductInput flag
            firstTimeInteractions[sender].awaitingProductInput = false;
            await saveFirstTimeInteractions();

            // New timed, conversational brand prompt
            const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
            await client.sendMessage(sender, `_Got it. Searching for ${message}._`);
            await delay(1000); // 1-second delay
            await client.sendMessage(sender, "🏷 Any specific **BRAND** in mind?\n➡ e.g., \"Samsung\", \"Amul\", \"Tata\"\n\n◀ Type • to go back\n▶ Type • for any brand");
            return;
        } catch (error) {
            console.error('Error handling product input:', error);
        }
    }
    
    // FIRST PROCESS: Check if this is a new user (not in buyers, sellers, or active sessions and not a group message)
    if (!msg.from.endsWith('@g.us') && !buyers[sender] && !sellers[senderNumber] && 
        !buyerSessions[sender] && !sellerSessions[sender] && !userSessions[sender]) {
        try {
            // Handle first-time user flow
            await handleFirstTimeUserFlow(client, msg, sender, senderNumber);
        } catch (error) {
            console.error('Error in first-time user flow:', error);
        }
    }
    
    // Check for 'cancel all' command first - this should work at any phase
    if (message?.toLowerCase() === 'cancel all') {
        // Check if this is a verified seller
        if (sellers[senderNumber] && (sellers[senderNumber].verified === true || sellers[senderNumber].verified === 'true')) {
            // Find all entries in sellerMessageMap for this seller
            const sellerEntries = Object.keys(sellerMessageMap).filter(key => {
                // Check if the key starts with the seller's number followed by underscore
                return key.startsWith(sender + '_');
            });
            
            if (sellerEntries.length === 0) {
                return msg.reply(`❓ You don't have any active orders to cancel.`);
            }
            
            // Remove all entries for this seller
            const cancelCount = sellerEntries.length;
            sellerEntries.forEach(key => {
                delete sellerMessageMap[key];
            });
            
            // Save the updated seller message map
            await saveSellerMessages();
            
            // Clear any active session for this seller
            if (userSessions[sender]) {
                delete userSessions[sender];
            }
            
            // Send confirmation message with correct count
            return msg.reply(`✅ Successfully cancelled all your orders (${cancelCount} ${cancelCount === 1 ? 'order' : 'orders'}).`);
        } else {
            return msg.reply(`❓ This command is only available for verified sellers.`);
        }
    }
    
    // Check for pause/resume commands for sellers
    if (message?.toLowerCase() === 'pause' || message?.toLowerCase() === 'resume') {
        // Check if this is a verified seller
        if (sellers[senderNumber] && (sellers[senderNumber].verified === true || sellers[senderNumber].verified === 'true')) {
            if (message.toLowerCase() === 'pause') {
                // Pause the seller
                sellers[senderNumber].paused = true;
                await saveSellersToDb(sellers);
                return msg.reply(`⏸️ *You are now paused.*\n\nYou will not receive any new buyer requests until you resume.\n\nType *"resume"* when you want to start receiving requests again.`);
            } else if (message.toLowerCase() === 'resume') {
                // Resume the seller
                sellers[senderNumber].paused = false;
                await saveSellersToDb(sellers);
                return msg.reply(`▶️ *You are now active!*\n\nYou will start receiving new buyer requests again.`);
            }
        } else {
            return msg.reply(`❓ This command is only available for verified sellers.`);
        }
    }
    
    // Check for /pending command for sellers
    if (message?.toLowerCase() === '/pending') {
        // Check if this is a verified seller
        if (sellers[senderNumber] && (sellers[senderNumber].verified === true || sellers[senderNumber].verified === 'true')) {
            // Find all pending requests for this seller
            const pendingRequests = Object.entries(sellerMessageMap).filter(([key, response]) => {
                // Check if the key starts with the seller's number and the request hasn't been responded to
                return key.startsWith(sender + '_') && !response.confirmationStage;
            });
            
            if (pendingRequests.length === 0) {
                return msg.reply(`✅ You have no pending requests! All caught up.`);
            }
            
            // Sort the pending requests by timestamp (oldest first)
            pendingRequests.sort((a, b) => {
                const [keyA, dataA] = a;
                const [keyB, dataB] = b;
                return dataA.timestamp - dataB.timestamp;
            });
            
            // Send summary message first
            await msg.reply(`🔄 Resending your ${pendingRequests.length} pending request${pendingRequests.length === 1 ? '' : 's'} now...`);
            
            // Send each pending request as a separate message with delay
            for (let i = 0; i < pendingRequests.length; i++) {
                const [requestKey, requestData] = pendingRequests[i];
                
                // Build the request message
                let pendingRequestMsg = `🛒 *Pending Buyer Request #${i + 1}*\n\n`;
                pendingRequestMsg += `📦 Product: ${requestData.requestData.product}\n`;
                if (requestData.requestData.brand) {
                    pendingRequestMsg += `🏷️ Brand: ${requestData.requestData.brand}\n`;
                }
                if (requestData.requestData.quantity) {
                    pendingRequestMsg += `🔢 Quantity: ${requestData.requestData.quantity}\n`;
                }
                if (requestData.requestData.requirements) {
                    pendingRequestMsg += `📝 Requirements: ${requestData.requestData.requirements}\n`;
                }
                // Add these lines to make it recognizable as a product request
                pendingRequestMsg += `\n🔄 *New Buyer Request* (Resent via /pending)\n`;
                pendingRequestMsg += `💬 *Please reply directly to this message to confirm your price and availability.*`;
                
                // Send the message
                try {
                    await client.sendMessage(sender, pendingRequestMsg);
                    console.log(`📤 Resent pending request ${i + 1} to seller: ${sender}`);
                } catch (err) {
                    console.error('❌ Error resending pending request:', err.message);
                }
                
                // Add 1 second delay between messages (except for the last one)
                if (i < pendingRequests.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            // Send completion message
            await msg.reply(`✅ All ${pendingRequests.length} pending requests have been resent. Please reply to each message individually.`);
            return;
        } else {
            return msg.reply(`❓ This command is only available for verified sellers.`);
        }
    }
    
    // First-time user detection has been moved to the beginning of the message handler
    // as the first process the bot checks

    // Handle seller responses to individual messages
        if (!msg.from.endsWith('@g.us') && message?.toLowerCase() !== '/pending') {
            
            // Find the SPECIFIC seller response based on quoted message
            let sellerResponse = null;
            let responseKey = null;
            
            // If this is a quoted reply, find the specific response for that buyer
            if (msg.hasQuotedMsg && sellers[senderNumber] && (sellers[senderNumber].verified === true || sellers[senderNumber].verified === 'true')) {
                try {
                    const quotedMsg = await msg.getQuotedMessage();
                    
                    // Extract buyer ID from the quoted message
                    let buyerId = null;
                    const buyerIdMatch = quotedMsg.body.match(/Buyer ID:\s*([^\n]+)/i);
                    if (buyerIdMatch && buyerIdMatch[1]) {
                        buyerId = buyerIdMatch[1].trim();
                        
                        // Look for ANY response key for this seller-buyer pair (regardless of timestamp)
                        for (const [key, response] of Object.entries(sellerMessageMap)) {
                            if (key.startsWith(`${sender}_${buyerId}_`)) {
                                sellerResponse = response;
                                responseKey = key;
                                break; // Take the first match (oldest request)
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error processing quoted message:', error);
                }
            }
            
            // If no specific response found via quoted message, fall back to first available
            if (!sellerResponse) {
                for (const [key, response] of Object.entries(sellerMessageMap)) {
                    if (response.sellerNumber === sender) {
                        sellerResponse = response;
                        responseKey = key;
                        break;
                    }
                }
            }
            
            if (sellerResponse && sellers[senderNumber] && (sellers[senderNumber].verified === true || sellers[senderNumber].verified === 'true')) {
                const seller = sellers[senderNumber];
                
                // Check if the seller is in registration process - prioritize registration over confirmation
                const sellerInRegistration = tempSellerRegistrations[sender] && tempSellerRegistrations[sender].stage === 'awaiting_category';
                
                // Only process confirmation flow if seller is NOT in registration
                if (!sellerInRegistration && sellerResponse.confirmationStage === 'awaiting_confirmation') {
                    // Process seller's confirmation choice
                    if (message === '1' || message.toLowerCase() === 'send') {
                        // Send as is
                        const buyerId = sellerResponse.buyerId;
                        const category = sellerResponse.category;
                        const groupId = CATEGORY_GROUP_MAP[category];
                        
                        // Send to buyer
                        try {
                            await client.sendMessage(buyerId, sellerResponse.buyerResponse);
                            console.log(`📤 Response sent to buyer: ${buyerId}`);
                        } catch (err) {
                            console.error('❌ Error sending message to buyer:', err.message);
                        }

                        // Send to group
                        if (groupId) {
                            try {
                                await client.sendMessage(groupId, sellerResponse.groupResponse);
                                console.log(`📤 Response sent to group: ${groupId}`);
                            } catch (err) {
                                console.error('❌ Error sending message to group:', err.message);
                            }
                        }

                        // Record seller response in database
                        await recordSellerResponse(sender, buyerId, sellerResponse.requestData?.product || 'Unknown', sellerResponse.formattedMessage);

                        // Remove this specific response from the map
                        delete sellerMessageMap[responseKey];
                        await saveSellerMessages();
                        
                        // Check if this seller has any other pending requests
                        const remainingRequests = Object.entries(sellerMessageMap).filter(([key, response]) => 
                            key.startsWith(sender + '_') && !response.confirmationStage
                        );
                        
                        if (remainingRequests.length === 0) {
                            // Seller has responded to all requests - send completion message
                            const completionMsg = `🎉 *Excellent work!* You have successfully responded to all buyer requests.\n\n` +
                                `✅ All your responses have been sent to buyers and posted in the relevant groups.\n\n` +
                                `💼 You're now ready to receive new buyer requests. Thank you for being an active seller!`;
                            
                            try {
                                await client.sendMessage(sender, completionMsg);
                            } catch (err) {
                                console.error('❌ Error sending completion message:', err.message);
                            }
                                
                            return;
                        } else {
                            // Automatically send the next pending request to the seller
                            // Sort the remaining requests to get them in order
                            remainingRequests.sort((a, b) => {
                                const [keyA, dataA] = a;
                                const [keyB, dataB] = b;
                                return dataA.timestamp - dataB.timestamp; // Sort by timestamp (oldest first)
                            });
                            
                            // Get the next request (the oldest one)
                            const [nextRequestKey, nextRequestData] = remainingRequests[0];
                            
                            // Build the request message with the new tag number
                            let nextRequestMsg = `🛒 *Next Pending Buyer Request #1*\n\n`;
                            nextRequestMsg += `📦 Product: ${nextRequestData.requestData.product}\n`;
                            if (nextRequestData.requestData.brand) {
                                nextRequestMsg += `🏷️ Brand: ${nextRequestData.requestData.brand}\n`;
                            }
                            if (nextRequestData.requestData.quantity) {
                                nextRequestMsg += `🔢 Quantity: ${nextRequestData.requestData.quantity}\n`;
                            }
                            if (nextRequestData.requestData.requirements) {
                                nextRequestMsg += `📝 Requirements: ${nextRequestData.requestData.requirements}\n`;
                            }
                            // Add these lines to make it recognizable as a product request
                            nextRequestMsg += `\n🔄 *New Buyer Request* (Automatically sent)\n`;
                            nextRequestMsg += `💬 *Please reply directly to this message to confirm your price and availability.*`;
                            
                            // First send a success message for the current response
                            await msg.reply(`✅ Your response has been sent to the buyer and group! You have ${remainingRequests.length} more request(s) pending.`);
                            
                            // Then send the next request
                            try {
                                await client.sendMessage(sender, nextRequestMsg);
                                console.log(`📤 Automatically sent next pending request to seller: ${sender}`);
                            } catch (err) {
                                console.error('❌ Error sending next pending request:', err.message);
                            }
                            
                            return;
                        }
                    } else if (message === '2' || message.toLowerCase() === 'edit') {
                // Edit response
                sellerResponse.confirmationStage = 'awaiting_edit';
                await saveSellerMessages();
                return msg.reply(`📝 *Please type your new response message:*\n\nOr type *"cancel"* to exit this process.`);
            } else if (message === '3' || message.toLowerCase() === 'cancel') {
                // Cancel - use the correct responseKey instead of sender
                delete sellerMessageMap[responseKey];
                await saveSellerMessages();
                return msg.reply(`❌ Response cancelled. The buyer will not receive any message.`);
            } else {
                return msg.reply(`⚠️ Please select a valid option:\n\n*1️⃣ Send as is* ➡️ *Type 1* or *send*\n*2️⃣ Edit message* ➡️ *Type 2* or *edit*\n*3️⃣ Cancel* ➡️ *Type 3* or *cancel*`);
            }
                }
                
                // Handle edit flow if seller is editing their response
                if (sellerResponse.confirmationStage === 'awaiting_edit') {
                    const buyerId = sellerResponse.buyerId;
                    const category = sellerResponse.category;
                    const productName = sellerResponse.requestData?.product || 'Product';
                    
                    // Calculate distance between buyer and seller if locations are available
                    let distanceText = '';
                    if (seller.location && buyers[buyerId] && buyers[buyerId].location) {
                        const distance = calculateDistance(
                            seller.location.latitude, 
                            seller.location.longitude,
                            buyers[buyerId].location.latitude,
                            buyers[buyerId].location.longitude
                        );
                        distanceText = `📏 Distance: *${distance} km* from you\n`;
                    }
                    
                    // Format the new message
                    const formattedMessage = formatSellerResponse(message);
                    
                    // Update the formatted responses
                    const buyerResponse = 
                        `📦 *${productName}*\n\n` +
                        `💰 Price & Info: ${formattedMessage}\n` +
                        `🏪 Shop: ${seller.shop || 'N/A'}\n` +
                        distanceText +
                        `📍 Location: ${seller.location ? `https://www.google.com/maps?q=${seller.location.latitude},${seller.location.longitude}` : 'N/A'}\n\nHappy shopping! ✨`;

                    const groupResponse = 
                        `📦 *${productName}*\n\n` +
                        `💰 Price & Info: ${formattedMessage}\n` +
                        `🏪 Shop: ${seller.shop || 'N/A'}`;
                    
                    // Update the stored responses
                    sellerMessageMap[responseKey].formattedMessage = formattedMessage;
                    sellerMessageMap[responseKey].buyerResponse = buyerResponse;
                    sellerMessageMap[responseKey].groupResponse = groupResponse;
                    sellerMessageMap[responseKey].confirmationStage = 'awaiting_confirmation';
                    await saveSellerMessages();
                    
                    // Ask for confirmation again
                    const confirmationMsg = `🚀 **Ready to Send?**\n\n` +
                        `--- [ PREVIEW ] ---\n` +
                        `📦 **${productName}**\n\n` +
                        `💰 **Price & Info:** ${formattedMessage}\n` +
                        `🏪 **Shop:** ${seller.shop || 'N/A'}\n` +
                        `--- [ END PREVIEW ] ---\n\n` +
                        `This is exactly how your offer will appear to the buyer.\n\n` +
                        `**1️⃣ Send Now** ➡️ Type \`\`\`1\`\`\`\n` +
                        `**2️⃣ Edit Response** ➡️ Type \`\`\`2\`\`\`\n` +
                        `**3️⃣ Cancel** ➡️ Type \`\`\`3\`\`\``;
                    
                    return msg.reply(confirmationMsg);
                }
                
                // Check if this is a quoted reply to a product request
                const isQuotedReply = async () => {
                    try {
                        if (msg.hasQuotedMsg) {
                            const quotedMsg = await msg.getQuotedMessage();
                            // Check if the quoted message contains the product request signature
                            return quotedMsg.body.includes('New Buyer Request') || 
                                   quotedMsg.body.includes('Pending Buyer Request') ||
                                   quotedMsg.body.includes('Please use WhatsApp\'s reply feature') ||
                                   quotedMsg.body.includes('Reply to this message with your price') ||
                                   quotedMsg.body.includes('IMPORTANT:');
                        }
                        return false;
                    } catch (error) {
                        console.error('Error checking quoted message:', error);
                        return false;
                    }
                };
                
                // Initial seller response (not in confirmation flow yet)
                const buyerId = sellerResponse.buyerId;
                const category = sellerResponse.category;
                const groupId = CATEGORY_GROUP_MAP[category];
                
                // Check if message is a quoted reply to the product request
                const isQuoted = await isQuotedReply();
                
                // If not a quoted reply and not in confirmation flow, ask seller to use reply feature
                if (!isQuoted && !sellerResponse.confirmationStage) {
                    return msg.reply(`⚠️ *IMPORTANT:* Please *reply directly* to the product request message using WhatsApp's reply feature.

1️⃣ Long-press on the product request message
2️⃣ Select 'Reply'
3️⃣ Type your price and availability

This ensures your response is correctly associated with the specific request, especially when you have multiple requests.`);
                }
                
                console.log(`🎯 Seller response detected from: ${seller.shop}`);
                
                // Calculate distance between buyer and seller if locations are available
                let distanceText = '';
                if (seller.location && buyers[buyerId] && buyers[buyerId].location) {
                    const distance = calculateDistance(
                        seller.location.latitude, 
                        seller.location.longitude,
                        buyers[buyerId].location.latitude,
                        buyers[buyerId].location.longitude
                    );
                    distanceText = `📏 Distance: *${distance} km* from you\n`;
                }

                // Extract product name from the quoted message if possible
                let productName = 'Product';
                if (isQuoted) {
                    try {
                        const quotedMsg = await msg.getQuotedMessage();
                        const productMatch = quotedMsg.body.match(/Product:\s*([^\n]+)/i);
                        if (productMatch && productMatch[1]) {
                            productName = productMatch[1].trim();
                            console.log(`✅ Extracted Product Name from quoted message: ${productName}`);
                            
                            // Update the stored product name in sellerMessageMap
                            if (responseKey) {
                                sellerMessageMap[responseKey].requestData.product = productName;
                            }
                        } else {
                            // Fallback to the stored product name if extraction fails
                            productName = sellerResponse.requestData?.product || 'Product';
                            console.log(`⚠️ Using stored Product Name: ${productName}`);
                        }
                    } catch (error) {
                        console.error('Error extracting product name from quoted message:', error);
                        // Fallback to the stored product name if extraction fails
                        productName = sellerResponse.requestData?.product || 'Product';
                    }
                } else {
                    // Not a quoted reply or in confirmation flow, use stored product name
                    productName = sellerResponse.requestData?.product || 'Product';
                }
                
                // Format the message to make prices bold
                const formattedMessage = formatSellerResponse(message);
                
                // Format response for BUYER (with location and distance)
                const buyerResponse = 
                    `📦 *${productName}*\n\n` +
                    `💰 Price & Info: ${formattedMessage}\n` +
                    `🏪 Shop: ${seller.shop || 'N/A'}\n` +
                    distanceText +
                    `📍 Location: ${seller.location ? `https://www.google.com/maps?q=${seller.location.latitude},${seller.location.longitude}` : 'N/A'}\n\nHappy shopping! ✨`;

                // Format response for GROUP (without location and distance)
                const groupResponse = 
                    `📦 *${productName}*\n\n` +
                    `💰 Price & Info: ${formattedMessage}\n` +
                    `🏪 Shop: ${seller.shop || 'N/A'}`;
                
                // Ask seller to confirm before sending
                if (responseKey) {
                    sellerMessageMap[responseKey].confirmationStage = 'awaiting_confirmation';
                    sellerMessageMap[responseKey].formattedMessage = formattedMessage;
                    sellerMessageMap[responseKey].buyerResponse = buyerResponse;
                    sellerMessageMap[responseKey].groupResponse = groupResponse;
                    await saveSellerMessages();
                }
                
                const confirmationMsg = `🚀 **Ready to Send?**\n\n` +
                    `--- [ PREVIEW ] ---\n` +
                    `📦 **${productName}**\n\n` +
                    `💰 **Price & Info:** ${formattedMessage}\n` +
                    `🏪 **Shop:** ${seller.shop || 'N/A'}\n` +
                    `--- [ END PREVIEW ] ---\n\n` +
                    `This is exactly how your offer will appear to the buyer.\n\n` +
                    `**1️⃣ Send Now** ➡️ Type \`\`\`1\`\`\`\n` +
                    `**2️⃣ Edit Response** ➡️ Type \`\`\`2\`\`\`\n` +
                    `**3️⃣ Cancel** ➡️ Type \`\`\`3\`\`\``;
                
                return msg.reply(confirmationMsg);
            }
        } else if (sellers[senderNumber] && (sellers[senderNumber].verified === true || sellers[senderNumber].verified === 'true')) {
            // This is a verified seller but they don't have an active response in progress
            // Check if this is a quoted reply to a product request
            if (msg.hasQuotedMsg) {
                try {
                    const quotedMsg = await msg.getQuotedMessage();
                    // Check if the quoted message contains the product request signature
                if (quotedMsg.body.includes('New Buyer Request') || 
                    quotedMsg.body.includes('Please use WhatsApp\'s reply feature') ||
                    quotedMsg.body.includes('Reply to this message with your price') ||
                    quotedMsg.body.includes('Pending Buyer Request') ||
                    quotedMsg.body.includes('IMPORTANT:')) {
                        
                        // Extract product name from the quoted message
                        let extractedProductName = 'Product';
                        const productMatch = quotedMsg.body.match(/Product:\s*([^\n]+)/i);
                        if (productMatch && productMatch[1]) {
                            extractedProductName = productMatch[1].trim();
                        }
                        
                        // Extract buyer ID directly from the quoted message
                        let buyerId = null;
                        const buyerIdMatch = quotedMsg.body.match(/Buyer ID:\s*([^\n]+)/i);
                        if (buyerIdMatch && buyerIdMatch[1]) {
                            buyerId = buyerIdMatch[1].trim();
                            console.log(`✅ Extracted Buyer ID from message: ${buyerId}`);
                        }
                        
                        // If no buyer ID in message, check previous mappings
                        if (!buyerId) {
                            console.log(`⚠️ No Buyer ID found in message, checking previous mappings`);
                            // Check if this seller has any previous buyer mappings
                            const previousResponses = Object.entries(sellerMessageMap)
                                .filter(([key, value]) => key.startsWith(senderNumber) && value.buyerId)
                                .map(([_, value]) => value);
                            
                            if (previousResponses.length > 0) {
                                // Use the most recent buyer mapping
                                const mostRecentResponse = previousResponses[previousResponses.length - 1];
                                buyerId = mostRecentResponse.buyerId;
                                console.log(`✅ Using previous Buyer ID: ${buyerId}`);
                            }
                        }
                        
                        if (buyerId) {
                            // Extract category from the quoted message if possible
                            let category = null;
                            const categoryMatch = quotedMsg.body.match(/Category:\s*([^\n]+)/i);
                            if (categoryMatch && categoryMatch[1]) {
                                category = categoryMatch[1].trim().toLowerCase();
                                console.log(`✅ Extracted Category from message: ${category}`);
                            }
                            
                            // If no category in message, try to determine from product or use default
                            if (!category) {
                                // Check previous mappings for category
                                const previousResponses = Object.entries(sellerMessageMap)
                                    .filter(([key, value]) => key.startsWith(senderNumber) && value.category)
                                    .map(([_, value]) => value);
                                
                                if (previousResponses.length > 0) {
                                    category = previousResponses[previousResponses.length - 1].category;
                                    console.log(`✅ Using previous Category: ${category}`);
                                } else {
                                    // Default to electricals if we can't determine
                                     category = 'electricals';
                                    console.log(`⚠️ Using default Category: ${category}`);
                                }
                            }
                            
                            // Create a new response entry for this seller with unique key
                            const timestamp = Date.now();
                            const newResponseKey = `${sender}_${buyerId}_${timestamp}`;
                            sellerMessageMap[newResponseKey] = {
                                sellerNumber: sender,
                                buyerId: buyerId,
                                category: category,
                                requestData: {
                                    product: extractedProductName,
                                    brand: null,  // We don't have this info from the quoted message
                                    quantity: null, // We don't have this info from the quoted message
                                    requirements: null // We don't have this info from the quoted message
                                },
                                timestamp: timestamp, // Add timestamp for consistency
                                confirmationStage: null // Start fresh with no confirmation stage
                            };
                            responseKey = newResponseKey;
                            
                            console.log(`✅ Created new seller response mapping for ${sender} to buyer ${buyerId}`);
                            
                            // Now process the seller's response message
                            const formattedMessage = formatSellerResponse(message);
                            const productName = extractedProductName; // Use the extracted product name from the current quoted message
                            
                            // Calculate distance if possible
                            let distanceText = '';
                            if (sellers[senderNumber].location && buyers[buyerId] && buyers[buyerId].location) {
                                const distance = calculateDistance(
                                    sellers[senderNumber].location.latitude, 
                                    sellers[senderNumber].location.longitude,
                                    buyers[buyerId].location.latitude,
                                    buyers[buyerId].location.longitude
                                );
                                distanceText = `📏 Distance: *${distance} km* from you\n`;
                            }
                            
                            // Format responses
                            const buyerResponse = 
                                `📦 *${productName}*\n\n` +
                                `💰 Price & Info: ${formattedMessage}\n` +
                                `🏪 Shop: ${sellers[senderNumber].shop || 'N/A'}\n` +
                                distanceText +
                                `📍 Location: ${sellers[senderNumber].location ? `https://www.google.com/maps?q=${sellers[senderNumber].location.latitude},${sellers[senderNumber].location.longitude}` : 'N/A'}\n\nHappy shopping! ✨`;

                            const groupResponse = 
                                `📦 *${productName}*\n\n` +
                                `💰 Price & Info: ${formattedMessage}\n` +
                                `🏪 Shop: ${sellers[senderNumber].shop || 'N/A'}`;
                            
                            // Update the stored responses
                            sellerMessageMap[responseKey].formattedMessage = formattedMessage;
                            sellerMessageMap[responseKey].buyerResponse = buyerResponse;
                            sellerMessageMap[responseKey].groupResponse = groupResponse;
                            sellerMessageMap[responseKey].confirmationStage = 'awaiting_confirmation';
                            await saveSellerMessages();
                            
                            // Ask for confirmation
                            const confirmationMsg = `🚀 **Ready to Send?**\n\n` +
                                `--- [ PREVIEW ] ---\n` +
                                `📦 **${productName}**\n\n` +
                                `💰 **Price & Info:** ${formattedMessage}\n` +
                                `🏪 **Shop:** ${sellers[senderNumber].shop || 'N/A'}\n` +
                                `--- [ END PREVIEW ] ---\n\n` +
                                `This is exactly how your offer will appear to the buyer.\n\n` +
                                `**1️⃣ Send Now** ➡️ Type \`\`\`1\`\`\`\n` +
                                `**2️⃣ Edit Response** ➡️ Type \`\`\`2\`\`\`\n` +
                                `**3️⃣ Cancel** ➡️ Type \`\`\`3\`\`\``;
                            
                            return msg.reply(confirmationMsg);
                        }
                    }
                } catch (error) {
                    console.error('Error processing quoted message:', error);
                }
            }
        }

    // Skip group messages
    if (msg.from.endsWith('@g.us')) {
        return;
    }

    // ---- Language Selection ----
    if (message?.toLowerCase() === 'language' || message?.toLowerCase() === 'lang' || message?.toLowerCase() === 'மொழி') {
        return msg.reply(`🌐 *Language / மொழி*\n\n*1️⃣ English* ➡️ *Type 1*\n*2️⃣ தமிழ் (Tamil)* ➡️ *Type 2*\n\n*Please select your preferred language:*`);
    }
    
    if ((message === '1' || message === '2') && !buyerSessions[sender] && !sellers[senderNumber]) {
        // Only process as language selection if not in another flow
        const lang = message === '1' ? 'en' : 'ta';
        await setUserLanguage(sender, lang);
        return msg.reply(t('language_set_success'));
    }
    



// ---- Process Management Commands ----
    
    if (message?.toLowerCase() === 'cancel' || message?.toLowerCase() === 'exit') {
        // Check if user is in any active session
        if (userSessions[sender]) {
            const sessionType = userSessions[sender];
            
            // Clear appropriate session based on type
            if (sessionType === 'buyer') {
                delete buyerSessions[sender];
            } else if (sessionType === 'seller') {
                // Clear temp registrations or update verified seller stage
                if (tempSellerRegistrations[senderNumber]) {
                    // Save incomplete registration before deleting
                    const seller = tempSellerRegistrations[senderNumber];
                    if (['awaiting_shop_name', 'awaiting_location', 'awaiting_category'].includes(seller.stage)) {
                        incompleteRegSellers[senderNumber] = { ...seller, cancelledAt: new Date().toISOString() };
                        await saveIncompleteRegSellers();
                    }
                    delete tempSellerRegistrations[senderNumber];
                } else if (sellers[senderNumber] && 
        sellers[senderNumber].stage !== 'done' && 
        sellers[senderNumber].stage !== 'awaiting_category_action') {
                    sellers[senderNumber].stage = 'done';
                    await saveVerifiedSellers();
                }
            }
            
            // Clear user session tracking
            delete userSessions[sender];
            
            // Send cancellation message
            await msg.reply(`✅ Your current process has been cancelled. You can start a new request or join as a seller.`);
            
            // Send buyer registration video after cancellation
            const buyerRegVideoPath = path.join(__dirname, 'public', 'videos', 'buyer_registration.mp4');
            await sendMediaFile(sender, buyerRegVideoPath, 'Learn how to register as a buyer!');
            
            return;
        } else {
            return msg.reply(`❓ You don't have any active process to cancel.`);
        }
    }
    

    
    // ---- Trigger Buyer Flow ----
if (message?.toLowerCase() === 'start') {
    // Check if user is already in another process
    if (userSessions[sender] && userSessions[sender] !== 'buyer') {
        return msg.reply(`⚠️ You are currently in the middle of another process. \n\n` +
                       `⚠️ You have an active process. Please type *"cancel"* to exit your current process first, or complete it.`);
    }
    
    // Mark user as in buyer session
    userSessions[sender] = 'buyer';
    
    // Check if user is not in buyers (either new or returning unregistered user)
    if (!buyers[sender]) {
        // Start registration process for any unregistered user
        buyerSessions[sender] = { stage: 'ask_name' };
        const welcomeMsg = `👋 Welcome to Bizz Bazzar!\n\nTo help you find specific products in nearby stores, let's do a quick *one-time setup*. This helps sellers easily identify your requests.\n\nWhat name should I use for you?\n➡️ *Type your full name below.*`;
        return msg.reply(welcomeMsg);
    } else {
        // Existing buyer - start product request flow
        buyerSessions[sender] = { 
            stage: 'awaiting_product_name',
            timestamp: Date.now() 
        };

        // --- New "Welcome Back" Message ---
        // Send welcome back message with timed delays
        await msg.reply(`Ready to find something new?`);
        
        // 3 second delay
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        await msg.reply(`Just type the`);
        
        // 1 second delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await msg.reply(`**NAME OF THE PRODUCT** you're looking for to get started.\n\n➡️ *e.g., "HP Laptop Charger" or "Figaro Olive Oil"*`);
        
        return;
    }
}

    // ---- Seller Flow ----
    if (message?.toLowerCase() === 'join seller' || message?.toLowerCase() === translate(sender, 'seller.join_seller_command')) {
        // Check if user is already in another process
        if (userSessions[sender] && userSessions[sender] !== 'seller') {
            return msg.reply(`⚠️ You are currently in the middle of another process. \n\n` +
                           `⚠️ You have an active process. Please type *"cancel"* to exit your current process first, or complete it.`);
        }
        
        // Mark user as in seller session
        userSessions[sender] = 'seller';
        
        // Check seller status across all three files
        const sellerInfo = findSellerInAllFiles(senderNumber);
        
        if (!sellerInfo) {
            // New seller registration - multi-message timed welcome sequence
            tempSellerRegistrations[senderNumber] = { stage: 'awaiting_shop_name' };
            
            // First message
            await msg.reply(`🎉 **Welcome to the Seller Program!**\n\nI'm excited to help you connect with local buyers and grow your business.`);
            
            // 1.5 second delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Second message
            await msg.reply(`📋 **Quick Registration Process:**\n\n1️⃣ Shop Name\n2️⃣ Location\n3️⃣ Business Category\n\nLet's get started! 🚀`);
            
            // 1 second delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Third message
            return msg.reply(`🏪 **Please enter your shop name:**\n\n✖️ Type \`\`\`cancel\`\`\` at any time to exit this process.`);
        } else if (sellerInfo.location === 'verified') {
            // Verified seller - allow category management
            const seller = sellerInfo.seller;
            seller.stage = 'awaiting_category_action';
            await saveVerifiedSellers();
            
            // Enhanced seller dashboard with professional formatting
            let categoryActionMsg = `📊 **Seller Dashboard**\n\n`;
                
            // Show verification status
            categoryActionMsg += `✅ **Status:** Verified Seller\n\n`;
                
            // Show categories joined (including primary and additional)
            let allCategories = [seller.category];
            if (seller.additionalCategories && seller.additionalCategories.length > 0) {
                allCategories = allCategories.concat(seller.additionalCategories);
            }
                
            categoryActionMsg += `📚 **Your Categories:**\n`;
            allCategories.forEach(cat => {
                categoryActionMsg += `  • **${cat.charAt(0).toUpperCase() + cat.slice(1)}**\n`;
            });
            categoryActionMsg += `\n`;
                
            // Options with enhanced formatting
            categoryActionMsg += `**What would you like to do?**\n\n`;
            categoryActionMsg += `**1️⃣ Add New Category** ➡️ Type \`\`\`1\`\`\`\n`;
                
            // Add remove option if seller has additional categories
            if (seller.additionalCategories && seller.additionalCategories.length > 0) {
                categoryActionMsg += `**2️⃣ Remove Category** ➡️ Type \`\`\`2\`\`\`\n`;
            }
                
            categoryActionMsg += `\n💡 Type \`\`\`cancel\`\`\` to exit anytime.`;
                
            return msg.reply(categoryActionMsg);
        } else if (sellerInfo.location === 'awaiting') {
            // Seller completed registration but awaiting verification
            const seller = sellerInfo.seller;
            let awaitingMsg = `⏳ **Your registration is currently under review.**\n\n`;
            awaitingMsg += `📋 **Registration Details:**\n`;
            awaitingMsg += `🏪 **Shop:** ${seller.shop}\n`;
            awaitingMsg += `📍 **Location:** ${seller.location ? 'Provided' : 'Not provided'}\n`;
            awaitingMsg += `📂 **Category:** ${seller.category.charAt(0).toUpperCase() + seller.category.slice(1)}\n\n`;
            awaitingMsg += `✅ **Status:** Pending Admin Verification\n\n`;
            awaitingMsg += `We're reviewing your application and will notify you as soon as it's approved. 👍`;
            return msg.reply(awaitingMsg);
        } else if (sellerInfo.location === 'incomplete') {
            // Delete previous incomplete data and start fresh
            delete incompleteRegSellers[senderNumber];
            await saveIncompleteRegSellers();
            
            // Start new registration with welcome back message
            tempSellerRegistrations[senderNumber] = { stage: 'awaiting_shop_name' };
            return msg.reply(`👋 **Welcome back!**\n\nIt looks like you started registering before but didn't finish. No worries - let's complete your seller registration now!\n\n🏪 **Please enter your shop name:**\n\n✖️ Type \`\`\`cancel\`\`\` at any time to exit this process.`);
        }
    }

    // Handle verified sellers first
    if (sellers[senderNumber] && ['awaiting_category_action', 'awaiting_add_category', 'awaiting_remove_category'].includes(sellers[senderNumber].stage)) {
        const seller = sellers[senderNumber];
        
        // Cancel handler for verified sellers
        if (message.toLowerCase() === 'cancel') {
            seller.stage = 'done';
            await saveVerifiedSellers();
            return msg.reply(`✅ Process cancelled. Your seller profile remains unchanged.`);
        }

        // Handle existing seller choosing to add or remove a category
        if (seller.stage === 'awaiting_category_action') {
            if (message === '1') {
                // ADD - Add another category
                seller.stage = 'awaiting_add_category';
                // Use the full category list instead of the limited one
                return msg.reply(`📂 Select a new category to ADD to your profile:\n` + getCategoryOptionsText() + `\n\nOr type "cancel" to keep only your current category.`);
            } else if (message === '2' && seller.additionalCategories && seller.additionalCategories.length > 0) {
                // REMOVE - Remove a category
                seller.stage = 'awaiting_remove_category';
                
                // Create a numbered list of categories to remove
                let removeOptions = `📂 Select a category to REMOVE from your profile:\n\n`;
                seller.additionalCategories.forEach((cat, index) => {
                    removeOptions += `${index + 1}. *${cat.charAt(0).toUpperCase() + cat.slice(1)}* ➡️ *Type ${index + 1}*\n`;
                });
                
                removeOptions += `\nOr type "cancel" to keep all your categories.`;
                return msg.reply(removeOptions);
            } else {
                let optionsMsg = `⚠️ Please select a valid option:\n\n*1️⃣ ADD a new category* ➡️ *Type 1*`;
                
                // Only show remove option if seller has additional categories
                if (seller.additionalCategories && seller.additionalCategories.length > 0) {
                    optionsMsg += `\n*2️⃣ REMOVE a category* ➡️ *Type 2*`;
                }
                
                optionsMsg += `\n\nOr type *"cancel"* to exit this process.\n\n❌ Type *"cancel all"* to cancel all your active orders.`;
                return msg.reply(optionsMsg);
            }
        }
        
        // Handle adding a new category
        if (seller.stage === 'awaiting_add_category') {
            if (message.toLowerCase() === 'cancel') {
                seller.stage = 'done';
                await saveVerifiedSellers();
                return msg.reply(`✅ You'll remain with only your current category: ${seller.category}.`);
            }
            
            const selected = CATEGORIES[message];
            if (!selected) return msg.reply(`⚠️ Please select a valid option:\n\n` + getCategoryOptionsText());
            
            // Check if category already exists
            let allCategories = [seller.category];
            if (seller.additionalCategories) {
                allCategories = allCategories.concat(seller.additionalCategories);
            }
            
            if (allCategories.includes(selected)) {
                return msg.reply(`⚠️ You're already registered in the ${selected} category. Please select a different category.`);
            }
            
            // Add the new category
            if (!seller.additionalCategories) {
                seller.additionalCategories = [];
            }
            seller.additionalCategories.push(selected);
            seller.stage = 'done';
            await saveVerifiedSellers();
            
            return msg.reply(`✅ Great! You've been added to the ${selected} category. You can now receive orders from both categories.`);
        }
        
        // Handle removing a category
        if (seller.stage === 'awaiting_remove_category') {
            if (message.toLowerCase() === 'cancel') {
                seller.stage = 'done';
                await saveVerifiedSellers();
                return msg.reply(`✅ You'll keep all your current categories.`);
            }
            
            const categoryIndex = parseInt(message) - 1;
            if (isNaN(categoryIndex) || categoryIndex < 0 || categoryIndex >= seller.additionalCategories.length) {
                let removeOptions = `⚠️ Please select a valid option:\n\n`;
                seller.additionalCategories.forEach((cat, index) => {
                    removeOptions += `${index + 1}. *${cat.charAt(0).toUpperCase() + cat.slice(1)}* ➡️ *Type ${index + 1}*\n`;
                });
                removeOptions += `\nOr type "cancel" to keep all your categories.`;
                return msg.reply(removeOptions);
            }
            
            const removedCategory = seller.additionalCategories[categoryIndex];
            seller.additionalCategories.splice(categoryIndex, 1);
            
            // Clean up empty additionalCategories array
            if (seller.additionalCategories.length === 0) {
                delete seller.additionalCategories;
            }
            
            seller.stage = 'done';
            await saveVerifiedSellers();
            
            return msg.reply(`✅ You've been removed from the ${removedCategory} category. You'll continue receiving orders from your remaining categories.`);
        }
        
        return; // Exit here for verified sellers
    }

    if (tempSellerRegistrations[senderNumber]) {
        console.log(`🔄 Processing tempSellerRegistrations for ${senderNumber}`);
        console.log(`📋 Current stage: ${tempSellerRegistrations[senderNumber].stage}`);
        console.log(`💬 Message received: ${message}`);
        const seller = tempSellerRegistrations[senderNumber];

        // Global cancel handler for new registrations only
        if (message.toLowerCase() === 'cancel') {
            // For new registrations (awaiting_shop_name, awaiting_location, awaiting_category)
            if (['awaiting_shop_name', 'awaiting_location', 'awaiting_category'].includes(seller.stage)) {
                // Move to incomplete registrations file
                incompleteRegSellers[senderNumber] = { ...seller, cancelledAt: new Date().toISOString() };
                delete tempSellerRegistrations[senderNumber];
                delete userSessions[sender];
                await saveIncompleteRegSellers();
                return msg.reply(`❌ Registration cancelled.`);
            }
        }

        // This section is now only for new seller registrations (awaiting_shop_name, awaiting_location, awaiting_category)

        // New flow: First shop name, then location, then category
        // Step 1: Get shop name
        if (seller.stage === 'awaiting_shop_name') {
            seller.shop = message;
            seller.stage = 'awaiting_location';
            return msg.reply(`📍 *Please share your shop location using WhatsApp's Location feature.*\n\nThis helps buyers find you more easily.`);
        }

        // Step 2: Get location
        if (msg.location && seller.stage === 'awaiting_location') {
            seller.location = msg.location;
            seller.stage = 'awaiting_category';
            let categoryText = getCategoryOptionsText();
            categoryText += `\n\n✖️ Type *"cancel"* at any time to exit this process.`;
            return msg.reply(categoryText);
        }

        // Step 3: Finally, get category and save data
        if (seller.stage === 'awaiting_category') {
            console.log(`🔍 Category selection - User message: "${message}" (Type: ${typeof message})`);
            console.log(`📋 Available CATEGORIES keys:`, Object.keys(CATEGORIES));
            
            // Normalize the message - handle both emoji numbers and regular numbers
            const digitMap = {'1️⃣':'1','2️⃣':'2','3️⃣':'3','4️⃣':'4','5️⃣':'5','6️⃣':'6','7️⃣':'7','8️⃣':'8','9️⃣':'9','🔟':'10','1️⃣1️⃣':'11','1️⃣2️⃣':'12','1️⃣3️⃣':'13','1️⃣4️⃣':'14'};

            // Ensure message is a string, trim whitespace, and handle potential non-string inputs
            let cleanedMsg = '';
            try {
                cleanedMsg = String(message).trim();
                // Remove any invisible characters or extra spaces
                cleanedMsg = cleanedMsg.replace(/\s+/g, '');
            } catch (e) {
                console.error('Error converting message to string:', e);
                cleanedMsg = '';
            }
            
            // Apply digit mapping if exact match exists, otherwise keep original
            const normalizedMsg = digitMap[cleanedMsg] || cleanedMsg;
            
            console.log(`🔄 Normalized message: "${normalizedMsg}" (Type: ${typeof normalizedMsg})`);
            console.log(`🔄 Comparing with "1": ${normalizedMsg === "1"}, with 1: ${normalizedMsg === 1}`);
            
            // Try multiple lookup approaches
            let selected = null;
            
            // 1. Direct string lookup
            selected = CATEGORIES[normalizedMsg];
            console.log(`1️⃣ Direct string lookup result:`, selected);
            
            // 2. If not found and looks like a number, try numeric conversion
            if (!selected && /^\d+$/.test(normalizedMsg)) {
                selected = CATEGORIES[normalizedMsg];
                console.log(`2️⃣ Numeric string lookup result:`, selected);
            }
            
            // 3. Last resort - try parsing as integer
            if (!selected) {
                try {
                    const numericMsg = parseInt(normalizedMsg);
                    if (!isNaN(numericMsg)) {
                        selected = CATEGORIES[String(numericMsg)];
                        console.log(`3️⃣ Parsed integer lookup result:`, selected);
                    }
                } catch (e) {
                    console.error('Error parsing message as integer:', e);
                }
            }
            
            console.log(`✅ Final selected category:`, selected);
            
            if (!selected) {
                console.log(`❌ Invalid category selection: "${message}"`);
                return msg.reply(`⚠️ Please select a valid option:\n\n` + getCategoryOptionsText());
            }

            seller.category = selected;
            seller.stage = 'done';
            seller.verified = false;
            seller.registeredAt = new Date().toISOString();
            
            console.log(`🔄 Moving seller ${senderNumber} from temp to awaiting_sellers`);
            console.log(`📋 Seller data:`, seller);
            
            // Move completed registration to awaiting_sellers file
            awaitingSellers[senderNumber] = { ...seller };
            delete tempSellerRegistrations[senderNumber]; // Remove from temp memory
            delete userSessions[sender];
            
            console.log(`💾 Saving to awaiting_sellers.json...`);
            await saveAwaitingSellers();
            console.log(`✅ Successfully saved seller ${senderNumber} to awaiting_sellers.json`);
            
            // Send registration video to newly registered seller
            const registrationVideoPath = path.join(__dirname, 'public', 'videos', 'seller_registration.mp4');
            await sendMediaFile(sender, registrationVideoPath, 'Seller Registration Guide');
            
            return msg.reply(`✅ Thanks! Your store has been registered in the ${seller.category} category. Pending admin verification.`);
        }
    }

    // ---- Buyer Registration ----
    if (buyerSessions[sender] && !buyers[sender]) {
        const session = buyerSessions[sender];

        if (session.stage === 'ask_name') {
            // Store in temporary memory first
            tempBuyerRegistrations[sender] = tempBuyerRegistrations[sender] || {};
            tempBuyerRegistrations[sender].name = message;
            session.name = message;
            session.stage = 'ask_age';
            
            // Save temporary registration data
            await saveTempBuyerRegistrations();
            
            return msg.reply(`*Great*, thanks!\n\nCould you please share your age? This is a one-time step to ensure a safe and appropriate experience for everyone.\n➡️ *Type your age as a number* (e.g., 28).`);
        } else if (session.stage === 'ask_age') {
            // Store in temporary memory
            tempBuyerRegistrations[sender] = tempBuyerRegistrations[sender] || {};
            tempBuyerRegistrations[sender].age = message;
            session.age = message;
            session.stage = 'ask_location';
            
            // Save temporary registration data
            await saveTempBuyerRegistrations();
            
            return msg.reply(`Excellent. Now, the most important step to find *product availability* in your *area*.\n\nPlease *share your location* using the WhatsApp attach (📎) feature. This lets me connect you with sellers in your immediate vicinity. 📍`);
        } else if (msg.location && session.stage === 'ask_location') {
            // Store in temporary memory
            tempBuyerRegistrations[sender] = tempBuyerRegistrations[sender] || {};
            tempBuyerRegistrations[sender].location = msg.location;
            session.location = msg.location;
            
            // Save temporary registration data one last time
            await saveTempBuyerRegistrations();
            
            // Only now save to permanent storage after complete registration
            buyers[sender] = {
                name: tempBuyerRegistrations[sender].name,
                age: tempBuyerRegistrations[sender].age,
                location: tempBuyerRegistrations[sender].location
            };
            fs.writeFileSync(BUYERS_FILE, JSON.stringify(buyers, null, 2));
            
            // Clean up temporary storage
            delete tempBuyerRegistrations[sender];
            // Save the updated temporary registrations (without this user)
            await saveTempBuyerRegistrations();
            
            const buyerRegistrationVideoPath = path.join(__dirname, 'public', 'videos', 'buyer_registration.mp4');
            await sendMediaFile(sender, buyerRegistrationVideoPath, 'Buyer Registration Guide');
            
            delete buyerSessions[sender];
            return msg.reply(`✅ *You're all set!*\n\nWelcome to Bizz Bazzar. You're now ready to check product availability and compare prices at nearby stores.\n\nTo begin your first search, simply type *"start"*! ➡️`);
        }
    }

    // ---- New Structured Buyer Flow ----
    if (buyerSessions[sender]) {
        const session = buyerSessions[sender];
        // sender is already defined in the outer scope, no need to redefine it
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

        // --- Helper function to send timed messages for each step ---
        const sendStepMessage = async (stepOptions) => {
            const totalSteps = 5;
            const progressBar = Array.from({ length: totalSteps }, (_, i) => i < stepOptions.step ? '▰' : '▱').join('');
            const progressMsg = `Progress: ${progressBar}`;
            
            // 1. Send Progress message
            await client.sendMessage(sender, progressMsg);
            
            // 2. Wait 0.5 seconds
            await delay(500);
            
            // 3. Send Main message
            const mainMsg = buildBuyerStepMessage({ ...stepOptions, total: totalSteps });
            await client.sendMessage(sender, mainMsg);
        };

        // Step 1: Product Name (Mandatory)
if (session.stage === 'awaiting_product_name') {
    if (message === '0') {
        // Edit previous message - but there's no previous message in this step
        return msg.reply(`⚠️ This is the first step. Please enter a product name to proceed.`);
    }
    
    if (!message || message.length < 2) {
        return msg.reply(`⚠️ *Please enter a valid product name.*\n\nThis field is required to proceed.`);
    }
    
    session.productName = message;
    session.stage = 'awaiting_brand';
    
    await sendStepMessage({
        step: 2,
        question: `Got it. Searching for *${session.productName}*.

🏷️ Any specific BRAND in mind?
➡️ e.g., "Samsung", "Amul", "Tata"

↩️ Type 0 to go back
⏩ Type skip for any brand`,
        examples: [],
        summary: `📦 Product: ${session.productName}`
    });
    return;
}

        // Step 2: Brand (Optional)
if (session.stage === 'awaiting_brand') {
    if (message === '0') {
        // Edit previous message (product name)
        session.stage = 'awaiting_product_name';
        return msg.reply(`🔄 Let's edit the product name.\n\n📦 *Please enter the new product name:*`);
    } else if (message.toLowerCase() === 'skip') {
        session.brand = null;
    } else {
        session.brand = message;
    }
    
    session.stage = 'awaiting_quantity';
    
    if (session.isFirstTimeUser) {
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        await client.sendMessage(sender, "Perfect. And how many do you need?");
        await delay(1000);
        return client.sendMessage(sender, "➡️ *e.g., \"1 piece\", \"about 5\", \"2 kg\"*");
    } else {
        // Use the standard flow for returning users
        await sendStepMessage({
            step: 3,
            question: `Next, HOW MANY do you need?\n➡️ e.g., "1 litre bottle", "2 pieces", "5kg"\n\n↩️ Type 0 to go back`,
            examples: [],
            summary: `📦 Product: ${session.productName}\n🏷️ Brand: ${session.brand || 'Any'}`
        });
    }
    return;
}

        // Step 3: Quantity (Optional)
if (session.stage === 'awaiting_quantity') {
    if (message === '0') {
            // Edit previous message (brand)
            session.stage = 'awaiting_brand';
            return msg.reply(`🔄 Let's edit the brand.\n\n🏷️ *Please enter the new brand name:*\n\nOr type *"skip"* for no brand preference.`);
        } else if (message.toLowerCase() === 'skip') {
        session.quantity = null;
    } else {
        session.quantity = message;
    }
    
    session.stage = 'awaiting_requirements';
    
    if (session.isFirstTimeUser) {
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        await client.sendMessage(sender, "Almost there! Any other details I should know? Think about budget, color, size, etc.");
        await delay(1000);
        return client.sendMessage(sender, "➡️ *e.g., \"under ₹1000\" or \"must be blue\"*");
    } else {
        // Use the standard flow for returning users
        await sendStepMessage({
            step: 4,
            question: `📝 Any other DETAILS to add?\n➡️ e.g., "Under ₹500", "Red color only", "5 year warranty"\n\n↩️ Type 0 to go back\n⏩ Type skip if none`,
            examples: [],
            summary: `📦 Product: ${session.productName}\n🏷️ Brand: ${session.brand || 'Any'}\n🔢 Quantity: ${session.quantity || 'Not Specified'}`
        });
    }
    return;
}

        // Step 4: Special Requirements (Optional)
        if (session.stage === 'awaiting_requirements') {
            if (message === '0') {
                // Edit previous message (quantity)
                session.stage = 'awaiting_quantity';
                return msg.reply(`🔄 Let's edit the quantity.\n\n🔢 *Please enter the new quantity:*\n\nOr type *"skip"* for no quantity specification.`);
            } else if (message.toLowerCase() === 'skip') {
                session.requirements = null;
            } else {
                // Structure the requirements with bullet points if multi-line
                session.requirements = structureRequirements(message);
            }
            
            // Move to image request stage
            session.stage = 'awaiting_image';
            
            if (session.isFirstTimeUser) {
                const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
                await client.sendMessage(sender, "Perfect! One last thing - do you have a photo of the product?");
                await delay(1000);
                await client.sendMessage(sender, "📸 *Having a photo helps sellers understand exactly what you need!*");
                await delay(1000);
                return client.sendMessage(sender, "📷 *Send your product image now, or type 'skip' to continue without it.*");
            } else {
                return msg.reply("📸 **PRODUCT IMAGE** (Optional)\n\n🎯 *A photo helps sellers give you better matches!*\n\n📷 Send your product image\n⏩ Type 'skip' to continue without image\n↩️ Type 0 to go back");
            }
        }
        
        // Step 5: Product Image (Optional)
        if (session.stage === 'awaiting_image') {
            if (message === '0') {
                // Edit previous message (requirements)
                session.stage = 'awaiting_requirements';
                return msg.reply(`🔄 Let's edit the requirements.\n\n📝 *Please enter new requirements:*\n\nOr type *"skip"* for no special requirements.`);
            } else if (message.toLowerCase() === 'skip') {
                session.productImage = null;
            } else if (msg.hasMedia) {
                try {
                    const media = await msg.downloadMedia();
                    if (media.mimetype.startsWith('image/')) {
                        // Store the image data in session
                        session.productImage = {
                            data: media.data,
                            mimetype: media.mimetype,
                            filename: media.filename || 'product_image'
                        };
                        await client.sendMessage(sender, "✅ Image received! Processing your request...");
                    } else {
                        return msg.reply("⚠️ Please send an image file only. Type 'skip' to continue without an image.");
                    }
                } catch (error) {
                    console.error('Error downloading image:', error);
                    return msg.reply("❌ Error processing image. Type 'skip' to continue without an image.");
                }
            } else {
                return msg.reply("📸 *Please send your product image to help sellers understand what you need!*\n\n📷 Send an image file\n⏩ Type 'skip' to continue without image");
            }
            
            // Now categorize using AI
            session.stage = 'processing_category';
            
            const category = await categorizeProduct(session.productName, session.requirements);
            
            if (category === 'unknown') {
                // AI couldn't categorize, ask user to select
                session.stage = 'awaiting_manual_category';
                return msg.reply(getBuyerCategoryOptionsText());
            } else {
                // AI found category, proceed with confirmation
                session.category = category;
                session.stage = 'awaiting_final_confirmation';
                return await showFinalConfirmation(msg, session);
            }
        }

        // Step 6: Manual Category Selection (if AI failed)
        if (session.stage === 'awaiting_manual_category') {
            const categoryNum = parseInt(message);
            if (isNaN(categoryNum) || categoryNum < 3 || categoryNum > 16) {
                return msg.reply(`⚠️ *Please select a valid category:*\n\n` + getBuyerCategoryOptionsText());
            }
            
            // Get the category directly from the CATEGORIES object using the number as key
            session.category = CATEGORIES[categoryNum.toString()];
            session.stage = 'awaiting_final_confirmation';
            return await showFinalConfirmation(msg, session);
        }

        // Final confirmation
        if (session.stage === 'awaiting_final_confirmation') {
            const userResponse = message.toLowerCase().trim();
            
            if (userResponse === '1' || userResponse === 'confirm') {
                return await processCompleteRequest(msg, session);
            } else if (userResponse === '2' || userResponse === 'edit') {
                // Show field editing options
                session.stage = 'awaiting_edit_choice';
                
                // Unified edit message for all users
                const editMsg = `*Please select what you want to edit:*\n\n*1️⃣ Product Name:* ${session.productName}\n*2️⃣ Brand:* ${session.brand || 'Not specified'}\n*3️⃣ Quantity:* ${session.quantity || 'Not specified'}\n*4️⃣ Details:* ${session.requirements || 'Not specified'}\n*5️⃣ Image:* ${session.productImage ? 'Provided' : 'Not provided'}\n*6️⃣ Category:* ${session.category.toUpperCase()}\n*7️⃣ Start Over*\n\n*Type the number (1-7) of what you want to change.*`;
                return msg.reply(editMsg);
            } else if (userResponse === '0' || userResponse === 'back') {
                // Go back to the previous stage (requirements)
                session.stage = 'awaiting_requirements';
                
                // Use the standard flow for returning users
                await sendStepMessage({
                    step: 4,
                    question: "Any other details? (e.g., budget, color)",
                    examples: [
                        '• Under ₹30,000',
                        '• Organic certified',
                        '• Red color only'
                    ],
                    summary: `📦 Product: ${session.productName}\n🏷️ Brand: ${session.brand || 'Any'}\n🔢 Quantity: ${session.quantity || 'Not Specified'}`
                });
                return;
            } else {
                return msg.reply(`⚠️ Please select a valid option:\n\n*1️⃣ Confirm and send to sellers* ➡️ *Type 1*\n*2️⃣ Edit fields* ➡️ *Type 2*\n*0️⃣ Go Back* ➡️ *Type 0*`);
            }
        }


// Handle edit choice
if (session.stage === 'awaiting_edit_choice') {
    const choice = message.trim();
    
    switch(choice) {
        case '1':
            session.stage = 'edit_product_name';
            return msg.reply(`📦 *Please enter the new product name:*`);
        case '2':
            session.stage = 'edit_brand';
            return msg.reply(`🏷️ *Please enter the new brand name:*\n\nOr type *"skip"* for no brand preference.`);
        case '3':
            session.stage = 'edit_quantity';
            return msg.reply(`🔢 *Please enter the new quantity:*\n\nOr type *"skip"* for no quantity specification.`);
        case '4':
            session.stage = 'edit_requirements';
            return msg.reply(`📝 *Please enter the new requirements:*\n\nOr type *"skip"* for no special requirements.`);
        case '5':
            // Edit image
            session.stage = 'edit_image';
            return msg.reply(`📸 *Send a new product image:*\n\nOr type *"skip"* to remove the current image.`);
        case '6':
            // Edit category
            session.stage = 'edit_category';
            // Display category options
            return msg.reply(getBuyerCategoryOptionsText());
        case '7':
            // Reset to start of structured flow
            session.stage = 'awaiting_product_name';
            
            // Use the sendStepMessage function for consistency
            await sendStepMessage({
                step: 1,
                question: translate(sender, 'buyer.product_prompt'),
                examples: [
                    `• ${translate(sender, 'buyer.product_example1')}`,
                    `• ${translate(sender, 'buyer.product_example2')}`,
                    `• ${translate(sender, 'buyer.product_example3')}`,
                    `• ${translate(sender, 'buyer.product_example4')}`
                ],
                summary: "_nothing entered_"
            });
            return;
        default:
            return msg.reply(`⚠️ *Please select a valid option:*\n\n*1️⃣ Product Name* ➡️ *Type 1*\n*2️⃣ Brand* ➡️ *Type 2*\n*3️⃣ Quantity* ➡️ *Type 3*\n*4️⃣ Requirements* ➡️ *Type 4*\n*5️⃣ Image* ➡️ *Type 5*\n*6️⃣ Category* ➡️ *Type 6*\n*7️⃣ Start Over* ➡️ *Type 7*`);
    }
}
        
        // Handle individual field edits
        if (session.stage === 'edit_product_name') {
            if (!message || message.length < 2) {
                return msg.reply(`⚠️ *Please enter a valid product name.*\n\nThis field is required to proceed.`);
            }
            session.productName = message;
            
            // Re-categorize with AI when product name changes
            const category = await categorizeProduct(session.productName, session.requirements);
            
            if (category !== 'unknown') {
                // AI found category, update it
                session.category = category;
            }
            
            session.stage = 'awaiting_final_confirmation';
            return await showFinalConfirmation(msg, session);
        }
        
        if (session.stage === 'edit_brand') {
            if (message.toLowerCase() === 'skip') {
                session.brand = null;
            } else {
                session.brand = message;
            }
            session.stage = 'awaiting_final_confirmation';
            return await showFinalConfirmation(msg, session);
        }
        
        if (session.stage === 'edit_quantity') {
            if (message.toLowerCase() === 'skip') {
                session.quantity = null;
            } else {
                session.quantity = message;
            }
            session.stage = 'awaiting_final_confirmation';
            return await showFinalConfirmation(msg, session);
        }
        
        if (session.stage === 'edit_requirements') {
            if (message.toLowerCase() === 'skip') {
                session.requirements = null;
            } else {
                session.requirements = message;
            }
            session.stage = 'awaiting_final_confirmation';
            return await showFinalConfirmation(msg, session);
        }
        
        if (session.stage === 'edit_image') {
            if (message.toLowerCase() === 'skip') {
                session.productImage = null;
                session.stage = 'awaiting_final_confirmation';
                return await showFinalConfirmation(msg, session);
            } else if (msg.hasMedia) {
                try {
                    const media = await msg.downloadMedia();
                    
                    // Validate image type
                    if (!media.mimetype.startsWith('image/')) {
                        return msg.reply('❌ *Please send a valid image file.*');
                    }
                    
                    // Store image data
                    session.productImage = {
                        data: media.data,
                        mimetype: media.mimetype,
                        filename: media.filename || 'product_image'
                    };
                    
                    session.stage = 'awaiting_final_confirmation';
                    return await showFinalConfirmation(msg, session);
                } catch (error) {
                    console.error('Error downloading image:', error);
                    return msg.reply('❌ *Failed to process the image. Please try again.*');
                }
            } else {
                return msg.reply('📸 *Please send an image or type "skip" to remove the current image.*');
            }
        }
        
        // Handle category edit
        if (session.stage === 'edit_category') {
            const choice = parseInt(message.trim());
            
            if (isNaN(choice) || choice < 3 || choice > 16) {
                return msg.reply(`⚠️ *Please select a valid category:*\n\n` + getBuyerCategoryOptionsText());
            }
            
            // Update the category - get directly from CATEGORIES object using the number as key
            session.category = CATEGORIES[choice.toString()];
            
            // Move to final confirmation
            session.stage = 'awaiting_final_confirmation';
            return await showFinalConfirmation(msg, session);
        }
    }

    // ---- Admin Commands ----
    if (message?.startsWith('/verify ')) {
        const sellerNumber = message.split(' ')[1];
        console.log('🔍 Admin verification request for seller:', sellerNumber);
        
        // Check if seller is in awaiting_sellers
        if (awaitingSellers[sellerNumber]) {
            const seller = awaitingSellers[sellerNumber];
            console.log('📋 Found seller in awaiting_sellers:', seller.shop);
            
            // Move to verified sellers
            seller.verified = true;
            seller.verifiedAt = new Date().toISOString();
            sellers[sellerNumber] = seller;
            console.log('✅ Added seller to sellers object:', sellerNumber);
            console.log('📊 Sellers object now contains:', Object.keys(sellers));
            
            delete awaitingSellers[sellerNumber];
            console.log('🗑️ Removed seller from awaitingSellers');
            
            await saveVerifiedSellers();
            await saveAwaitingSellers();
            
            // Send verification notification to seller
            const category = seller.category;
            const sellerNumber_c = sellerNumber.includes('@c.us') ? sellerNumber : sellerNumber + '@c.us';
            try {
                await client.sendMessage(sellerNumber_c, `✅ You're now verified! Your shop is visible to buyers in *${category}*.`);
            } catch (err) {
                console.error('❌ Error sending verification message:', err.message);
            }
            
            return msg.reply(`✅ Seller ${seller.shop} has been verified and moved to active sellers!`);
        }
        // Check if seller is already verified
        else if (sellers[sellerNumber]) {
            return msg.reply(`ℹ️ Seller ${sellers[sellerNumber].shop} is already verified.`);
        }
        else {
            return msg.reply(`❌ Seller not found in awaiting verification. Use format: /verify <seller_number>`);
        }
    }
    
    if (message?.toLowerCase() === '/pending admin') {
        const awaitingEntries = Object.entries(awaitingSellers);
        if (awaitingEntries.length === 0) {
            return msg.reply(`✅ No pending verifications.`);
        }
        
        let response = `📋 *Pending Seller Verifications:*\n\n`;
        awaitingEntries.forEach(([number, data]) => {
            let categoryInfo = `${data.category}`;
            
            // Add additional categories if they exist
            if (data.additionalCategories && data.additionalCategories.length > 0) {
                categoryInfo += `\n  Additional Categories:\n`;
                data.additionalCategories.forEach(cat => {
                    categoryInfo += `  • ${cat}\n`;
                });
            }
            
            const registeredDate = data.registeredAt ? new Date(data.registeredAt).toLocaleDateString() : 'Unknown';
            response += `• ${data.shop} (${number}) - ${categoryInfo}\n  Registered: ${registeredDate}\n\n`;
        });
        response += `💡 Use /verify <number> to verify a seller.`;
        
        return msg.reply(response);
    }

    if (message?.toLowerCase() === '/sellers') {
        const allSellers = Object.entries(sellers);
        if (allSellers.length === 0) {
            return msg.reply(`📋 No sellers registered yet.`);
        }
        
        let response = `📋 *All Registered Sellers:*\n\n`;
        allSellers.forEach(([number, data]) => {
            const status = data.verified ? '✅ Verified' : '⏳ Pending';
            let categoryInfo = `  Primary Category: ${data.category}`;
            
            // Add additional categories if they exist
            if (data.additionalCategories && data.additionalCategories.length > 0) {
                categoryInfo += `\n  Additional Categories:`;
                data.additionalCategories.forEach(cat => {
                    categoryInfo += `\n  • ${cat}`;
                });
            }
            
            response += `• ${data.shop} (${number})\n${categoryInfo}\n  Status: ${status}\n\n`;
        });
        
        return msg.reply(response);
    }

    if (message?.toLowerCase() === '/help' || message?.toLowerCase() === 'help') {
        return msg.reply(`🤖 *Need Help?*

Please call one of these numbers for assistance:

1. *8870751384*
2. *9444525100*`);
    }
    
    // Check if this is a buyer with a recently completed request
    if (!userSessions[sender] && !msg.from.endsWith('@g.us')) {
        // Check if this is a buyer who recently completed a request
        const recentBuyer = Object.keys(sellerMessageMap).some(sellerNumber => {
            const mapping = sellerMessageMap[sellerNumber];
            return mapping && mapping.buyerId === sender;
        });
        
        if (recentBuyer) {
            return msg.reply(`✅ *Your order request has been sent and is being processed!*\n\n⏳ Please wait for sellers to respond to your request.\n\n🔄 If you want to place a new order, type *"start"* (your previous order will still be processed).`);
        }
    }
    
    // Default message for unrecognized commands (only if not in an active process)
    if (!userSessions[sender]) {
        // Only show the welcome message if the user has completed the buyer flow at least once
        // or if they're a first-time user who has completed their first request
        if (buyers[sender]) {
            // Check if this is a first-time user who has just completed their first request
            if (buyers[sender].firstRequestCompleted) {
                // Send a special welcome message for users who just completed their first request
                return msg.reply(`🎉 Thanks for completing your first request with Bizz Bazzar!

Your request has been sent to nearby sellers. Here's what you can do next:

✅ *start* – to make a new purchase request
🏪 *join seller* – if you're a seller and want to list your shop

Need help? Type */help*`);
            } else {
                // Regular welcome message for returning users
                return msg.reply(`👋 *Welcome back to Bizz Bazzar!*
_Your Gateway to Local Stores_
➖➖➖➖➖➖➖➖➖➖

*BUYER ZONE* 🛍️
To find any item in a nearby store,
type \`\`\`start\`\`\`

*SELLER ZONE* 🏪
Manage your shop or requests:
• \`\`\`join seller\`\`\`
• \`\`\`/pending\`\`\`
• \`\`\`cancel all\`\`\`

➖➖➖➖➖➖➖➖➖➖
For assistance, type \`\`\`/help\`\`\``);
            }
        } else {
            // For users who haven't completed the buyer flow, don't show the welcome message
            // Just let the first-time user flow handle it
            return;
        }
    }
    
    } catch (err) {
        console.error('❌ Handler error:', err);
        try { 
            await msg.reply('❌ An unexpected error occurred. Please try again or type "help".'); 
        } catch (err2) {}
    }
});

// Function to show final confirmation
async function showFinalConfirmation(msg, session) {
    const summary = `📦 **Product:** ${session.productName}\n` + 
                    `🏷️ **Brand:** ${session.brand || 'Any'}\n` + 
                    `🔢 **Quantity:** ${session.quantity || 'Not Specified'}\n` + 
                    `📝 **Details:** ${session.requirements || 'None'}\n` + 
                    `📸 **Image:** ${session.productImage ? 'Provided' : 'Not provided'}\n` + 
                    `📂 **Category:** ${(session.category || 'N/A').toUpperCase()}`;

    const cartMessage = `🛒 **Please confirm your request:**\n` + 
                        `➖➖➖➖➖➖➖➖➖➖\n` + 
                        `${summary}\n` + 
                        `➖➖➖➖➖➖➖➖➖➖\n\n` + 
                        `**1️⃣ Confirm & Find Sellers**\n` + 
                        `**2️⃣ Make a Change**\n\n` + 
                        `👉 Please reply with \`\`\`1\`\`\` or \`\`\`2\`\`\`. You can also type \`\`\`cancel\`\`\` to exit.`;

    // Send the text confirmation first
    await msg.reply(cartMessage);
    
    // If there's an image, send it as well
    if (session.productImage) {
        try {
            const MessageMedia = require('whatsapp-web.js').MessageMedia;
            const media = new MessageMedia(
                session.productImage.mimetype,
                session.productImage.data,
                session.productImage.filename
            );
            await client.sendMessage(msg.from, media, {
                caption: "📸 Your product image"
            });
        } catch (error) {
            console.error('Error sending confirmation image:', error);
        }
    }
}


// Function to format seller response with bold prices and better structure
function formatSellerResponse(message) {
    // Enhanced regex to capture prices with various formats
    const priceRegex = /((?:Rs\.?|₹|\$)?\s*[0-9,]+(?:\.[0-9]+)?(?:\s*(?:k|K|thousand|lakh|L|cr|million))?(?:\s*(?:Rs\.?|₹|\$))?)/g;
    
    // Make prices bold but DON'T add bullet points
    const formattedMessage = message.replace(priceRegex, '*$1*');
    
    // Return the message as-is without adding bullet points or splitting
    return formattedMessage.trim();
}


// Function to structure special requirements
function structureRequirements(requirements) {
    if (!requirements) return null;
    
    // Split by line breaks or bullet points
    const lines = requirements
        .split(/[\n•]+/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
    
    // If only one line, return as is
    if (lines.length <= 1) return requirements;
    
    // Format as bullet points
    return lines.map(line => `• ${line}`).join('\n');
}

// Function to process complete request
async function processCompleteRequest(msg, session) {
    try {
        const sender = msg.from;
        const senderNumber = sender.split('@')[0];
        
        // Create request message for individual sellers (includes Buyer ID)
        let sellerRequestMsg = `🛒 *New Buyer Request*\n\n`;
        sellerRequestMsg += `📦 Product: ${session.productName}\n`;
        if (session.brand) {
            sellerRequestMsg += `🏷️ Brand: ${session.brand}\n`;
        }
        if (session.quantity) {
            sellerRequestMsg += `🔢 Quantity: ${session.quantity}\n`;
        }
        if (session.requirements) {
            sellerRequestMsg += `📝 Requirements: ${session.requirements}\n`;
        }
        sellerRequestMsg += `\n💬 *IMPORTANT:* Please use WhatsApp's reply feature to respond to this specific message. Long-press this message and select 'Reply' to ensure your response is correctly processed.\n\n📝 Include your price and availability in your reply.\n\n❌ Type *"cancel all"* to cancel all your active orders.`;

        // Create request message for group (without Buyer ID and without cancel all)
        let groupRequestMsg = `🛒 *New Buyer Request*\n\n`;
        groupRequestMsg += `📦 Product: ${session.productName}\n`;
        if (session.brand) {
            groupRequestMsg += `🏷️ Brand: ${session.brand}\n`;
        }
        if (session.quantity) {
            groupRequestMsg += `🔢 Quantity: ${session.quantity}\n`;
        }
        if (session.requirements) {
            groupRequestMsg += `📝 Requirements: ${session.requirements}\n`;
        }
        groupRequestMsg += `\n💬 *IMPORTANT:* Please use WhatsApp's reply feature to respond to this specific message. Long-press this message and select 'Reply' to ensure your response is correctly processed.\n\n📝 Include your price and availability in your reply.`;

        const groupId = CATEGORY_GROUP_MAP[session.category];
        // Get verified sellers using the updated function that handles both boolean and string 'true'
        const verifiedSellers = getVerifiedSellersByCategory(session.category);
        
        // SUPERMARKET FUNCTIONALITY: Always include supermarket sellers and group
        const supermarketSellers = getVerifiedSellersByCategory('supermarket');
        const supermarketGroupId = CATEGORY_GROUP_MAP.supermarket;
        
        // Combine original category sellers with supermarket sellers (avoid duplicates)
        const allSellers = [...verifiedSellers];
        supermarketSellers.forEach(supermarketSeller => {
            const isDuplicate = allSellers.some(seller => seller.number === supermarketSeller.number);
            if (!isDuplicate) {
                allSellers.push(supermarketSeller);
            }
        });

        console.log(`🔍 Found ${verifiedSellers.length} verified sellers for category: ${session.category}`);
        console.log(`🔍 Found ${supermarketSellers.length} supermarket sellers`);
        console.log(`🔍 Total sellers (including supermarket): ${allSellers.length}`);

        if (allSellers.length === 0) {
            msg.reply(`❌ No verified sellers available in the ${session.category} category yet. Please try again later.\n\nType *"start"* to begin a new search in a different category.`);
            delete buyerSessions[sender];
            delete userSessions[sender]; // Also clear the user session to ensure 'start' trigger works
            return;
        }

        // Send to original category GROUP first (without buyer ID)
        if (groupId) {
            try {
                await client.sendMessage(groupId, groupRequestMsg);
                
                // Send image to group if available
                if (session.productImage) {
                    try {
                        const MessageMedia = require('whatsapp-web.js').MessageMedia;
                        const media = new MessageMedia(
                            session.productImage.mimetype,
                            session.productImage.data,
                            session.productImage.filename
                        );
                        await client.sendMessage(groupId, media, {
                            caption: "📸 Product image from buyer"
                        });
                        console.log(`📸 Sent product image to group: ${groupId}`);
                    } catch (imageError) {
                        console.error(`❌ Failed to send image to group:`, imageError);
                    }
                }
                
                console.log(`📤 Request sent to group: ${groupId}`);
            } catch (error) {
                console.error(`❌ Failed to send to group:`, error);
            }
        }
        
        // SUPERMARKET FUNCTIONALITY: Always send to supermarket group as well
        if (supermarketGroupId && supermarketGroupId !== groupId) {
            try {
                await client.sendMessage(supermarketGroupId, groupRequestMsg);
                
                // Send image to supermarket group if available
                if (session.productImage) {
                    try {
                        const MessageMedia = require('whatsapp-web.js').MessageMedia;
                        const media = new MessageMedia(
                            session.productImage.mimetype,
                            session.productImage.data,
                            session.productImage.filename
                        );
                        await client.sendMessage(supermarketGroupId, media, {
                            caption: "📸 Product image from buyer"
                        });
                        console.log(`📸 Sent product image to supermarket group: ${supermarketGroupId}`);
                    } catch (imageError) {
                        console.error(`❌ Failed to send image to supermarket group:`, imageError);
                    }
                }
                
                console.log(`📤 Request sent to supermarket group: ${supermarketGroupId}`);
            } catch (error) {
                console.error(`❌ Failed to send to supermarket group:`, error);
            }
        }

        // Send to each individual verified seller including supermarket sellers (with buyer ID)
        let successCount = 0;
        for (const seller of allSellers) {
            // Skip paused sellers - this check is already correct
            if (sellers[seller.number]?.paused === true || sellers[seller.number]?.paused === 'true') {
                console.log(`⏸️ Skipping paused seller: ${seller.data.shop} (${seller.number})`);
                continue;
            }
            
            try {
                // Send text message first
                await client.sendMessage(seller.number, sellerRequestMsg);
                
                // Send image if available
                if (session.productImage) {
                    try {
                        const MessageMedia = require('whatsapp-web.js').MessageMedia;
                        const media = new MessageMedia(
                            session.productImage.mimetype,
                            session.productImage.data,
                            session.productImage.filename
                        );
                        await client.sendMessage(seller.number, media, {
                            caption: "📸 Product image from buyer"
                        });
                        console.log(`📸 Sent product image to seller: ${seller.data.shop}`);
                    } catch (imageError) {
                        console.error(`❌ Failed to send image to seller ${seller.number}:`, imageError);
                    }
                }
                
                // Create unique key for each request using seller number + buyer ID + timestamp
                const timestamp = Date.now();
                const requestKey = `${seller.number}_${sender}_${timestamp}`;
                sellerMessageMap[requestKey] = {
                    sellerNumber: seller.number,
                    buyerId: sender,
                    category: session.category,
                    requestData: {
                        product: session.productName,
                        brand: session.brand,
                        quantity: session.quantity,
                        requirements: session.requirements,
                        hasImage: !!session.productImage
                    },
                    timestamp: timestamp,
                    requestId: timestamp // Add a unique request ID for easier tracking
                };
                
                console.log(`📤 Sent request to seller: ${seller.data.shop} (${seller.number})`);
                successCount++;
            } catch (error) {
                console.error(`❌ Failed to send to seller ${seller.number}:`, error);
            }
        }

        await saveSellerMessages();

        // --- New Final Message Sequence for ALL users ---
        await client.sendMessage(sender, 
            `⚡️ **On it!**\n` + 
            `I'm sending your request to verified local sellers right now.\n` + 
            `You'll get a message here as soon as they respond!\n\n` + 
            `Sit back and relax! ☕️`
        );
        
        // Add a 1-second delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await client.sendMessage(sender, `💬 If you get stuck or have any questions, just type \`\`\`help\`\`\`.`);
        
        // Check if this was a first-time user (not already in buyers object or marked as isFirstTimeUser)
        if (!buyers[sender] || session.isFirstTimeUser) {
            // Add user to buyers object with minimal information
            buyers[sender] = {
                name: "User", // Default name
                firstRequestCompleted: true,
                firstRequestTimestamp: Date.now()
            };
            
            // Save the updated buyers data
            await saveBuyerData();
            console.log(`✅ Added first-time user ${sender} to buyers object`);
        } else if (buyers[sender].firstRequestCompleted) {
            // If this is a subsequent request from a first-time user,
            // reset the firstRequestCompleted flag after they've seen the special welcome message
            // This ensures they'll see the regular welcome message on future interactions
            setTimeout(async () => {
                if (buyers[sender] && buyers[sender].firstRequestCompleted) {
                    buyers[sender].firstRequestCompleted = false;
                    await saveBuyerData();
                    console.log(`✅ Reset firstRequestCompleted flag for user ${sender}`);
                }
            }, 60000); // Wait 1 minute before resetting to ensure they see the special message
        }
        
        // Clear buyer session completely
        delete buyerSessions[sender];
        
        // Also clear any other session types for this buyer
        if (userSessions[sender]) {
            delete userSessions[sender];
        }
        if (sellerSessions[sender]) {
            delete sellerSessions[sender];
        }
        
    } catch (error) {
        console.error('❌ Error processing request:', error);
        msg.reply(`❌ Sorry, there was an error processing your request. Please try again.`);
        delete buyerSessions[sender];
    }
}

// Ensure video directories exist
function ensureDirectoriesExist() {
    try {
        const fs = require('fs');
        const path = require('path');
        const publicDir = path.join(__dirname, 'public');
        const videosDir = path.join(publicDir, 'videos');
        
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
            console.log('Created public directory');
        }
        
        if (!fs.existsSync(videosDir)) {
            fs.mkdirSync(videosDir, { recursive: true });
            console.log('Created videos directory');
        }
        
        console.log('Directories checked and created if needed');
    } catch (error) {
        console.error('Error creating directories:', error);
    }
}

// Function to cleanup old seller messages
async function cleanupOldSellerMessages() {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    for (const key of Object.keys(sellerMessageMap)) {
        if (sellerMessageMap[key].timestamp && sellerMessageMap[key].timestamp < oneDayAgo) {
            const sellerNum = sellerMessageMap[key].sellerNumber;
            try {
                await client.sendMessage(
                    sellerNum,
                    `⏰ An old buyer request has expired and is removed from your pending list.`
                );
            } catch (e) {}
            delete sellerMessageMap[key];
        }
    }
    
    await saveSellerMessages();
    cleanupSellerReminders();
}

// Cleanup seller reminders helper
function cleanupSellerReminders() {
    for (const sellerId in reminderTimers) {
        if (!sellerMessageMap[sellerId]) {
            clearTimeout(reminderTimers[sellerId]);
            delete reminderTimers[sellerId];
        }
    }
}

// Start the client
(async () => {
    try {
        console.log('Starting WhatsApp bot...');
        ensureDirectoriesExist();
        await client.initialize();
        
        // Set up periodic cleanup of old seller messages (every hour)
        setInterval(() => {
            cleanupOldSellerMessages().catch(err => 
                console.error('Cleanup error:', err)
            );
        }, 60 * 60 * 1000);
    } catch (error) {
        console.error('Failed to initialize WhatsApp client:', error);
        process.exit(1);
    }
})();