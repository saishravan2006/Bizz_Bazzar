// AI utility functions for product categorization and other AI tasks
const axios = require('axios');
const { AI_CONFIG } = require('../config/constants');

/**
 * Make a request to the AI API
 * @param {string} prompt - The prompt to send to the AI
 * @returns {Promise<string>} - The AI response
 */
async function makeAIRequest(prompt) {
    try {
        const response = await axios.post(
            `${AI_CONFIG.BASE_URL}/chat/completions`,
            {
                model: AI_CONFIG.MODEL,
                messages: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                    { role: 'user', content: prompt }
                ],
                temperature: AI_CONFIG.TEMPERATURE,
                max_tokens: AI_CONFIG.MAX_TOKENS
            },
            {
                headers: {
                    'Authorization': `Bearer ${AI_CONFIG.API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error making AI request:', error.message);
        if (error.response) {
            console.error('API response:', error.response.data);
        }
        return 'Error processing your request with AI.';
    }
}

/**
 * Categorize a product using AI
 * @param {string} productDescription - The product description to categorize
 * @param {Object} categories - The available categories
 * @returns {Promise<string>} - The category key
 */
async function categorizeProductWithAI(productDescription, categories) {
    try {
        const categoryOptions = Object.entries(categories)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');

        const prompt = `Categorize the following product into one of these categories:\n\n${categoryOptions}\n\nProduct: ${productDescription}\n\nRespond with ONLY the category number (3-16).`;

        const response = await makeAIRequest(prompt);
        
        // Extract just the number from the response
        const categoryMatch = response.match(/\d+/);
        if (categoryMatch && categories[categoryMatch[0]]) {
            return categoryMatch[0];
        }
        
        // Default to category 15 (electricals) if no valid category is found
        return '15';
    } catch (error) {
        console.error('Error categorizing product with AI:', error);
        return '15'; // Default to category 15 (electricals) on error
    }
}

module.exports = {
    makeAIRequest,
    categorizeProductWithAI
};