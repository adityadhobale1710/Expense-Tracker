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

connectDB();

const app = express();

// Set trust proxy (important for Render/Vercel rate limiters to read Client IP correctly)
app.set('trust proxy', 1);

// ─── Security & Performance Middleware ──────────────────────────────────────────
app.use(helmet()); // Secure HTTP headers
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

// ─── CORS Policy ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    // Standardize client URL (remove trailing slash)
    const clientUrl = (process.env.CLIENT_URL || '').replace(/\/$/, '');

    const isAllowed = (origin === clientUrl) ||
      (process.env.NODE_ENV === 'development' && (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')));

    if (isAllowed) {
      return callback(null, true);
    }

    // Dynamic verification for Vercel preview environments
    if (clientUrl && clientUrl.includes('vercel.app')) {
      try {
        const prodHost = new URL(clientUrl).hostname;
        const projectPrefix = prodHost.split('.vercel.app')[0].split('-').slice(0, 2).join('-');
        const originHost = new URL(origin).hostname;
        if (originHost.startsWith(projectPrefix) && originHost.endsWith('.vercel.app')) {
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
app.use('/api/', globalLimiter);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));
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
