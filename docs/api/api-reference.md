# API Reference & Route Directory

All backend endpoints are prefixed with `/api`. Protected routes require a valid JWT Bearer access token in the `Authorization` header:

```http
Authorization: Bearer <access_token>
```

---

## Endpoint Modules

### 1. Authentication (`/api/auth`)
* `POST /register` — Register a new user account.
* `POST /login` — Authenticate with email and password; returns access token and sets HttpOnly refresh token cookie.
* `POST /refresh` — Issue a new access token using the valid HttpOnly refresh cookie.
* `POST /logout` — Invalidate current session and clear authentication cookies.
* `POST /forgot-password` — Request password reset OTP/email.
* `POST /reset-password` — Complete password reset with verification token.

### 2. User & Security (`/api/users` & `/api/sessions`)
* `GET /users/me` — Fetch current logged-in user profile and preferences.
* `PUT /users/me` — Update user profile details.
* `GET /users/me/security-logs` — Retrieve security audit trail (logins, password changes, IP changes).
* `GET /sessions` — List all active device sessions for the authenticated user.
* `DELETE /sessions/:id` — Revoke a specific session.
* `DELETE /sessions` — Revoke all other active sessions except current.

### 3. Financial Transactions (`/api/income` & `/api/expenses`)
* `GET /income` / `GET /expenses` — Fetch transactions with pagination, date range filtering, category filtering, and search.
* `POST /income` / `POST /expenses` — Create a new income or expense entry.
* `PUT /income/:id` / `PUT /expenses/:id` — Update an existing transaction.
* `DELETE /income/:id` / `DELETE /expenses/:id` — Remove a transaction and adjust associated wallet balances.

### 4. Wallets & Accounts (`/api/wallets`)
* `GET /wallets` — Retrieve all user wallets with real-time computed balances.
* `POST /wallets` — Create a new payment account (Cash, Bank, Card, Savings).
* `PUT /wallets/:id` — Edit wallet settings (name, color, icon, initial balance).
* `DELETE /wallets/:id` — Archive or remove a wallet.

### 5. Budgets (`/api/budgets`)
* `GET /budgets` — List monthly category budgets with current spending vs limit.
* `POST /budgets` — Set a spending limit for a specific category and month.
* `PUT /budgets/:id` — Update budget threshold.
* `DELETE /budgets/:id` — Delete a budget rule.

### 6. Savings Goals (`/api/goals`)
* `GET /goals` — Fetch user financial goals and progress metrics.
* `POST /goals` — Create a target goal (Target amount, deadline, category, icon).
* `PUT /goals/:id` — Update goal details.
* `DELETE /goals/:id` — Archive goal.
* `POST /goals/:id/contribute` — Log a monetary contribution towards a goal.

### 7. AI Financial Assistant (`/api/ai`)
* `POST /ai/chat` — Send a query to the Google Gemini AI assistant with account context.
* `GET /ai/history` — Retrieve previous chat history for the user.
* `DELETE /ai/history` — Clear conversation history.

### 8. Gamification (`/api/gamification`)
* `GET /gamification/stats` — Fetch user XP, current level, active streak, and badge progress.
* `GET /gamification/challenges` — Retrieve daily financial habits challenges.
* `POST /gamification/claim-chest` — Open unlocked reward chests for bonus XP.

### 9. Statements & Reports (`/api/reports`)
* `GET /reports/summary` — Aggregate financial summary and trends.
* `GET /reports/export/excel` — Download full transaction history formatted as Excel (`.xlsx`).
* `GET /reports/export/pdf` — Generate printable PDF financial statement.

### 10. Social & Group Finance (`/api/split-bills` & `/api/family`)
* `GET /split-bills` / `POST /split-bills` — Group expense splitting and settlement calculations.
* `GET /family` / `POST /family/invite` — Shared family budget room management.

### 11. Subscriptions & Bills (`/api/subscriptions` & `/api/bills`)
* `GET /subscriptions` / `POST /subscriptions` — Recurring subscription tracking.
* `GET /bills` / `POST /bills` — Bill calendar management with due date notifications.

### 12. Administration (`/api/admin`)
* `GET /admin/stats` — High-level platform health, user count, system metrics.
* `GET /admin/users` — User management and governance.
* `GET /admin/logs` — Security and server operational logs.
