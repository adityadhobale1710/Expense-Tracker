# 💰 ExpenseTrack — Full-Stack Finance & AI Budget Manager

[![MERN Stack](https://img.shields.io/badge/Stack-MERN-blue.svg)](https://mongodb.com)
[![React 18](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61DAFB.svg)](https://react.dev)
[![Node & Express](https://img.shields.io/badge/Backend-Node.js_%2B_Express-green.svg)](https://expressjs.com)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS_v3-38B2AC.svg)](https://tailwindcss.com)
[![Google Gemini AI](https://img.shields.io/badge/AI-Google_Gemini-8E75B2.svg)](https://ai.google.dev)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)

> **Live Demo**: [https://expense-tracker-five-virid-19.vercel.app/login](https://expense-tracker-five-virid-19.vercel.app/login)

**ExpenseTrack** is an enterprise-grade personal finance manager, budgeting engine, and financial analytics platform built with the MERN stack (MongoDB, Express, React, Node.js). 

It empowers users to track income and expenses across multi-currency wallets, orchestrate family budgets, split group expenses, monitor recurring subscriptions, plan milestone-based savings goals, analyze spending patterns with Recharts heatmaps, and converse with an AI Financial Advisor powered by **Google Gemini**.

---

## 🧱 Architecture Overview

```text
               +--------------------------------------------+
               |          React 18 SPA (Client)             |
               | (Vite, Tailwind CSS, TanStack Query, UI)   |
               +----------------------+---------------------+
                                      |
                             HTTPS / REST API Calls
                                      |
               +----------------------v---------------------+
               |         Express.js / Node.js API           |
               |  (JWT Auth, Rate Limit, Helmet, AI Layer)  |
               +----------------------+---------------------+
                                      |
                            Mongoose ODM Queries
                                      |
               +----------------------v---------------------+
               |              MongoDB Database              |
               | (21 Collections: Users, Wallets, Goals...) |
               +--------------------------------------------+
```

---

## 🚀 Key Features

### 1. 💼 Core Financial Management
* **Dynamic Dashboard**: Real-time balance overviews, monthly cash-flow summaries, budget gauges, recent transactions, and goal widgets.
* **Income & Expense CRUD**: Filter transactions by wallet, category, payment method, date range, or title with instant search and pagination.
* **Multi-Wallet Support**: Manage separate accounts (Bank, Cash, Credit Card, Savings) with real-time balance computation and transfer tracking.
* **Budgeting Engine**: Set monthly category spending caps with visual progress bars and warning notifications upon threshold breaches.
* **Reports & Document Exports**: Download customized financial summaries as styled Excel spreadsheets (`.xlsx`) via `exceljs` or printable PDF statements via `pdfkit`.

### 2. 🤖 AI Financial Assistant (Google Gemini)
* **Intelligent Chatbot**: Context-aware personal finance assistant built on Google Gemini (`@google/genai`).
* **Safe Insights**: Inquires about current savings, top spending categories, and personalized budgeting advice.
* **Resilient Caching & Rate Limiting**: Built with a 2-minute in-memory cache TTL and daily quota limiter to optimize API consumption.

### 3. 🎯 Goals, Gamification & Saving Habits
* **Savings Goals Tracker**: Create target funds (e.g., Emergency Fund, Vacation, Car) with deadline tracking, visual progress rings, and contribution logging.
* **XP & Level Progression**: Earn Experience Points (XP) by logging transactions, maintaining saving streaks, and staying under budget.
* **Daily Saving Challenges**: Complete rotating challenges to unlock achievements and open mystery reward chests.
* **Leaderboards & Badges**: Showcase financial milestones and badges.

### 4. 👥 Shared & Social Finance
* **Split Bills**: Divide group dinners or shared expenses equally or by custom amounts; track who paid and balance settlements.
* **Family Sharing**: Create collaborative family workspaces to aggregate household spending and monitor joint budgets.

### 5. 📅 Subscriptions & Bill Calendar
* **Bill Calendar**: Interactive visual calendar displaying upcoming, overdue, and completed bill deadlines.
* **Subscription Management**: Track recurring service fees (Netflix, Spotify, Gym, Utilities) with renewal reminders.

### 6. 🔒 Security & Session Governance
* **Double JWT Strategy**: Short-lived 15-minute access tokens coupled with secure HttpOnly refresh cookies for seamless token rotation.
* **Active Session Management**: Inspect connected devices (IP, Browser, OS, login timestamp) with one-click remote session revocation.
* **Security Logs**: Audit trail of authentication events, password updates, and suspicious login attempts.
* **Multi-Tier Defense Middleware**: Helmet HTTP security headers, Mongo Sanitize query injection defense, XSS payload stripping, and strict CORS whitelist validation.

### 7. 🛡️ Admin Portal
* **System Administration**: Superuser dashboard for platform metrics, user access management, error log inspection, and system health checks.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, React Router v6, Tailwind CSS v3, Framer Motion, TanStack React Query, Lucide Icons, Recharts, React Hot Toast |
| **Backend** | Node.js, Express.js, Mongoose ODM, JWT, Joi, Winston Logger, Compression, Helmet, CORS, Morgan |
| **Database** | MongoDB Atlas / Local MongoDB |
| **AI Integration** | Google Gemini API (`@google/genai`) |
| **Document Generation** | ExcelJS (Excel exports), PDFKit (PDF statements) |
| **Email Delivery** | Resend API / Nodemailer SMTP |

---

## ⚙️ Installation & Local Setup

### Prerequisites
* **Node.js** >= 18.0.0
* **npm** >= 9.0.0
* **MongoDB** (Local instance or MongoDB Atlas connection string)
* **Google Gemini API Key** *(Optional, required for AI assistant features)*

### 1. Clone Repository & Install Dependencies
You can install dependencies for both `server` and `client`:

```bash
# Clone the repository
git clone https://github.com/adityadhobale1710/Expense-Tracker.git
cd Expense-Tracker

# Install Backend Dependencies
cd server
npm install

# Install Frontend Dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables

#### Backend (`server/.env`):
Create a `.env` file inside the `server/` directory:
```ini
# Server Configuration
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/expensetracker

# Authentication Secrets (Must be >= 16 characters)
JWT_SECRET=your_super_secure_access_token_secret_key_32_chars
JWT_EXPIRE=15m
JWT_REFRESH_SECRET=your_super_secure_refresh_token_secret_key_32_chars
JWT_REFRESH_EXPIRE=7d
COOKIE_SECRET=your_super_secure_cookie_secret_key_32_chars
CLIENT_URL=http://localhost:5173

# Optional: Email Service
# SMTP_HOST=smtp.mailtrap.io
# SMTP_PORT=2525
# SMTP_USER=your_smtp_user
# SMTP_PASS=your_smtp_password
# SMTP_FROM=noreply@expensetrack.com

# AI Assistant Config
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
AI_DAILY_MESSAGE_LIMIT=50
AI_CACHE_TTL=120000
```

#### Frontend (`client/.env`):
Create a `.env` file inside the `client/` directory:
```ini
VITE_API_URL=http://localhost:5000/api
```

### 3. Database Seeding (Optional)
Seed default system categories for newly initialized databases:
```bash
cd server
npm run seed:categories
```

### 4. Start Development Servers
Run backend and frontend servers in separate terminals:

```bash
# Terminal 1: Backend API
cd server
npm run dev

# Terminal 2: Frontend Client
cd client
npm run dev
```

* **Frontend**: Open [http://localhost:5173](http://localhost:5173) in your browser.
* **Backend API**: Running at [http://localhost:5000/api](http://localhost:5000/api).

---

## 📂 Project Structure

```text
expense-tracker/
├── client/                   # Frontend React Application
│   ├── public/               # Static assets & favicon
│   ├── src/
│   │   ├── components/       # Reusable components (UI, Charts, Goals, Gamification, AI)
│   │   ├── constants/        # Application constants & challenge pools
│   │   ├── context/          # React Contexts (Auth, Expense, Gamification, Theme, Dialog)
│   │   ├── hooks/            # Custom hooks (useGoals, useGoalAnalytics, useDialog)
│   │   ├── pages/            # View pages (Dashboard, Expenses, Analytics, Admin, etc.)
│   │   ├── services/         # Axios API service layers
│   │   ├── utils/            # Data calculation utilities & theme formatters
│   │   ├── App.jsx           # Client router and route guards
│   │   └── main.jsx          # Entry point
│   ├── .env.example          # Frontend env template
│   └── package.json
│
├── server/                   # Backend Express API Server
│   ├── config/               # DB connection & environment schema validation
│   ├── controllers/          # 22 Controllers implementing business logic
│   ├── middleware/           # Auth, Joi validation schemas, XSS sanitizer, Error handler
│   ├── models/               # 21 Mongoose database models
│   ├── routes/               # 22 REST API endpoint routers
│   ├── services/             # Dedicated AI Gemini services & reward calculations
│   ├── utils/                # Winston logger, emailer, token generator, formatters
│   ├── scripts/              # Database seeders, DNS tools, AI migration scripts
│   ├── tests/                # Regression tests, AI profiler, session tests
│   ├── server.js             # Main server bootstrap
│   ├── .env.example          # Backend env template
│   └── package.json
│
├── docs/                     # Project Documentation
│   ├── architecture/         # System architecture & database schema diagrams
│   ├── deployment/           # Production deployment guide (Vercel + Render)
│   └── api/                  # High-level REST API reference
│
├── .gitignore                # Production git exclusions
├── package.json              # Monorepo management scripts
└── README.md                 # Project README
```

---

## 📚 Documentation Reference

Detailed documentation is available in the [`docs/`](docs/) directory:
* [System Architecture & Data Models](docs/architecture/MERN_System_Architecture.md)
* [Production Deployment Guide](docs/deployment/deployment-guide.md)
* [REST API Reference](docs/api/api-reference.md)

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
