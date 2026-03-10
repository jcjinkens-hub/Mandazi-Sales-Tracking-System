const express = require('express');
const router = express.Router();
const db = require('./database');

// Auth routes

// Signup route
router.post('/signup', async (req, res) => {
    try {
        const {
            username,
            phoneNumber,
            password,
            confirmPassword
        } = req.body;

        // Validate input
        if (!username || !phoneNumber || !password || !confirmPassword) {
            return res.status(400).json({
                error: 'All fields are required'
            });
        }

        // Check if passwords match
        if (password !== confirmPassword) {
            return res.status(400).json({
                error: 'Passwords do not match'
            });
        }

        // Check password length
        if (password.length < 6) {
            return res.status(400).json({
                error: 'Password must be at least 6 characters'
            });
        }

        // Check if username already exists
        const existingUser = await db.findUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({
                error: 'Username already taken'
            });
        }

        // Check if phone number already exists
        const existingPhone = await db.findUserByPhone(phoneNumber);
        if (existingPhone) {
            return res.status(400).json({
                error: 'Phone number already registered'
            });
        }

        // Create new user
        const newUser = await db.createUser(username, phoneNumber, password);

        res.status(201).json({
            message: 'Account created successfully',
            user: {
                id: newUser.id,
                username: newUser.username
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            error: 'Server error during registration'
        });
    }
});

// Login route
router.post('/login', async (req, res) => {
    try {
        const {
            username,
            password
        } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                error: 'Username and password are required'
            });
        }

        // Find user by username
        const user = await db.findUserByUsername(username);
        if (!user) {
            return res.status(401).json({
                error: 'Invalid username or password'
            });
        }

        // Compare password
        const isMatch = await db.comparePassword(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({
                error: 'Invalid username or password'
            });
        }

        // Record login
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
        await db.recordLogin(user.id, ipAddress);

        // Set session
        req.session.userId = user.id;
        req.session.username = user.username;

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                phone_number: user.phone_number,
                profile_picture: user.profile_picture,
                date_created: user.date_created
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Server error during login'
        });
    }
});

// Logout route
router.post('/logout', (req, res) => {
    try {
        if (req.session.userId) {
            db.recordLogout(req.session.userId);
        }

        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({
                    error: 'Error logging out'
                });
            }
            res.json({
                message: 'Logout successful'
            });
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Server error during logout'
        });
    }
});

// Forgot password - verify account
router.post('/forgot-password/verify', async (req, res) => {
    try {
        const {
            username,
            phoneNumber
        } = req.body;

        if (!username || !phoneNumber) {
            return res.status(400).json({
                error: 'Username and phone number are required'
            });
        }

        // Find user
        const user = await db.findUserByUsername(username);
        if (!user) {
            return res.status(404).json({
                error: 'Account verification failed'
            });
        }

        // Check phone number matches
        if (user.phone_number !== phoneNumber) {
            return res.status(404).json({
                error: 'Account verification failed'
            });
        }

        res.json({
            message: 'Account verified successfully',
            userId: user.id
        });

    } catch (error) {
        console.error('Forgot password verify error:', error);
        res.status(500).json({
            error: 'Server error'
        });
    }
});

// Forgot password - reset
router.post('/forgot-password/reset', async (req, res) => {
    try {
        const {
            userId,
            newPassword,
            confirmPassword
        } = req.body;

        if (!userId || !newPassword || !confirmPassword) {
            return res.status(400).json({
                error: 'All fields are required'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                error: 'Passwords do not match'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                error: 'Password must be at least 6 characters'
            });
        }

        // Update password
        await db.updatePassword(userId, newPassword);

        res.json({
            message: 'Password reset successfully'
        });

    } catch (error) {
        console.error('Forgot password reset error:', error);
        res.status(500).json({
            error: 'Server error'
        });
    }
});

// Check auth status
router.get('/status', (req, res) => {
    if (req.session.userId) {
        res.json({
            authenticated: true,
            user: {
                id: req.session.userId,
                username: req.session.username
            }
        });
    } else {
        res.json({
            authenticated: false
        });
    }
});

module.exports = router;