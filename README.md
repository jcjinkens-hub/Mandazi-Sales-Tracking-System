# Mandazi Sales and Payment Tracking System

A full-stack web application for tracking mandazi sales and customer payments. This is a school project demonstrating full-stack development concepts.

## Features

- **Authentication**: Secure login system with session management
- **Dashboard**: View total sales, paid/unpaid amounts, and recent sales
- **Record Sales**: Add new sales with customer details and payment status
- **View All Sales**: Complete list with edit and delete functionality
- **View Unpaid Sales**: Track and mark unpaid sales as paid
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Backend
- Node.js
- Express.js
- JSON file database (simple for school project)
- bcryptjs for password hashing
- express-session for session management
- CORS enabled

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript
- Responsive design

## Default Login Credentials

- **Username**: `seller`
- **Password**: `seller123`

## Installation & Setup

### 1. Start the Backend Server

```bash
cd backend
npm install
npm start
```

The backend server will run on `http://localhost:3001`

### 2. Start the Frontend

Open `frontend/index.html` in a web browser, or serve it using a local server:

```bash
cd frontend
# Using Python 3
python -m http.server 5173

# Or using Node.js npx
npx serve -l 5173
```

The frontend will be available at `http://localhost:5173`

### 3. Access the Application

1. Open your browser and navigate to `http://localhost:5173`
2. Login with the default credentials
3. Start tracking your mandazi sales!

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | User login |
| POST | `/api/logout` | User logout |
| GET | `/api/auth/status` | Check auth status |
| GET | `/api/dashboard` | Get dashboard statistics |
| GET | `/api/sales` | Get all sales |
| GET | `/api/sales/unpaid` | Get unpaid sales |
| GET | `/api/sales/:id` | Get single sale |
| POST | `/api/sales` | Create new sale |
| PUT | `/api/sales/:id` | Update sale |
| PATCH | `/api/sales/:id/mark-paid` | Mark sale as paid |
| DELETE | `/api/sales/:id` | Delete sale |

## Project Structure

```
.
├── backend/
│   ├── server.js          # Main server file
│   ├── package.json       # Backend dependencies
│   └── data/              # Database files
│       ├── users.json     # User accounts
│       └── sales.json     # Sales records
├── frontend/
│   ├── index.html         # Main HTML file
│   ├── styles.css         # Stylesheet
│   └── app.js             # Frontend JavaScript
└── README.md              # This file
```

## Business Logic

1. **Total Amount** = Quantity × Price Per Unit
2. Dashboard totals calculate dynamically from all sales
3. Paid sales contribute to "Total Paid"
4. Unpaid sales contribute to "Total Unpaid"
5. No negative values allowed
6. All forms validated on both frontend and backend

## Security Features

- Password hashing with bcryptjs
- Session-based authentication
- Server-side validation
- CORS protection
- Input sanitization

## Academic Context

This project demonstrates:
- System analysis and design
- Database design and management
- Frontend and backend integration
- Authentication and session handling
- CRUD operations
- Business logic implementation
- Full-stack development concepts

## Notes

- This is a single-user system (the seller)
- Data is stored in JSON files for simplicity
- The system is designed for local use (localhost)
- No registration page required (predefined seller account)
