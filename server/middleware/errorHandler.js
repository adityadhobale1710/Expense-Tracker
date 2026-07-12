import logger from '../utils/logger.js';

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'An unexpected server error occurred';
  let errors = null;

  // Log error with stack trace via Winston
  logger.error(err);

  // 1. Handle Joi Validation Errors
  if (err.isJoi || err.name === 'ValidationError' && err.details) {
    statusCode = 400;
    message = 'Validation failed';
    errors = err.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));
  }
  // 2. Handle Mongoose Validation Errors
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Database validation failed';
    errors = Object.keys(err.errors).map((key) => ({
      field: key,
      message: err.errors[key].message,
    }));
  }
  // 3. Handle Mongoose Cast Errors (e.g. invalid ObjectId)
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for field '${err.path}'`;
  }
  // 4. Handle MongoDB Duplicate Key Errors (code 11000)
  else if (err.code === 11000) {
    statusCode = 400;
    const duplicatedField = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record already exists with that ${duplicatedField}`;
  }
  // 5. Handle JWT Errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token. Please log in again.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired. Please log in again.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    data: null,
    errors,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
