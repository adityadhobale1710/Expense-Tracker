/**
 * Verification Script 1: Winston logger bug proof
 *
 * Demonstrates that passing a bare Error to logger.error() silently drops
 * message and stack (prints "undefined"), while passing explicit fields works.
 *
 * Run: node tests/verify_logger_bug.js
 */

import winston from 'winston';
import { createRequire } from 'module';

// ── Build a logger that mirrors the dev format in logger.js ──────────────────
const { combine, colorize, timestamp, printf, errors } = winston.format;

const devFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = winston.createLogger({
  level: 'error',
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        errors({ stack: true }),
        devFormat
      ),
    }),
  ],
});

const err = new Error('Something went terribly wrong!');

console.log('\n========================================================');
console.log('TEST 1 — BUGGY: logger.error(err)  (bare Error object)');
console.log('Expect:  "[error]: undefined"  ← bug proven');
console.log('========================================================');
logger.error(err);          // ← original buggy call

console.log('\n========================================================');
console.log('TEST 2 — FIXED: logger.error(message, { stack, name })');
console.log('Expect:  real message + full stack trace');
console.log('========================================================');
logger.error(err.message, { stack: err.stack, name: err.name });   // ← fix
