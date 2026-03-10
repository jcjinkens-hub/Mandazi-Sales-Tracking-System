# Mandazi Sales Tracking System (MSTS)

A comprehensive sales tracking application for mandazi sellers with user authentication, profile management, and revenue analytics.

## Features

### Authentication & User Management

- **Secure Login/Signup**: Session-based authentication with bcrypt password hashing
- **Profile Management**: Custom profile pictures, username changes, password updates
- **Forgot Password**: Account verification via username and phone number
- **Login History**: Tracks login/logout times and IP addresses

### Sales Tracking

- **Record Sales**: Add customer name, quantity, and price per unit
- **Revenue Analytics**:
  - Total Revenue
  - Daily Earnings (Today)
  - Weekly Earnings (Last 7 days)
  - Monthly Earnings (Last 30 days)
- **Sales History**: View and delete past sales

### User Preferences

- **Light/Dark Mode**: Theme preference stored in database
- **Dashboard Layout**: Default or compact view
- **Profile Pictures**: Upload JPG/PNG images (max 5MB)

## System Requirements

- Node.js 14+
- npm or yarn
- Modern web browser

## Project Structure

```text
Mandazi_Sales_Tracking_System/
├── backend/
│   ├── server.js              # Main Express server
│   ├── database.js            # SQLite database setup
│   ├── authRoutes.js          # Authentication routes
│   ├── userRoutes.js          # User/profile routes
│   ├── package.json           # Backend dependencies
│   └── .env.example           # Environment variables template
├── frontend/
│   ├── login.html             # Login page
│   ├── signup.html            # Registration page
│   ├── profile.html           # Profile & dashboard
│   ├── settings.html          # User settings
│   ├── forgot-password.html   # Password reset
│   ├── css/
│   │   └── styles.css        # Global styles
│   ├── js/
│   │   └── auth.js           # Authentication utilities
│   └── assets/
│       └── images/            # Logos and images
├── uploads/
│   └── profile_pictures/       # Uploaded profile pictures
└── README.md
```

## Quick Start

### 1. Install Dependencies

```bash
# Navigate to backend
cd backend

# Install backend dependencies
npm install

# The following packages will be installed:
# - express (web server)
# - sqlite3 (database)
# - bcryptjs (password hashing)
# - express-session (session management)
# - multer (file uploads)
# - cors (cross-origin requests)
```

### 2. Start the Server

```bash
cd backend
npm start
```

The server will start on `http://localhost:3001`

### 3. Access the Application

Open your browser and navigate to:

- **Login**: <http://localhost:3001/login>
- **Signup**: <http://localhost:3001/signup>

## New Authentication System (2024)

### Database Tables

#### users

| Field | Type | Description |
| :--- | :--- | :--- |
| id | INTEGER | Primary key |
| username | TEXT UNIQUE | Username (must be unique) |
| phone_number | TEXT UNIQUE | Phone number (must be unique) |
| password_hash | TEXT | Bcrypt hashed password |
| profile_picture | TEXT | Path to profile picture |
| date_created | DATETIME | Account creation timestamp |

#### login_history

| Field | Type | Description |
| :--- | :--- | :--- |
| id | INTEGER | Primary key |
| user_id | INTEGER | Foreign key to users |
| login_time | DATETIME | When user logged in |
| logout_time | DATETIME | When user logged out |
| ip_address | TEXT | User's IP address |

#### sales

| Field | Type | Description |
| :--- | :--- | :--- |
| id | INTEGER | Primary key |
| user_id | INTEGER | Foreign key to users |
| customer_name | TEXT | Customer's name |
| quantity | INTEGER | Number of mandazi |
| price | REAL | Price per unit |
| total | REAL | Total amount |
| date | DATETIME | Sale timestamp |

#### user_preferences

| Field | Type | Description |
| :--- | :--- | :--- |
| id | INTEGER | Primary key |
| user_id | INTEGER UNIQUE | Foreign key to users |
| theme | TEXT | 'light' or 'dark' |
| layout | TEXT | 'default' or 'compact' |

### API Endpoints

#### Authentication (prefix: /api/auth)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/signup` | Create new account |
| POST | `/login` | User login |
| POST | `/logout` | User logout |
| GET | `/status` | Check auth status |
| POST | `/forgot-password/verify` | Verify account |
| POST | `/forgot-password/reset` | Reset password |

#### User & Sales (prefix: /api/user)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/profile` | Get profile with stats |
| POST | `/update-username` | Change username |
| POST | `/update-password` | Change password |
| POST | `/upload-picture` | Upload profile picture |
| GET | `/preferences` | Get theme/layout |
| POST | `/preferences` | Save preferences |
| POST | `/sales` | Record new sale |
| GET | `/sales` | Get all sales |
| DELETE | `/sales/:id` | Delete sale |
| GET | `/revenue` | Get revenue stats |

## User Flows

### Signup Flow

1. User fills: username, phone number, password, confirm password
2. System validates: password match, unique username, unique phone
3. Account created with default preferences
4. Redirect to login

### Login Flow

1. User enters username and password
2. System verifies credentials
3. Session created, login recorded in database
4. Redirect to profile/dashboard

### Password Reset Flow

1. User enters username and phone number
2. System verifies account exists
3. User enters new password and confirmation
4. Password updated securely

## Security Features

- **Password Hashing**: bcrypt with salt rounds
- **Session Authentication**: HTTP-only cookies
- **Input Validation**: Server-side validation
- **Duplicate Prevention**: Unique constraints on username/phone
- **File Upload Restrictions**: JPG/PNG only, 5MB limit

## Frontend Pages

### login.html

- Username and password fields
- "Forgot Password?" link
- "Sign up" redirect

### signup.html

- Username (unique)
- Phone number (unique)
- Password + Confirm password
- Password match validation

### profile.html

- Profile picture with upload
- Username, phone, member since
- Revenue cards: Total, Today, This Week, This Month
- Record new sale form
- Recent sales table

### settings.html

- Change username
- Change password (current + new + confirm)
- Upload profile picture
- Theme toggle (Light/Dark)
- Layout preference (Default/Compact)

### forgot-password.html

- Step 1: Verify with username + phone
- Step 2: Reset with new password + confirm

## Troubleshooting

### "Connection error"

- Ensure backend is running: `npm start` in backend folder
- Check server is on port 3001

### "Account verification failed"

- Verify username matches exactly
- Verify phone number matches exactly

### "Username already taken" / "Phone already registered"

- Choose different username or phone number

### Profile picture not uploading

- Check file is JPG or PNG
- Check file size is under 5MB

## Legacy M-Pesa Integration

This version includes the original M-Pesa payment integration. To use M-Pesa:
1. Configure credentials in `backend/.env`
2. See full M-Pesa documentation in original README sections

## License

ISC License

## Support

For issues, check the backend console for error messages.
