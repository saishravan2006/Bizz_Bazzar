// File system utility functions
const fs = require('fs');
const path = require('path');

/**
 * Ensure that required directories exist, creating them if necessary
 */
function ensureDirectoriesExist() {
    try {
        const publicDir = path.join(__dirname, '../../public');
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

/**
 * Send a media file to a WhatsApp user
 * @param {Object} client - The WhatsApp client instance
 * @param {string} sender - The recipient's phone number
 * @param {string} filePath - Path to the media file
 * @param {string} caption - Optional caption for the media
 */
async function sendMediaFile(client, sender, filePath, caption) {
    try {
        const { MessageMedia } = require('whatsapp-web.js');
        if (fs.existsSync(filePath)) {
            const media = MessageMedia.fromFilePath(filePath);
            await client.sendMessage(sender, media, { caption });
        }
    } catch (err) {
        console.error('❌ Error sending media file:', err.message);
    }
}

module.exports = {
    ensureDirectoriesExist,
    sendMediaFile
};