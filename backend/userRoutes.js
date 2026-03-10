const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads', 'profile_pictures');

        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, {
                recursive: true
            });
        }

        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const userId = req.session.userId;
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `user_${userId}_${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only JPG and PNG images are allowed'));
        }
    }
});

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({
            error: 'Authentication required'
        });
    }
    next();
};

// Get user profile
router.get('/profile', requireAuth, async (req, res) => {
    try {
        const user = await db.findUserById(req.session.userId);

        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        // Get revenue stats
        const totalRevenue = await db.getTotalRevenue(req.session.userId);
        const dailyEarnings = await db.getDailyEarnings(req.session.userId);
        const weeklyEarnings = await db.getWeeklyEarnings(req.session.userId);
        const monthlyEarnings = await db.getMonthlyEarnings(req.session.userId);

        // Get recent sales
        const sales = await db.getSalesByUser(req.session.userId);
        const recentSales = sales.slice(0, 10);

        res.json({
            user: {
                id: user.id,
                username: user.username,
                phone_number: user.phone_number,
                profile_picture: user.profile_picture,
                date_created: user.date_created
            },
            stats: {
                totalRevenue,
                dailyEarnings,
                weeklyEarnings,
                monthlyEarnings
            },
            recentSales
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            error: 'Server error'
        });
    }
});

// Update username
router.post('/update-username', requireAuth, async (req, res) => {
    try {
        const {
            newUsername
        } = req.body;

        if (!newUsername) {
            return res.status(400).json({
                error: 'Username is required'
            });
        }

        // Check if username already exists (excluding current user)
        const existingUser = await db.findUserByUsername(newUsername);
        if (existingUser && existingUser.id !== req.session.userId) {
            return res.status(400).json({
                error: 'Username already taken'
            });
        }

        await db.updateUsername(req.session.userId, newUsername);

        // Update session
        req.session.username = newUsername;

        res.json({
            message: 'Username updated successfully'
        });

    } catch (error) {
        console.error('Update username error:', error);
        res.status(500).json({
            error: 'Server error'
        });
    }
});

// Update password
router.post('/update-password', requireAuth, async (req, res) => {
    try {
        const {
            currentPassword,
            newPassword,
            confirmPassword
        } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
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

        // Verify current password
        const user = await db.findUserById(req.session.userId);
        const isMatch = await db.comparePassword(currentPassword, user.password_hash);

        if (!isMatch) {
            return res.status(400).json({
                error: 'Current password is incorrect'
            });
        }

        await db.updatePassword(req.session.userId, newPassword);

        res.json({
            message: 'Password updated successfully'
        });

    } catch (error) {
        console.error('Update password error:', error);
        res.status(500).json({
            error: 'Server error'
        });
    }
});

// Upload profile picture
router.post('/upload-picture', requireAuth, upload.single('profilePicture'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No file uploaded'
            });
        }

        const picturePath = `/uploads/profile_pictures/${req.file.filename}`;
        await db.updateProfilePicture(req.session.userId, picturePath);

        res.json({
            message: 'Profile picture uploaded successfully',
            profile_picture: picturePath
        });

    } catch (error) {
        console.error('Upload picture error:', error);
        res.status(500).json({
            error: 'Server error'
        });
    }
}, (error, req, res, next) => {
    res.status(400).json({
        error: error.message
    });
});

// Get user preferences
router.get('/preferences', requireAuth, async (req, res) => {
    try {
        const preferences = await db.getUserPreferences(req.session.userId);
        res.json(preferences);
    } catch (error) {
        console.error('Get preferences error:', error);
        res.status(500).json({
            error: 'Server error'
        });
    }
});

// Update user preferences
router.post('/preferences', requireAuth, async (req, res) => {
    try {
        const {
            theme,
            layout
        } = req.body;

        await db.updateUserPreferences(req.session.userId, theme, layout);

        res.json({
            message: 'Preferences updated successfully'
        });
    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({
            error: 'Server error'
        });
    }
});

// Create a new sale
router.post('/sales', requireAuth, async (req, res) => {
    try {
        const {
            customerName,
            quantity,
            price
        } = req.body;

        if (!customerName || !quantity || !price) {
            return res.status(400).json({
                error: 'All fields are required'
            });
        }

        if (quantity < 1 || price < 0) {
            return res.status(400).json({
                error: 'Invalid quantity or price'
            });
        }

        const sale = await db.createSale(req.session.userId, customerName, quantity, price);

        res.status(201).json({
            message: 'Sale recorded successfully',
            sale: {
                id: sale.id,
                total: sale.total
            }
        });

    } catch (error) {
        console.error('Create sale error:', error);
        res.status(500).json({
            error: 'Server error'
        });
    }
});

// Get all sales
router.get('/sales', requireAuth, async (req, res) => {
    try {
        const sales = await db.getSalesByUser(req.session.userId);
        res.json(sales);
    } catch (error) {
        console.error('Get sales error:', error);
        res.status(500).json({
            error: 'Server error'
        });
    }
});

// Delete a sale
router.delete('/sales/:id', requireAuth, async (req, res) => {
    try {
        await db.deleteSale(req.params.id, req.session.userId);
        res.json({
            message: 'Sale deleted successfully'
        });
    } catch (error) {
        console.error('Delete sale error:', error);
        res.status(500).json({
            error: 'Server error'
        });
    }
});

// Get revenue stats
router.get('/revenue', requireAuth, async (req, res) => {
    try {
        const totalRevenue = await db.getTotalRevenue(req.session.userId);
        const dailyEarnings = await db.getDailyEarnings(req.session.userId);
        const weeklyEarnings = await db.getWeeklyEarnings(req.session.userId);
        const monthlyEarnings = await db.getMonthlyEarnings(req.session.userId);

        res.json({
            totalRevenue,
            dailyEarnings,
            weeklyEarnings,
            monthlyEarnings
        });
    } catch (error) {
        console.error('Get revenue error:', error);
        res.status(500).json({
            error: 'Server error'
        });
    }
});

module.exports = router;