import express from 'express';
import { testEmail } from '../controllers/emailController.js';

const router = express.Router();

// @route   POST /api/email/test
// @desc    Test Resend email integration
// @access  Public (Temporary for manual testing)
router.post('/test', testEmail);

export default router;
