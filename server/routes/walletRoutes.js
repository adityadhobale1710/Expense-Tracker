import express from 'express';
import { getWallets, createWallet, updateWallet, deleteWallet, transferFunds } from '../controllers/walletController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
  .get(getWallets)
  .post(createWallet);

router.route('/:id')
  .put(updateWallet)
  .delete(deleteWallet);

router.post('/transfer', transferFunds);

export default router;
