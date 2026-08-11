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
import { validate } from '../middleware/validate.js';
import {
  walletSchema,
  walletUpdateSchema,
  walletBalanceSchema,
  walletTransferSchema,
} from '../middleware/schemas.js';

const router = express.Router();
router.use(protect);

router.route('/')
  .get(getWallets)
  .post(validate(walletSchema), createWallet);

router.post('/transfer', validate(walletTransferSchema), transferFunds);

router.route('/:id')
  .get(getWalletById)
  .put(validate(walletUpdateSchema), updateWallet)
  .delete(deleteWallet);

router.patch('/:id/balance', validate(walletBalanceSchema), updateBalance);
router.patch('/:id/set-primary', setPrimary);
router.get('/:id/history', getWalletHistory);

export default router;
