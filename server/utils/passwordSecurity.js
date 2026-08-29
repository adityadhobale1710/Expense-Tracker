import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commonPasswordsSet = new Set();

try {
  // Read once at startup
  const listPath = path.join(__dirname, 'commonPasswords.txt');
  if (fs.existsSync(listPath)) {
    const data = fs.readFileSync(listPath, 'utf-8');
    const lines = data.split(/\r?\n/);
    lines.forEach(line => {
      const pw = line.trim().toLowerCase();
      if (pw) {
        commonPasswordsSet.add(pw);
      }
    });
  } else {
    console.warn(`[Security] Common passwords blocklist not found at ${listPath}`);
  }
} catch (error) {
  console.warn('[Security] Failed to load common passwords blocklist', error);
}

const leetspeakMap = {
  '@': 'a',
  '0': 'o',
  '3': 'e',
  '1': 'i',
  '!': 'i',
  '$': 's'
};

/**
 * Normalizes a password and checks if it matches common blocklist
 * @param {string} password 
 * @returns {boolean} true if password is too common
 */
export const isCommonPassword = (password) => {
  if (!password || typeof password !== 'string') return false;
  
  // 1. Lowercase it
  let normalized = password.toLowerCase();
  
  // 2. Trim whitespace
  normalized = normalized.trim();
  
  // Early return if exact match (catches all-digit common passwords like 12345678 before leetspeak corrupts them)
  if (commonPasswordsSet.has(normalized)) return true;
  
  // 3. Strip trailing digits/punctuation first, but fallback if it empties the string
  const stripped = normalized.replace(/[\d\W_]+$/, '');
  normalized = stripped.length > 0 ? stripped : normalized;
  
  // 4. Replace common leetspeak substitutions
  normalized = normalized.replace(/[@031!$]/g, match => leetspeakMap[match] || match);
  
  // 5. Compare against blocklist
  return commonPasswordsSet.has(normalized);
};

/**
 * Joi custom validator for password security
 */
export const commonPasswordValidator = (value, helpers) => {
  if (isCommonPassword(value)) {
    return helpers.message('This password is too common. Please choose a stronger password.');
  }
  return value;
};

export const passwordComplexityRegex = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/;

export const passwordComplexityMessages = {
  'string.pattern.base': 'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character.',
  'string.min': 'Password must be at least 8 characters long.'
};

/**
 * Applies both complexity rules and common-password blocklist
 * @param {import('joi').StringSchema} joiString 
 */
export const applyPasswordRules = (joiString) => {
  return joiString
    .min(8)
    .max(128)
    .pattern(passwordComplexityRegex)
    .messages(passwordComplexityMessages)
    .custom(commonPasswordValidator)
    .required();
};
