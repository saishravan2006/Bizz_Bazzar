// Geo utility functions for location-based features

/**
 * Calculate the distance between two geographic coordinates
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {string} - Distance in kilometers with one decimal place
 */
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

/**
 * Format a location link for WhatsApp
 * @param {number} latitude - The latitude coordinate
 * @param {number} longitude - The longitude coordinate
 * @returns {string} - Formatted Google Maps link
 */
function formatLocationLink(latitude, longitude) {
    return `https://maps.google.com/maps?q=${latitude},${longitude}`;
}

module.exports = {
    calculateDistance,
    formatLocationLink
};