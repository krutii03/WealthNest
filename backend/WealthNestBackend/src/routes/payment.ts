import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';

const router = Router();

router.post('/create-order', paymentController.createOrderController);
router.post('/verify', paymentController.verifyPaymentController);
router.post('/webhook', paymentController.webhookController);

export default router;

