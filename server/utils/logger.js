import winston from 'winston';
import fs from 'fs';

if (process.env.NODE_ENV === 'development' && process.env.AI_TRACE === 'true') {
  const logFile = 'trace.log';
  if (fs.existsSync(logFile) && fs.statSync(logFile).size > 10 * 1024 * 1024) {
    fs.truncateSync(logFile, 0);
  }
  const traceStream = fs.createWriteStream(logFile, { flags: 'a' });
  const originalLog = console.log;
  console.log = function(...args) {
    originalLog.apply(console, args);
    traceStream.write(args.join(' ') + '\n');
  };
}

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
