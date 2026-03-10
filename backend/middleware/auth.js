/**
 * Authentication Middleware
 * Shared middleware for protected routes
 */

const fs = require('fs');
const path = require('path');

// Database file path
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

/**
 * Helper function to read users data from JSON file
 * @returns {Array} Array of user objects
 */
function readUsers() {
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch (error) {
        console.error('Error reading users file:', error);
        return [];
    }
}

/**
 * Authentication middleware
 * Checks if user is logged in via session
 */
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({
            error: 'Unauthorized. Please login.'
        });
    }
}

module.exports = {
    requireAuth,
    readUsers
};