# 💰 Expense Tracker — MERN Stack Financial Management System

A production-ready, full-stack personal finance management and budget optimization platform built on the MERN stack (MongoDB, Express.js, React 18, Node.js).

Expense Tracker delivers end-to-end financial workflows including multi-currency wallet management, category budgeting with active threshold alerts, debt and loan tracking, recurring subscription monitoring, group bill splitting, joint family budgeting workspaces, interactive bill calendars, and AI-driven conversational advisory powered by Google Gemini. An embedded gamification engine (XP progression, levels, daily challenges, reward chests, and achievement badges) incentivizes healthy financial habits.

---

## 🏗️ System Architecture

Expense Tracker operates as a modular, 3-tier MERN web application:

```
┌─────────────────────────────────────────────────────────────┐
│                   React 18 Single-Page App                  │
│       Vite • Tailwind CSS • Framer Motion • Recharts        │
│       Context State • Axios Interceptors • React Query      │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / REST (JSON & HttpOnly Cookie)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Node.js / Express.js REST API               │
│  Controllers • Joi Validators • Security Middlewares (XSS,  │
│  HPP, Helmet, Rate Limiters) • Double JWT • Google OAuth    │
└──────────────────────────────┬──────────────────────────────┘
                               │ Mongoose ODM
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     MongoDB Atlas Database                  │
│  21 Collections: Users, Wallets, Expenses, Budgets, Goals,  │
│  Sessions, Gamification, Security Logs, Split Bills, etc.   │
└─────────────────────────────────────────────────────────────┘
```

1. **Frontend (Client)**: React 18 Single Page Application powered by Vite, Tailwind CSS, Recharts for visual analytics, Framer Motion for micro-interactions, and Axios with automated interceptors for silent token refresh via HttpOnly cookies.
2. **Backend (Server)**: Modular Express REST API with Winston logging, centralized async error handling, Joi schema validation, multi-layer security sanitization, and dual authentication mechanisms (Local Email/Password + Google OAuth 2.0).
3. **Database (MongoDB Atlas)**: Relational-mapped document collections using Mongoose ODM covering financial entities, active device sessions, security audit logs, and gamification state.
4. **AI & Integrations**: Google Gemini AI (`@google/genai`) for multi-turn conversational financial analysis and Gmail API email dispatcher for alerts and verification codes.

---

## ✨ Application Modules & Features

### 1. Core Financial Engine
* **Consolidated Dashboard**: Real-time summary cards for income, expenses, net savings rate, category budget progress gauges, and recent transactions.
* **Income & Expense Tracking**: Full CRUD management of transactions with categorization, wallet association, date filtering, pagination, and instant balance recalculations.
* **Multi-Wallet Support**: Create and manage multiple accounts (Cash, Bank Accounts, Credit Cards, Savings) with real-time balance synchronization.
* **Category Budgeting**: Monthly limits by category with dynamic spending gauges, threshold tracking, and automated budget overflow alerts.
* **Financial Goals**: Define savings goals with visual milestones, target dates, and automated contribution logging.
* **Interactive Bill Calendar**: Visual calendar interface displaying upcoming, overdue, and completed bill payments to prevent late fees.
* **Subscriptions Tracker**: Track recurring payments (streaming, utilities, gym memberships) with billing cycle reminders.
* **Investments & Loans**: Monitor asset portfolios (stocks, mutual funds, real estate) and track borrowed/lent debt records with settlement logs.
* **Split Bills & Group Expenses**: Group expense splitter calculating equal or customized splits with individual settlement status.
* **Family Shared Budgets**: Collaborative household workspace allowing family members to share budgets and monitor pooled expenses.
* **Analytics Pro & Reports**: Deep-dive spending breakdowns, cash flow ratios, payment method statistics, and downloadable statements in styled **Excel (`exceljs`)** and **PDF (`pdfkit`)** formats.

### 2. Google Gemini AI Assistant
* **Natural Language Queries**: Ask financial questions like *"Where did I spend the most this month?"* or *"Suggest a budget based on my income"*.
* **Modular AI Architecture**: Uses `IntentDetector`, `ContextBuilder`, `FactRouter`, `InsightEngine`, `RiskAnalyzer`, and `ResponseValidator` to ensure grounded, hallucination-free advice.
* **Performance & Safety**: Daily query quotas per user and a 2-minute memory cache to optimize response times.

### 3. Gamification Engine
* **Level & XP Progression**: Earn XP and coins for logging transactions, meeting budget targets, and achieving savings milestones.
* **Daily Challenges & Streaks**: Randomized daily financial tasks and consecutive login streak multipliers.
* **Reward Chests & Badges**: Unlock cosmetic titles, theme customizations, and 30+ achievement badges with an Achievement Showcase.

### 4. Enterprise Security & Session Management
* **Dual Authentication**: Local Email/Password with bcrypt password hashing + Google OAuth 2.0 authorization code flow.
* **Active Session Management**: Track active device logins (IP address, OS, Browser, Device Name, Last Active timestamp) with remote session revocation.
* **Security Logs**: Immutable audit log of sensitive actions (login events, password resets, profile modifications).
* **Multi-Tier Defense**: Helmet HTTP headers, CORS origin allowlisting, Express rate limiting, Mongo query sanitization, HTTP Parameter Pollution (HPP) protection, and recursive XSS sanitization.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, React Router v6, Tailwind CSS v3, Framer Motion, TanStack React Query, Lucide Icons, React Icons, Recharts, React Hot Toast |
| **Backend** | Node.js, Express.js (ESM), Mongoose ODM, Joi, Winston Logger, Compression, Helmet, HPP, Express Rate Limit, Cookie Parser, Google Auth Library |
| **Database** | MongoDB Atlas / MongoDB Server |
| **AI Integration** | Google Gemini AI (`@google/genai`) |
| **Email Delivery** | Gmail API |
| **Document Export** | ExcelJS, PDFKit |

---

## 📁 Cleaned Directory Structure

```text
Expense-Tracker/
├── .gitignore                                # Environment & artifact ignore rules
├── Expense_Tracker_MERN_System_Architecture.md # Comprehensive system architecture documentation
├── README.md                                 # Project documentation
├── package.json                              # Root monorepo workspace scripts
│
├── client/                                   # Frontend Application (React 18 + Vite)
│   ├── public/                               # Static assets (favicons, PWA manifest, logo.jpg)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Goals/                        # Goal modals, progress bars, charts
│   │   │   ├── ai/                           # AI Chat input, message bubbles, markdown renderer
│   │   │   ├── cards/                        # Summary and balance cards
│   │   │   ├── charts/                       # Recharts analytics and breakdown visualizations
│   │   │   ├── common/                       # Navbar, Sidebar, Layout, Modal, ConfirmDialog
│   │   │   ├── gamification/                 # XP bar, badges, streak, reward chests, leaderboard
│   │   │   └── ui/                           # Base UI primitives (Button, Input, Card, Skeleton)
│   │   ├── constants/                        # Challenge pools and reward definitions
│   │   ├── context/                          # AuthContext, ExpenseContext, GamificationContext, ThemeContext, DialogContext
│   │   ├── hooks/                            # useGoals, useGoalAnalytics, useDialog
│   │   ├── pages/                            # Application view pages (Dashboard, Expenses, AIAssistant, etc.)
│   │   ├── services/                         # Axios client (api.js), goalService, rewardService
│   │   ├── utils/                            # Chart themes, goal calculations, helper functions
│   │   ├── App.jsx                           # Application routing & provider hierarchy
│   │   ├── index.css                         # Global CSS & Tailwind layers
│   │   └── main.jsx                          # React DOM entry point
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vercel.json                           # Vercel deployment configuration
│   └── vite.config.js
│
└── server/                                   # Backend Application (Express.js REST API)
    ├── config/                               # MongoDB connection (`db.js`) & Environment validation (`env.js`)
    ├── controllers/                          # Business logic controllers (auth, expenses, ai, wallets, etc.)
    ├── middleware/                           # authMiddleware, errorHandler, schemas (Joi), validate, xssSanitizer
    ├── models/                               # 21 Mongoose models (User, Expense, Wallet, Session, SecurityLog, etc.)
    ├── routes/                               # 22 Express route modules mounted at /api/*
    ├── scripts/                              # Maintenance utilities (seed_categories.js, dedupeAIChats.mjs)
    ├── services/
    │   ├── ai/                               # Gemini AI pipeline (IntentDetector, ContextBuilder, ResponseValidator, etc.)
    │   ├── financial/                        # Financial data aggregation services
    │   └── gamificationService.js            # XP awards, level checks, and badge evaluators
    ├── tests/                                # Backend regression and integration test utilities
    ├── utils/                                # Winston logger, JWT generator, email sender, timezone utilities
    ├── .env.example                          # Environment variable template
    ├── package.json
    └── server.js                             # Express application entry point
```

---

## 🔐 Authentication & Session Security

### Dual Authentication Architecture
1. **Local Email/Password**: Secure registration and login with bcrypt password hashing (10 salt rounds), brute-force login rate limiting (max 5 requests / 15 minutes), and OTP-based password reset.
2. **Google OAuth 2.0**: Server-side authorization code flow via `google-auth-library` with cryptographic CSRF `state` cookie validation and Google ID token verification.

### Token & Session Lifecycle
* **Access Tokens**: Short-lived JWTs (15 minutes) signed with `JWT_SECRET`. Carried in HTTP `Authorization: Bearer <token>` headers.
* **Refresh Tokens**: Long-lived tokens (7 days) signed with `JWT_REFRESH_SECRET`. Stored as a hashed record in the database and set as an **HttpOnly, Secure, SameSite cookie** on the browser.
* **Silent Token Rotation**: The frontend Axios client automatically intercepts `401 Unauthorized` responses and requests a fresh access token via `/api/auth/refresh-token` using the HttpOnly cookie.
* **Active Session Tracking**: Every login creates a `Session` record capturing the device type, OS, browser, IP address, and timestamp. Users can inspect and revoke active sessions at any time.

---

## 🌐 Google OAuth 2.0 Setup

To enable Google Sign-In, create credentials in the **Google Cloud Console**:

1. Navigate to **APIs & Services → Credentials**.
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Configure the Authorized Origins and Redirect URIs:

| Environment | Authorized JavaScript Origins | Authorized Redirect URIs |
|---|---|---|
| **Local Development** | `http://localhost:5173` | `http://localhost:5000/api/auth/google/callback` |
| **Production** | `https://expense-tracker-five-virid-19.vercel.app` | `https://expense-tracker-30el.onrender.com/api/auth/google/callback` |

4. Set the resulting environment variables in your server configuration (never commit secrets):
   * `GOOGLE_CLIENT_ID`
   * `GOOGLE_CLIENT_SECRET`
   * `GOOGLE_CALLBACK_URL`

---

## ⚙️ Environment Configuration

### Server (`server/.env`):
```ini
# Core Configuration
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/expensetracker

# Client Origin (comma-separated if multiple)
CLIENT_URL=http://localhost:5173

# Authentication & Encryption Secrets (Min 16 characters each)
JWT_SECRET=your_strong_jwt_access_secret_key
JWT_EXPIRE=15m
JWT_REFRESH_SECRET=your_strong_jwt_refresh_secret_key
JWT_REFRESH_EXPIRE=7d
COOKIE_SECRET=your_strong_cookie_session_secret_key

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Google Gemini AI Integration
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash-lite
AI_DAILY_MESSAGE_LIMIT=50
AI_CACHE_TTL=120000

# Email Service (Optional - falls back to console logger)
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=
GMAIL_SENDER_EMAIL=
# SMTP_HOST=smtp.mailtrap.io
# SMTP_PORT=2525
# SMTP_USER=your_smtp_user
# SMTP_PASS=your_smtp_password
```

### Client (`client/.env` - Optional for Local Dev):
```ini
VITE_API_URL=http://localhost:5000/api
```

---

## 🚀 Local Development Setup

### 1. Prerequisites
* Node.js >= 18.x
* MongoDB Atlas cluster or local MongoDB instance
* Google Gemini API Key (optional, for AI chat)
* Google OAuth Credentials (optional, for Google Sign-In)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/adityadhobale1710/Expense-Tracker.git
cd Expense-Tracker

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Run Development Servers
Start both servers concurrently using separate terminal windows:

```bash
# Terminal 1: Backend Server (runs on http://localhost:5000)
cd server
npm run dev

# Terminal 2: Frontend Client (runs on http://localhost:5173)
cd client
npm run dev
```

### 4. Database Seeding & Maintenance Scripts
```bash
# Seed default expense and income categories
cd server
npm run seed:categories

# Deduplicate AIChat records if required by startup checks
npm run dedupe:ai
```

---

## ☁️ Production Deployment

* **Frontend**: Deployed on **Vercel** (`https://expense-tracker-five-virid-19.vercel.app`)
  * Build Command: `npm run build`
  * Output Directory: `dist`
  * Environment Variable: `VITE_API_URL=https://expense-tracker-30el.onrender.com/api`
* **Backend**: Deployed on **Render** (`https://expense-tracker-30el.onrender.com`)
  * Build Command: `npm install`
  * Start Command: `node server.js`
  * Environment Variables configured in Render Dashboard (`NODE_ENV=production`, `CLIENT_URL`, `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `GEMINI_API_KEY`).
* **Database**: Hosted on **MongoDB Atlas**.

---

## 🛡️ Security Architecture Overview

* **Zero Token In URL**: Google OAuth redirects users cleanly to `/dashboard` while passing the session via an HttpOnly cookie; tokens and serialized user objects never touch the URL query string or browser history.
* **Strict CORS Policy**: Whitelists only approved client origins with credentials (`withCredentials: true`), blocking unauthorized cross-origin requests.
* **Cookie Security**: Refresh cookies use `HttpOnly: true`, `Secure: true` in production, and `SameSite: None` (cross-site Vercel ↔ Render) / `SameSite: Strict` (local development).
* **Automated XSS & Injection Defense**: `express-mongo-sanitize` strips `$` and `.` operators from incoming request bodies, while `xssSanitizer` recursively purges malicious script tags.
* **Rate Limiting**: Tiered rate limits on standard API routes, strict login limits (5 requests / 15 mins), and OTP verification endpoints (5 attempts / 10 mins).

---

## 📋 Manual Verification Checklist

1. **Authentication**:
   * Register a new user with Email/Password and verify automatic wallet and category seeding.
   * Sign in using the **Google** button, approve permissions, and verify redirection to `/dashboard`.
   * Log out and confirm the refresh cookie and local storage are cleared.
2. **Transactions & Ballets**:
   * Create an income entry and an expense entry; verify wallet balance updates in real-time.
   * Delete an entry and verify balance rollback.
3. **Budgets & Goals**:
   * Set a monthly category budget and verify spending gauge updates.
   * Create a savings goal and log a contribution.
4. **AI Assistant**:
   * Open the AI Assistant page and ask *"What is my total balance?"*; verify accurate retrieval.
5. **Session Management**:
   * Open **Profile → Security** and verify active device session cards.
6. **Data Exports**:
   * Generate an Excel and PDF statement from the **Reports** page.
