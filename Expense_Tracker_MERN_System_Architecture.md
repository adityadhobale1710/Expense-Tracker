# Expense Tracker System Architecture (MERN Stack)

## Overview

This project follows a **3-tier MERN architecture**:

``` text
+---------------------------+
|   React Frontend (Client) |
+------------+--------------+
             |
      HTTPS / REST API
             |
+------------v--------------+
| Express.js + Node.js API  |
| Authentication (JWT)      |
| Business Logic            |
| Validation               |
+------------+--------------+
             |
        Mongoose ODM
             |
+------------v--------------+
|      MongoDB Database     |
+---------------------------+
```

## Frontend (React)

-   React + Vite
-   React Router
-   Axios
-   Context API / Redux
-   Tailwind CSS or Bootstrap

### Modules

-   Authentication
-   Dashboard
-   Income
-   Expenses
-   Budget
-   Reports
-   Profile

## Backend (Node.js + Express)

### API Routes

-   `/api/auth`
-   `/api/users`
-   `/api/income`
-   `/api/expenses`
-   `/api/categories`
-   `/api/budgets`
-   `/api/reports`

### Middleware

-   JWT Authentication
-   Authorization
-   Validation
-   Error Handling
-   CORS

## Database (MongoDB)

Collections: - users - incomes - expenses - categories - budgets -
reports

Relationships: - User → Income (1:N) - User → Expense (1:N) - User →
Budget (1:N) - Category → Expense (1:N)

## Request Flow

``` text
User
  │
  ▼
React UI
  │
Axios API Call
  │
Express Route
  │
Controller
  │
Service
  │
Mongoose Model
  │
MongoDB
  │
Response
  ▼
React UI Update
```

## Suggested Folder Structure

``` text
expense-tracker/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── services/
│   │   └── App.jsx
│   └── package.json
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── server.js
│   └── package.json
└── README.md
```

## Deployment

-   Frontend: Vercel
-   Backend: Render/Railway
-   Database: MongoDB Atlas

## Tech Stack

-   React
-   Node.js
-   Express.js
-   MongoDB
-   Mongoose
-   JWT
-   Axios
-   Tailwind CSS
