import express from 'express';
import { getMe, updateMe, updateGamification, changePassword, deleteMe } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.get('/me', getMe);
router.put('/me', updateMe);
router.put('/me/gamification', updateGamification);
router.put('/me/password', changePassword);
router.delete('/me', deleteMe);

export default router;
