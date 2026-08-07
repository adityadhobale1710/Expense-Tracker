import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dns from 'dns';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';

// Validate Env vars first
import './config/env.js';
import connectDB from './config/db.js';
import logger from './utils/logger.js';
import { xssSanitizer } from './middleware/xssSanitizer.js';
import errorHandler from './middleware/errorHandler.js';

// Set public DNS servers to resolve MongoDB SRV records
dns.setServers(['8.8.8.8', '1.1.1.1']);

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import incomeRoutes from './routes/incomeRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import goalRoutes from './routes/goalRoutes.js';
import investmentRoutes from './routes/investmentRoutes.js';
import loanRoutes from './routes/loanRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import splitRoutes from './routes/splitRoutes.js';
import familyRoutes from './routes/familyRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import gamificationRoutes from './routes/gamificationRoutes.js';
import billRoutes from './routes/billRoutes.js';

connectDB();


const app = express();

// Set trust proxy (important for Render/Vercel rate limiters to read Client IP correctly)
app.set('trust proxy', 1);

// ─── Security & Performance Middleware ──────────────────────────────────────────
app.use(helmet()); // Secure HTTP headers

// ─── CORS Policy (Moved up to execute before body parsing for options preflight) ──
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    // Support multiple comma-separated CLIENT_URLs
    const clientUrls = (process.env.CLIENT_URL || '')
      .split(',')
      .map(url => url.trim().replace(/\/$/, ''));

    // Fallback URLs to ensure the deployed frontend is always allowed
    const fallbackUrls = ['https://expense-tracker-five-virid-19.vercel.app'];
    const allowedUrls = [...clientUrls, ...fallbackUrls];

    const isAllowed = allowedUrls.includes(origin) ||
      (process.env.NODE_ENV === 'development' && (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')));

    if (isAllowed) {
      return callback(null, true);
    }

    // Strict Vercel preview domain check.
    if (clientUrls.some(url => url.includes('vercel.app'))) {
      try {
        const prodClientUrl = clientUrls.find(url => url.includes('vercel.app')) || fallbackUrls[0];
        const prodHost = new URL(prodClientUrl).hostname;
        // Extract the canonical project slug (everything before the first dash-separated hash segment)
        const projectSlug = prodHost.replace(/\.vercel\.app$/, '').split('-').slice(0, -1).join('-') ||
          prodHost.replace(/\.vercel\.app$/, '');
        const originHost = new URL(origin).hostname;

        // Strict pattern: <projectSlug>-<alphanumeric_hash>.vercel.app
        const strictPreviewPattern = new RegExp(
          `^${projectSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-[a-z0-9]+\\.vercel\\.app$`
        );

        if (strictPreviewPattern.test(originHost)) {
          return callback(null, true);
        }
      } catch (err) {
        logger.error(`Error parsing preview domain check: ${err.message}`);
      }
    }

    logger.warn(`CORS block triggered for origin: ${origin}`);
    callback(null, false); // Reject CORS request
  },
  credentials: true, // Required to allow cookies in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cookie'],
  optionsSuccessStatus: 200
}));

app.use(compression()); // Compress text-based responses
app.use(express.json({ limit: '50kb' })); // Body parser with small limit to prevent payload attacks
app.use(cookieParser(process.env.COOKIE_SECRET)); // Cookie parser with secret key
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(hpp()); // Prevent HTTP Parameter Pollution
app.use(xssSanitizer); // Sanitize XSS payloads in request body/query/params

// Disable X-Powered-By header explicitly
app.disable('x-powered-by');

// ─── Winston request logging via Morgan ──────────────────────────────────────────
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// ─── Rate Limiting ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

if (process.env.NODE_ENV === 'production') {
  app.use('/api/', globalLimiter);
} else {
  // Relaxed development rate limit to prevent 429 errors during hot reloading / StrictMode
  app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10000,
    message: {
      success: false,
      message: 'Too many requests in development.'
    },
    standardHeaders: true,
    legacyHeaders: false
  }));
}

// ─── API Routes ───────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the Expense Tracker API! 🚀',
    status: 'Running smoothly'
  });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/splits', splitRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/bills', billRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

const PORT = parseInt(process.env.PORT || '5000', 10);
app.listen(PORT, () => {
  logger.info(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
});

// ─── Process-Level Error Guards ────────────────────────────────────────────────
// J2 fix: without these, unhandled rejections outside Express handlers kill the
// process silently. Both handlers log via Winston so the error is captured in
// logs, then exit(1) so the process manager (PM2 / Render / Railway) can restart.

process.on('unhandledRejection', (reason) => {
  if (reason instanceof Error) {
    logger.error(reason.message, { stack: reason.stack, name: reason.name });
  } else {
    logger.error(String(reason));
  }
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error(err.message || String(err), { stack: err.stack, name: err.name });
  process.exit(1);
});
