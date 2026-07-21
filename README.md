# 💰 ExpenseTrack — MERN Stack Finance Manager

A full-stack personal finance tracker built with the MERN stack (MongoDB, Express, React, Node.js).

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- MongoDB Atlas account (free M0 tier)

### 1. Clone & Install

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment

**Server** (`server/.env`):
```
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/expensetracker
JWT_SECRET=your_super_secret_key
JWT_REFRESH_SECRET=your_refresh_secret
CLIENT_URL=http://localhost:5173
```

**Client** (`client/.env`):
```
VITE_API_BASE_URL=http://localhost:5000/api
```

### 3. Run Development Servers

Open two terminals:

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm run dev
```

Visit: **http://localhost:5173**

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| Routing | React Router v6 |
| HTTP | Axios |
| Charts | Recharts |
| State | Context API |
| Backend | Node.js + Express |
| Auth | JWT (access + refresh tokens) |
| Database | MongoDB (Mongoose) |
| Validation | Joi |

## 📦 Features

- ✅ JWT Authentication (Register / Login / Logout / Token Refresh)
- ✅ Dashboard with charts and summary cards
- ✅ Income management (CRUD)
- ✅ Expense management with filters (CRUD)
- ✅ Budget tracking with progress and alerts
- ✅ Reports with monthly trends and category breakdown charts
- ✅ Profile management with password change
- ✅ Default expense categories seeded on registration
- ✅ Dark mode design with glassmorphism


