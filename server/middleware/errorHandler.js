import logger from '../utils/logger.js';

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'An unexpected server error occurred';
  let errors = null;

  // Log error with stack trace via Winston (bare Error objects are silently dropped by
  // Object.assign inside Winston, so we must pass explicit enumerable fields instead)
  logger.error(message, { status: statusCode, stack: err.stack, name: err.name });

  // 1. Handle Joi Validation Errors (parentheses enforce correct operator precedence)
  if (err.isJoi || (err.name === 'ValidationError' && err.details)) {
    statusCode = 400;
    // M2 fix: validate.js maps raw Joi text to friendly copy before throwing and
    // flags `alreadyMapped`, so keep that user-friendly message instead of the
    // generic "Validation failed" placeholder.
    message = err.alreadyMapped && err.message ? err.message : 'Validation failed';
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

  // H1 fix: never expose stack traces via the API. The deployed server was found
  // running with NODE_ENV != production, which leaked full absolute paths and
  // middleware internals to anyone. Stack traces belong in the server logs
  // (already written above via Winston), not in client responses. Explicitly
  // opt-in for local debugging via EXPOSE_ERROR_STACK=true.
  const exposeStack = process.env.EXPOSE_ERROR_STACK === 'true' && process.env.NODE_ENV === 'development';
  res.status(statusCode).json({
    success: false,
    message,
    data: null,
    errors,
    ...(exposeStack && { stack: err.stack }),
  });
};

export default errorHandler;
