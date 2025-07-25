// Session model for managing user sessions

/**
 * Create a new session object
 * @param {string} phone - The user's phone number
 * @param {string} type - The session type ('seller' or 'buyer')
 * @returns {Object} - The session object
 */
function createSession(phone, type) {
    return {
        phone,
        type,
        startTime: Date.now(),
        lastActivity: Date.now(),
        data: {}
    };
}

/**
 * Update a session's activity timestamp
 * @param {Object} session - The session object
 * @returns {Object} - The updated session object
 */
function updateSessionActivity(session) {
    return {
        ...session,
        lastActivity: Date.now()
    };
}

/**
 * Store data in a session
 * @param {Object} session - The session object
 * @param {string} key - The data key
 * @param {*} value - The data value
 * @returns {Object} - The updated session object
 */
function setSessionData(session, key, value) {
    const updatedSession = { ...session };
    
    if (!updatedSession.data) {
        updatedSession.data = {};
    }
    
    updatedSession.data[key] = value;
    updatedSession.lastActivity = Date.now();
    
    return updatedSession;
}

/**
 * Get data from a session
 * @param {Object} session - The session object
 * @param {string} key - The data key
 * @returns {*} - The data value or null if not found
 */
function getSessionData(session, key) {
    if (!session || !session.data) {
        return null;
    }
    
    return session.data[key] || null;
}

/**
 * Find a session by phone number
 * @param {Object} sessions - Map of sessions
 * @param {string} phone - The phone number to search for
 * @returns {Object|null} - The session object or null if not found
 */
function findSessionByPhone(sessions, phone) {
    return sessions[phone] || null;
}

/**
 * End a session
 * @param {Object} sessions - Map of sessions
 * @param {string} phone - The phone number of the session to end
 * @returns {Object} - The updated sessions map
 */
function endSession(sessions, phone) {
    const updatedSessions = { ...sessions };
    delete updatedSessions[phone];
    return updatedSessions;
}

/**
 * Clean up inactive sessions
 * @param {Object} sessions - Map of sessions
 * @param {number} maxInactiveTime - Maximum inactive time in milliseconds
 * @returns {Object} - The updated sessions map
 */
function cleanupInactiveSessions(sessions, maxInactiveTime = 30 * 60 * 1000) { // Default: 30 minutes
    const now = Date.now();
    const updatedSessions = { ...sessions };
    
    Object.keys(updatedSessions).forEach(phone => {
        const session = updatedSessions[phone];
        if (now - session.lastActivity > maxInactiveTime) {
            delete updatedSessions[phone];
        }
    });
    
    return updatedSessions;
}

module.exports = {
    createSession,
    updateSessionActivity,
    setSessionData,
    getSessionData,
    findSessionByPhone,
    endSession,
    cleanupInactiveSessions
};