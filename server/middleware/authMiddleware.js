import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Session from '../models/Session.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password -refreshToken');
      if (!req.user) {
        res.status(401);
        throw new Error('User not found');
      }
      // MASTER-036: Reject blocked/disabled users even if their token is still valid
      if (req.user.isBlocked || req.user.isDisabled) {
        res.status(403);
        throw new Error('Account has been disabled. Please contact support.');
      }

      // Phase 3: tokenVersion check. Immediate invalidation of access tokens.
      // Missing tokenVersion (legacy tokens) defaults to 0.
      const tokenVersion = decoded.tokenVersion || 0;
      if (tokenVersion !== (req.user.tokenVersion || 0)) {
        res.status(401);
        throw new Error('Token has been revoked. Please log in again.');
      }

      // Phase 3: per-session validation and Last Seen tracking
      if (decoded.sessionId) {
        const session = await Session.findById(decoded.sessionId);
        if (!session || !session.isActive) {
          res.status(401);
          throw new Error('Session has been revoked or is no longer active.');
        }

        // Expose sessionId to req so logout can find it easily
        req.user._sessionId = decoded.sessionId;

        // Throttled Last Seen update (only update if > 5 mins since last update)
        // Best effort - never throws to break the request
        try {
          const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
          if (!session.lastActive || session.lastActive < fiveMinsAgo) {
            await Session.updateOne(
              { _id: session._id },
              { $set: { lastActive: new Date() } }
            );
          }
        } catch (err) {
          console.error(`[Auth] Failed to update Last Seen: ${err.message}`);
        }
      }

      return next();
    } catch (error) {
      // Phase 3 bug fix: preserve intentional 403s set above
      if (res.statusCode !== 403) {
        res.status(401);
      }
      // Re-throw the original error so errorHandler can classify
      // JsonWebTokenError / TokenExpiredError specifically.
      throw error;
    }
  } else if (req.query.token) {
    // Issue #7 fix: use .startsWith() NOT .includes() to prevent bypass via
    // crafted URLs like /api/other?injected=/api/analytics/export/&token=...
    const DOWNLOAD_ROUTE_PREFIXES = [
      '/api/analytics/export/',
      '/api/admin/analytics/export/',
    ];
    const isDownloadRoute = DOWNLOAD_ROUTE_PREFIXES.some(p => req.originalUrl.startsWith(p));
    if (!isDownloadRoute) {
      res.status(401);
      throw new Error('Not authorized, query token only permitted for export requests');
    }

    try {
      token = req.query.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password -refreshToken');
      if (!req.user) {
        res.status(401);
        throw new Error('User not found');
      }
      // MASTER-036: Reject blocked/disabled users for query-token export path too
      if (req.user.isBlocked || req.user.isDisabled) {
        res.status(403);
        throw new Error('Account has been disabled. Please contact support.');
      }

      // Phase 3: tokenVersion check.
      const tokenVersion = decoded.tokenVersion || 0;
      if (tokenVersion !== (req.user.tokenVersion || 0)) {
        res.status(401);
        throw new Error('Token has been revoked.');
      }

      // We skip the detailed sessionId check for export query tokens to keep it fast,
      // as tokenVersion handles the secure revocation.

      return next();
    } catch (error) {
      // Phase 3 bug fix: preserve intentional 403s set above
      if (res.statusCode !== 403) {
        res.status(401);
      }
      // Re-throw the original error so errorHandler can classify it correctly.
      throw error;
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});


export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(`Role '${req.user.role}' is not authorized to access this route`);
    }
    next();
  };
};
