import winston from 'winston';

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

// Custom log format for development (console)
const devFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

// Define transports
const transports = [];

if (process.env.NODE_ENV === 'production') {
  // JSON format for structured production logs
  transports.push(
    new winston.transports.Console({
      format: combine(
        timestamp(),
        errors({ stack: true }),
        json()
      ),
    })
  );
} else {
  // Colorized output for development console
  transports.push(
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        devFormat
      ),
    })
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transports,
});

export default logger;
