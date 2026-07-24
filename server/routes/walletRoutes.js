import express from 'express';
import {
  getWallets,
  getWalletById,
  createWallet,
  updateWallet,
  deleteWallet,
  updateBalance,
  setPrimary,
  transferFunds,
  getWalletHistory,
} from '../controllers/walletController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
  .get(getWallets)
  .post(createWallet);

router.post('/transfer', transferFunds);

router.route('/:id')
  .get(getWalletById)
  .put(updateWallet)
  .delete(deleteWallet);

router.patch('/:id/balance', updateBalance);
router.patch('/:id/set-primary', setPrimary);
router.get('/:id/history', getWalletHistory);

export default router;
