import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      req.user = await User.findById(decoded.id).select('-password -refreshToken');
      if (!req.user) {
        res.status(401);
        throw new Error('User not found');
      }
      // Check if account is disabled (Issue #2)
      if (req.user.isDisabled || req.user.isBlocked) {
        res.status(403);
        throw new Error('Account is disabled. Please contact support.');
      }
      return next();
    } catch (error) {
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  } else if (req.query.token) {
    // strict check: allow query parameter authentication ONLY for analytics file download paths
    const isDownloadRoute = req.originalUrl.includes('/api/analytics/export/');
    if (!isDownloadRoute) {
      res.status(401);
      throw new Error('Not authorized, query token only permitted for export requests');
    }

    try {
      token = req.query.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      req.user = await User.findById(decoded.id).select('-password -refreshToken');
      if (!req.user) {
        res.status(401);
        throw new Error('User not found');
      }
      // Check if account is disabled (Issue #2)
      if (req.user.isDisabled || req.user.isBlocked) {
        res.status(403);
        throw new Error('Account is disabled. Please contact support.');
      }
      return next();
    } catch (error) {
      res.status(401);
      throw new Error('Not authorized, token failed');
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
