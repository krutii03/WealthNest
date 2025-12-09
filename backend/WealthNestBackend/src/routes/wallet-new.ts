import { Router } from 'express';
import * as walletController from '../controllers/wallet.controller';

const router = Router();

router.get('/:userId', walletController.getWalletController);
router.post('/withdraw', walletController.withdrawController);

export default router;

