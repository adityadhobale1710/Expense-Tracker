# Production Deployment Guide

This guide details how to deploy Expense Tracker in a production environment using modern cloud hosting platforms.

---

## 🏗️ Recommended Deployment Architecture

* **Frontend Client**: Hosted on **Vercel** as a static single-page application (SPA).
* **Backend API**: Hosted on **Render** (or AWS/DigitalOcean/Heroku) as a Node.js Web Service.
* **Database**: Hosted on **MongoDB Atlas** (Managed Cloud Database).
* **AI Service**: Connected to **Google Gemini API** (`@google/genai`).
* **Email Service**: Handled by **Resend** or a custom **SMTP** server.

---

## 1. Backend Deployment (Render)

### Step 1: Create a New Web Service
1. Connect your GitHub repository to Render.
2. Select the repository and configure the service root directory:
   * **Root Directory**: `server`
   * **Environment**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `node server.js`

### Step 2: Configure Environment Variables
Add the following environment variables in the Render Dashboard (use secure values):

| Variable | Description | Example / Format |
|---|---|---|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Listening port (Render sets this automatically) | `5000` |
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://...` |
| `JWT_SECRET` | Secret key for access tokens (>= 32 hex chars) | Generate with `openssl rand -hex 32` |
| `JWT_EXPIRE` | Short-lived access token validity | `15m` |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens | Generate with `openssl rand -hex 32` |
| `JWT_REFRESH_EXPIRE` | Long-lived refresh token validity | `7d` |
| `COOKIE_SECRET` | Secret for signed cookies | Generate with `openssl rand -hex 32` |
| `CLIENT_URL` | Comma-separated list of allowed frontend origins | `https://your-app.vercel.app` |
| `GEMINI_API_KEY` | Google Gemini API Key | `AIzaSy...` |
| `GEMINI_MODEL` | Gemini model variant | `gemini-3.5-flash-lite` |

---

## 2. Frontend Deployment (Vercel)

### Step 1: Import Project to Vercel
1. Import the repository in Vercel.
2. Configure project settings:
   * **Framework Preset**: `Vite`
   * **Root Directory**: `client`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`

### Step 2: Configure Environment Variables
Set the backend API URL in Vercel environment settings:

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | The public base URL of your deployed Express API | `https://your-api.onrender.com/api` |

### Step 3: Verify Client Routing
Vercel uses `client/vercel.json` to route all incoming requests to `index.html` for client-side routing support. Ensure `client/vercel.json` contains:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 3. Post-Deployment Database Initialization

Once the server is connected to MongoDB Atlas, seed default system categories for new users if desired:
```bash
cd server
npm run seed:categories
```

If migrating existing AI chat logs to enforce unique indexes:
```bash
cd server
npm run dedupe:ai
```
