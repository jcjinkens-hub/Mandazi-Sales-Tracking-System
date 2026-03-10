const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'msts.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

function initializeDatabase() {
    // Create users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            phone_number TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            profile_picture TEXT DEFAULT NULL,
            date_created DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('Error creating users table:', err.message);
    });

    // Create login_history table
    db.run(`
        CREATE TABLE IF NOT EXISTS login_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            logout_time DATETIME DEFAULT NULL,
            ip_address TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) console.error('Error creating login_history table:', err.message);
    });

    // Create sales table
    db.run(`
        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            customer_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            total REAL NOT NULL,
            date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) console.error('Error creating sales table:', err.message);
    });

    // Create user_preferences table
    db.run(`
        CREATE TABLE IF NOT EXISTS user_preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            theme TEXT DEFAULT 'light',
            layout TEXT DEFAULT 'default',
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) console.error('Error creating user_preferences table:', err.message);
    });

    console.log('Database tables initialized successfully');
}

// Helper function to hash passwords
async function hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

// Helper function to compare passwords
async function comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

// User operations
function createUser(username, phoneNumber, password) {
    return new Promise(async (resolve, reject) => {
        try {
            const passwordHash = await hashPassword(password);

            db.run(
                `INSERT INTO users (username, phone_number, password_hash) VALUES (?, ?, ?)`,
                [username, phoneNumber, passwordHash],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        // Create default user preferences
                        db.run(
                            `INSERT INTO user_preferences (user_id) VALUES (?)`,
                            [this.lastID],
                            (prefErr) => {
                                if (prefErr) console.error('Error creating preferences:', prefErr);
                            }
                        );
                        resolve({
                            id: this.lastID,
                            username,
                            phone_number: phoneNumber
                        });
                    }
                }
            );
        } catch (error) {
            reject(error);
        }
    });
}

function findUserByUsername(username) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
}

function findUserByPhone(phoneNumber) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM users WHERE phone_number = ?`, [phoneNumber], (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
}

function findUserById(id) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT id, username, phone_number, profile_picture, date_created FROM users WHERE id = ?`, [id], (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
}

function updatePassword(userId, newPassword) {
    return new Promise(async (resolve, reject) => {
        try {
            const passwordHash = await hashPassword(newPassword);
            db.run(
                `UPDATE users SET password_hash = ? WHERE id = ?`,
                [passwordHash, userId],
                function(err) {
                    if (err) reject(err);
                    resolve({
                        success: true
                    });
                }
            );
        } catch (error) {
            reject(error);
        }
    });
}

function updateUsername(userId, newUsername) {
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE users SET username = ? WHERE id = ?`,
            [newUsername, userId],
            function(err) {
                if (err) reject(err);
                resolve({
                    success: true
                });
            }
        );
    });
}

function updateProfilePicture(userId, picturePath) {
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE users SET profile_picture = ? WHERE id = ?`,
            [picturePath, userId],
            function(err) {
                if (err) reject(err);
                resolve({
                    success: true
                });
            }
        );
    });
}

// Login history operations
function recordLogin(userId, ipAddress) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO login_history (user_id, ip_address) VALUES (?, ?)`,
            [userId, ipAddress],
            function(err) {
                if (err) reject(err);
                resolve({
                    id: this.lastID
                });
            }
        );
    });
}

function recordLogout(userId) {
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE login_history SET logout_time = CURRENT_TIMESTAMP WHERE user_id = ? AND logout_time IS NULL ORDER BY login_time DESC LIMIT 1`,
            [userId],
            function(err) {
                if (err) reject(err);
                resolve({
                    success: true
                });
            }
        );
    });
}

function getLastLogin(userId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT * FROM login_history WHERE user_id = ? ORDER BY login_time DESC LIMIT 1`,
            [userId],
            (err, row) => {
                if (err) reject(err);
                resolve(row);
            }
        );
    });
}

// Sales operations
function createSale(userId, customerName, quantity, price) {
    return new Promise((resolve, reject) => {
        const total = quantity * price;
        db.run(
            `INSERT INTO sales (user_id, customer_name, quantity, price, total) VALUES (?, ?, ?, ?, ?)`,
            [userId, customerName, quantity, price, total],
            function(err) {
                if (err) reject(err);
                resolve({
                    id: this.lastID,
                    total
                });
            }
        );
    });
}

function getSalesByUser(userId) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM sales WHERE user_id = ? ORDER BY date DESC`, [userId], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
}

function getTotalRevenue(userId) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT SUM(total) as total FROM sales WHERE user_id = ?`, [userId], (err, row) => {
            if (err) reject(err);
            resolve(row.total || 0);
        });
    });
}

function getDailyEarnings(userId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT SUM(total) as total FROM sales WHERE user_id = ? AND date(date) = date('now')`,
            [userId],
            (err, row) => {
                if (err) reject(err);
                resolve(row.total || 0);
            }
        );
    });
}

function getWeeklyEarnings(userId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT SUM(total) as total FROM sales WHERE user_id = ? AND date >= date('now', '-7 days')`,
            [userId],
            (err, row) => {
                if (err) reject(err);
                resolve(row.total || 0);
            }
        );
    });
}

function getMonthlyEarnings(userId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT SUM(total) as total FROM sales WHERE user_id = ? AND date >= date('now', '-30 days')`,
            [userId],
            (err, row) => {
                if (err) reject(err);
                resolve(row.total || 0);
            }
        );
    });
}

function deleteSale(saleId, userId) {
    return new Promise((resolve, reject) => {
        db.run(
            `DELETE FROM sales WHERE id = ? AND user_id = ?`,
            [saleId, userId],
            function(err) {
                if (err) reject(err);
                resolve({
                    success: true
                });
            }
        );
    });
}

// User preferences operations
function getUserPreferences(userId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT * FROM user_preferences WHERE user_id = ?`,
            [userId],
            (err, row) => {
                if (err) reject(err);
                resolve(row || {
                    theme: 'light',
                    layout: 'default'
                });
            }
        );
    });
}

function updateUserPreferences(userId, theme, layout) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT OR REPLACE INTO user_preferences (user_id, theme, layout) VALUES (?, ?, ?)`,
            [userId, theme, layout],
            function(err) {
                if (err) reject(err);
                resolve({
                    success: true
                });
            }
        );
    });
}

module.exports = {
    db,
    hashPassword,
    comparePassword,
    createUser,
    findUserByUsername,
    findUserByPhone,
    findUserById,
    updatePassword,
    updateUsername,
    updateProfilePicture,
    recordLogin,
    recordLogout,
    getLastLogin,
    createSale,
    getSalesByUser,
    getTotalRevenue,
    getDailyEarnings,
    getWeeklyEarnings,
    getMonthlyEarnings,
    deleteSale,
    getUserPreferences,
    updateUserPreferences
};