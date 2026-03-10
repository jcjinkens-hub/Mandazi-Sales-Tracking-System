const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(session({
  secret: 'mandazi-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Database file paths
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SALES_FILE = path.join(DATA_DIR, 'sales.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database files
function initDatabase() {
  // Create users file with default seller account
  if (!fs.existsSync(USERS_FILE)) {
    const defaultPassword = bcrypt.hashSync('seller123', 10);
    const users = [
      {
        id: 1,
        username: 'seller',
        password: defaultPassword,
        name: 'Mandazi Seller'
      }
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    console.log('Created users database with default account:');
    console.log('Username: seller');
    console.log('Password: seller123');
  }

  // Create sales file
  if (!fs.existsSync(SALES_FILE)) {
    fs.writeFileSync(SALES_FILE, JSON.stringify([], null, 2));
  }
}

// Helper functions for database operations
function readUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function readSales() {
  return JSON.parse(fs.readFileSync(SALES_FILE, 'utf8'));
}

function writeSales(sales) {
  fs.writeFileSync(SALES_FILE, JSON.stringify(sales, null, 2));
}

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized. Please login.' });
  }
}

// Routes

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const users = readUsers();
  const user = users.find(u => u.username === username);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  req.session.userId = user.id;
  req.session.username = user.username;

  res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      username: user.username,
      name: user.name
    }
  });
});

// Register (Sign Up)
app.post('/api/register', (req, res) => {
  const { username, name, password } = req.body;

  // Validation
  if (!username || !name || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  const users = readUsers();

  // Check if username already exists
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  // Hash password
  const hashedPassword = bcrypt.hashSync(password, 10);

  // Create new user
  const newUser = {
    id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
    username: username.trim(),
    password: hashedPassword,
    name: name.trim()
  };

  users.push(newUser);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

  res.status(201).json({
    message: 'Registration successful',
    user: {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name
    }
  });
});

// Logout
app.post('/api/logout', requireAuth, (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logout successful' });
});

// Check auth status
app.get('/api/auth/status', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({ authenticated: true, user: { id: req.session.userId, username: req.session.username } });
  } else {
    res.json({ authenticated: false });
  }
});

// Get dashboard statistics
app.get('/api/dashboard', requireAuth, (req, res) => {
  const sales = readSales();

  const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalPaid = sales
    .filter(sale => sale.paymentStatus === 'Paid')
    .reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalUnpaid = sales
    .filter(sale => sale.paymentStatus === 'Not Paid')
    .reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalSalesCount = sales.length;

  // Get recent sales (last 5)
  const recentSales = [...sales]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  res.json({
    totalSales,
    totalPaid,
    totalUnpaid,
    totalSalesCount,
    recentSales
  });
});

// Get all sales
app.get('/api/sales', requireAuth, (req, res) => {
  const sales = readSales();
  res.json(sales);
});

// Get unpaid sales
app.get('/api/sales/unpaid', requireAuth, (req, res) => {
  const sales = readSales();
  const unpaidSales = sales.filter(sale => sale.paymentStatus === 'Not Paid');
  res.json(unpaidSales);
});

// Get single sale
app.get('/api/sales/:id', requireAuth, (req, res) => {
  const sales = readSales();
  const sale = sales.find(s => s.id === parseInt(req.params.id));

  if (!sale) {
    return res.status(404).json({ error: 'Sale not found' });
  }

  res.json(sale);
});

// Create new sale
app.post('/api/sales', requireAuth, (req, res) => {
  const { customerName, quantity, pricePerUnit, totalAmount, paymentStatus } = req.body;

  // Validation
  if (!customerName || !quantity || !pricePerUnit || !totalAmount || !paymentStatus) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (quantity <= 0 || pricePerUnit <= 0 || totalAmount <= 0) {
    return res.status(400).json({ error: 'Values must be positive numbers' });
  }

  if (!['Paid', 'Not Paid'].includes(paymentStatus)) {
    return res.status(400).json({ error: 'Invalid payment status' });
  }

  const sales = readSales();
  const newSale = {
    id: sales.length > 0 ? Math.max(...sales.map(s => s.id)) + 1 : 1,
    customerName: customerName.trim(),
    quantity: parseInt(quantity),
    pricePerUnit: parseFloat(pricePerUnit),
    totalAmount: parseFloat(totalAmount),
    paymentStatus,
    date: new Date().toISOString()
  };

  sales.push(newSale);
  writeSales(sales);

  res.status(201).json({ message: 'Sale recorded successfully', sale: newSale });
});

// Update sale
app.put('/api/sales/:id', requireAuth, (req, res) => {
  const { quantity, pricePerUnit, totalAmount, paymentStatus } = req.body;
  const saleId = parseInt(req.params.id);

  // Validation
  if (!quantity || !pricePerUnit || !totalAmount || !paymentStatus) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (quantity <= 0 || pricePerUnit <= 0 || totalAmount <= 0) {
    return res.status(400).json({ error: 'Values must be positive numbers' });
  }

  if (!['Paid', 'Not Paid'].includes(paymentStatus)) {
    return res.status(400).json({ error: 'Invalid payment status' });
  }

  const sales = readSales();
  const saleIndex = sales.findIndex(s => s.id === saleId);

  if (saleIndex === -1) {
    return res.status(404).json({ error: 'Sale not found' });
  }

  sales[saleIndex] = {
    ...sales[saleIndex],
    quantity: parseInt(quantity),
    pricePerUnit: parseFloat(pricePerUnit),
    totalAmount: parseFloat(totalAmount),
    paymentStatus
  };

  writeSales(sales);

  res.json({ message: 'Sale updated successfully', sale: sales[saleIndex] });
});

// Mark sale as paid
app.patch('/api/sales/:id/mark-paid', requireAuth, (req, res) => {
  const saleId = parseInt(req.params.id);
  const sales = readSales();
  const saleIndex = sales.findIndex(s => s.id === saleId);

  if (saleIndex === -1) {
    return res.status(404).json({ error: 'Sale not found' });
  }

  sales[saleIndex].paymentStatus = 'Paid';
  writeSales(sales);

  res.json({ message: 'Sale marked as paid', sale: sales[saleIndex] });
});

// Delete sale
app.delete('/api/sales/:id', requireAuth, (req, res) => {
  const saleId = parseInt(req.params.id);
  const sales = readSales();
  const saleIndex = sales.findIndex(s => s.id === saleId);

  if (saleIndex === -1) {
    return res.status(404).json({ error: 'Sale not found' });
  }

  sales.splice(saleIndex, 1);
  writeSales(sales);

  res.json({ message: 'Sale deleted successfully' });
});

// Initialize database and start server
initDatabase();

app.listen(PORT, () => {
  console.log(`Mandazi Sales Tracker Server running on http://localhost:${PORT}`);
  console.log('Default login credentials:');
  console.log('  Username: seller');
  console.log('  Password: seller123');
});
