# 💰 ExpenseTrack — MERN Stack Finance Manager

A full-stack, enterprise-grade personal finance manager and budget planner built with the MERN stack (MongoDB, Express, React, Node.js). 

ExpenseTrack helps you manage your transactions, configure multi-currency wallets, orchestrate family budgets, split bills, track financial goals, schedule bills, monitor subscriptions, and receive AI-driven savings insights powered by Google Gemini AI. It also features a gamification system with XP, levels, daily challenges, and badges to incentivize saving habits.

---

## 🧱 Project Architecture & Flow

ExpenseTrack is structured as a 3-tier MERN web application:

```text
               +--------------------------------------------+
               |           React Frontend (Client)          |
               | (Vite, Tailwind, Recharts, Framer Motion)  |
               +----------------------+---------------------+
                                      |
                             HTTPS / REST API Calls
                                      |
               +----------------------v---------------------+
               |          Express.js / Node.js API          |
               |  (Authentication, AI Assistant, Security)  |
               +----------------------+---------------------+
                                      |
                           Mongoose ODM Queries
                                      |
               +----------------------v---------------------+
               |              MongoDB Database              |
               | (Users, Expenses, Goals, Wallets, etc.)   |
               +--------------------------------------------+
```

1. **Frontend (Client)**: A React SPA utilizing Vite as the build tool, Tailwind CSS for modern glassmorphic UI styling, Recharts for financial analytics, TanStack React Query for cached API requests, and Framer Motion for smooth micro-animations.
2. **Backend (Server)**: An Express REST API with Winston logging, structured controllers, Joi validators, rate limiters, Helmet security headers, and JWT-based authentication.
3. **Database (MongoDB)**: Utilizes Mongoose ODM to model relational-like data structures including User, Expense, Income, Wallet, Budget, Goal, split, subscription, family, session, and gamification logs.
4. **Third-Party Integrations**: Google Gemini API via `@google/genai` for AI budgeting tips and Resend/SMTP email dispatcher.

---

## 🚀 Key Features

### 1. Core Financial Management
* **Interactive Dashboard**: Consolidated financial summary with real-time income, expenses, and savings cards, budget progress gauges, and recent transaction history.
* **Transactions CRUD**: Seamless tracking of income and expenses. Filter by category, wallet, date range, or transaction type, with built-in search and pagination.
* **Multi-Wallet & Multi-Currency Support**: Register multiple payment accounts (Cash, Bank Accounts, Credit Cards, Savings) with real-time balance tracking.
* **Dynamic Budgeting**: Define monthly budgets by category. View spending thresholds and receive warning alerts when expenses exceed predefined limits.
* **Interactive Reports & Analytics**: Generate monthly trend graphs, category breakdown charts, and average spending statistics using Recharts.

### 2. Advanced Features
* **AI Financial Assistant**: Ask our Google Gemini AI-powered assistant (via `@google/genai`) for personalized budgeting recommendations, transaction summaries, or saving strategies. Chat requests are optimized with rate limiting and a 2-minute caching TTL.
* **Gamification & Saving Challenges**: Stay motivated with levels, XP progression, daily challenges, reward chest openings, and customizable achievement badges.
* **Financial Goals Dashboard**: Set target savings goals (e.g., buying a car, emergency fund) with visual milestones, target dates, and automated contribution logging.
* **Interactive Bill Calendar**: Visual calendar layout displaying upcoming, overdue, and paid bills to prevent late fee penalties.
* **Subscriptions Tracker**: Track recurring payments (Netflix, Spotify, Gym, etc.) with customizable billing cycles and notifications.
* **Split Bills / Group Expenses**: Share bills with friends or family members. Calculate equal or custom splits, track contributions, and log settlements.
* **Family Shared Budgets**: Invite family members to join a shared workspace to track collaborative household budgets and expenses.
* **Analytics Pro**: Deeper financial analysis with forecasting charts and spending trend lines.

### 3. Security & Account Protection
* **Active Session Management**: View active browser sessions (IP, OS, Browser, Device Type, Login Timestamp) and log out from individual devices or all other devices remotely.
* **Security Logs**: Audit tracking of critical account activities (such as login attempts, password changes, MFA alerts, and login failures).
* **Robust Express Middleware**: Secure API endpoints with:
  * **Helmet**: Strong HTTP header configurations.
  * **Express Rate Limit**: Custom rate limiters for general API endpoints, logins, and OTP requests.
  * **Mongo Sanitize**: Protection against MongoDB Query Injection.
  * **HPP & XSS Sanitizer**: Defense against HTTP Parameter Pollution and Cross-Site Scripting.
* **Token Refresh Protocol**: Double JWT strategy (15-minute HTTP header access tokens & 7-day HttpOnly/Secure refresh cookies) to prevent token theft.

### 4. Statements & Communications
* **Excel & PDF Exports**: Download your transaction reports as highly styled Excel spreadsheets (`exceljs`) or PDF files (`pdfkit`).
* **Real-time Notifications**: Custom browser toasts (`react-hot-toast`) and automated email alerts via **Resend** or standard **SMTP** servers for alerts like budget overflows.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, React Router v6, Tailwind CSS v3, Framer Motion, TanStack React Query, Lucide Icons, Recharts |
| **Backend** | Node.js, Express.js, JWT, Mongoose, Joi, Winston Logger, Compression, Helmet, CORS |
| **Database** | MongoDB Atlas |
| **External APIs** | Google Gemini AI (`@google/genai`), Resend / SMTP Email Delivery |

---

## ⚙️ Project Installation & Setup

### Prerequisites
* Node.js >= 18
* MongoDB Atlas cluster or local MongoDB instance
* Google Gemini API Key (optional, required for AI features)
* Resend API Key / SMTP Server details (optional, fallback to console logger is included)

### 1. Clone the Repository & Install Dependencies
First, clone this repository and install the dependencies for both the frontend client and the backend server.

```bash
# Install Server Dependencies
cd server
npm install

# Install Client Dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables

Create a `.env` file inside both the `server/` and `client/` directories based on the templates below.

#### Server Environment Configurations (`server/.env`):
```ini
# Core Server Configuration
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/expensetracker

# Security & Authentication Tokens (Must be >= 16 chars)
JWT_SECRET=your_super_secure_access_secret_key_here
JWT_EXPIRE=15m
JWT_REFRESH_SECRET=your_super_secure_refresh_secret_key_here
JWT_REFRESH_EXPIRE=7d
COOKIE_SECRET=your_super_secure_cookie_cookie_secret_here
CLIENT_URL=http://localhost:5173

# Expose error stack traces during development (ignored in production)
EXPOSE_ERROR_STACK=true

# Optional: Email Delivery (resends or SMTP; falls back to console logging if omitted)
# SMTP_HOST=smtp.mailtrap.io
# SMTP_PORT=2525
# SMTP_USER=your_smtp_username
# SMTP_PASS=your_smtp_password
# SMTP_FROM=noreply@expensetrack.com
# SMTP_FROM_NAME=ExpenseTrack

# Gemini AI Integration Config
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite

# AI Assistant Limits & Caching
AI_DAILY_MESSAGE_LIMIT=50
AI_CACHE_TTL=120000
```

#### Client Environment Configurations (`client/.env`):
```ini
VITE_API_BASE_URL=http://localhost:5000/api
```

### 3. Database Seeding (Optional)
If you wish to seed newly created/existing users with some default categories, run the category seeding script:
```bash
cd server
node seed_categories.js
```

### 4. Run Development Servers
Open two terminal windows to start both the backend server and the frontend client simultaneously:

```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend
cd client
npm run dev
```

Visit: **https://expense-tracker-five-virid-19.vercel.app/login** to access the application.

---

## 🧪 Testing and Validation

ExpenseTrack comes with a complete suite of regression, performance, and unit tests inside the `server/tests` folder.

To run the primary gamification and XP system test suite:
```bash
cd server
npm test
```

To run individual tests or verification checks:
```bash
# Verify Gemini API configuration and sanity check model connection
node tests/setup_check.js

# Verify session management and security logs
node tests/device_sessions.test.js

# Verify Gemini AI caching and performance regression
node tests/aicache_regression.mjs
```
