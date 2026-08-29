import Joi from 'joi';
import { applyPasswordRules } from './utils/passwordSecurity.js';

const schema = Joi.object({
  password: applyPasswordRules(Joi.string())
});

const testPasswords = [
  'short', 
  'noSpecial123A',
  'no_upper_123',
  'NO_LOWER_123!',
  'No_Digits_Here!',
  'password', // <8, common, no upper/digit/special
  'Password123!', // common (in set), but complex enough
  'Valid123!@#', // valid
];

console.log('| Password | Result | Reason |');
console.log('|---|---|---|');

for (const pw of testPasswords) {
  const result = schema.validate({ password: pw }, { abortEarly: false });
  if (result.error) {
    const msgs = result.error.details.map(d => d.message).join('<br>');
    console.log(`| \`${pw}\` | ❌ REJECTED | ${msgs} |`);
  } else {
    console.log(`| \`${pw}\` | ✅ ACCEPTED | - |`);
  }
}
