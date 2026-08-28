/**
 * Verification Script: Email Fallback Rollback in Production
 * 
 * Simulates NODE_ENV=production where Gmail is unconfigured/fails,
 * ensuring that register, forgotPassword, resendVerification, and inviteMember
 * return a 502 status and roll back their state instead of false 200 OK.
 * 
 * Run: node tests/verify_email_fallback.mjs
 */

import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Family from '../models/Family.js';
import * as authController from '../controllers/authController.js';
import * as familyController from '../controllers/familyController.js';

// Mock sendEmail to return the production fallback behavior
jest.unstable_mockModule('../utils/sendEmail.js', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: false, mocked: false, deliveryFailed: true }),
  getHtmlTemplate: jest.fn().mockReturnValue('<html></html>'),
  escapeHtml: jest.fn((str) => str)
}));

// We need to run this with Jest or write a manual mock runner.
// Given the repo uses standalone scripts, let's write a manual mock runner.
