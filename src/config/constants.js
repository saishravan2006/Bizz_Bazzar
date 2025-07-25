// Configuration constants for Bizz Bazzar
const path = require('path');

// Render persistent disk path
const PERSISTENT_DIR = '/var/data';

// File paths for data storage - using Render persistent disk
const FILE_PATHS = {
    SELLERS_FILE: path.join(PERSISTENT_DIR, 'sellers.json'), // Verified sellers
    AWAITING_SELLERS_FILE: path.join(PERSISTENT_DIR, 'awaiting_sellers.json'), // Completed but unverified
    INCOMPLETE_REG_SELLERS_FILE: path.join(PERSISTENT_DIR, 'incomplete_reg_sellers.json'), // Cancelled/incomplete
    BUYERS_FILE: path.join(PERSISTENT_DIR, 'buyers.json'),
    SELLER_MESSAGES_FILE: path.join(PERSISTENT_DIR, 'seller_messages.json')
};

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

// Category to WhatsApp group mapping
const CATEGORY_GROUP_MAP = {
    electricals: '120363419554098698@g.us',
    electronics: '120363419554098698@g.us', // Using same group as electricals for now
    pharmaceuticals_health: '120363419421502705@g.us',
    houseware: '120363403001587464@g.us',
    ayurveda_siddha: '120363419421502705@g.us', // Using same group as pharmaceuticals for now
    computers_computer_accessories: '120363419554098698@g.us', // Using same group as electricals for now
    automobile_spares: '120363419554098698@g.us', // Using same group as electricals for now
    battery_products: '120363419554098698@g.us', // Using same group as electricals for now
    sports_equipment: '120363403001587464@g.us', // Using same group as houseware for now
    mobiles_mobile_accessories: '120363419554098698@g.us', // Using same group as electricals for now
    hardware_construction: '120363419554098698@g.us', // Using same group as electricals for now
    grocery: '120363403001587464@g.us', // Using same group as houseware for now
    stationary_office: '120363403001587464@g.us', // Using same group as houseware for now
    fancy_gifts_toys: '120363402453594985@g.us',
    supermarket: 'PLACEHOLDER_FOR_SUPERMARKET_GROUP' // Will be updated when group is found
};

// AI API configuration
const AI_CONFIG = {
    API_KEY: process.env.AI_API_KEY || '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',
    BASE_URL: process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1',
    MODEL: 'deepseek/deepseek-chat-v3-0324:free',
    TEMPERATURE: 0.3,
    MAX_TOKENS: 500
};

module.exports = {
    FILE_PATHS,
    CATEGORIES,
    CATEGORY_GROUP_MAP,
    AI_CONFIG
};