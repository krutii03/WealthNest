import { Request, Response } from 'express';
import { createOrder, verifyPayment, handleWebhook } from '../services/payment.service';
import { verifyWebhookSignature } from '../utils/razorpay.util';
import { CreateOrderRequest, VerifyPaymentDto } from '../models/dto';

export async function createOrderController(req: Request, res: Response): Promise<void> {
  try {
    console.log('[Create Order] Request received, body:', req.body);
    const { amount }: CreateOrderRequest = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      console.log('[Create Order] Invalid amount:', amount);
      res.status(400).json({ error: 'Invalid amount. Amount must be a positive number.' });
      return;
    }

    console.log('[Create Order] Creating Razorpay order for amount:', amount);
    const order = await createOrder(amount);
    console.log('[Create Order] Order created successfully:', order.id);
    res.status(200).json(order);
  } catch (error: any) {
    console.error('[Create Order] Error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to create order' });
  }
}

export async function verifyPaymentController(req: Request, res: Response): Promise<void> {
  try {
    const payload: VerifyPaymentDto = req.body;

    if (!payload.razorpay_payment_id || !payload.razorpay_order_id || !payload.razorpay_signature) {
      res.status(400).json({ error: 'Missing required payment verification fields' });
      return;
    }

    if (!payload.amount || payload.amount <= 0) {
      res.status(400).json({ error: 'Invalid amount' });
      return;
    }

    if (!payload.userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const result = await verifyPayment(payload);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        transactionId: result.transactionId,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Payment verification failed',
      });
    }
  } catch (error: any) {
    console.error('Error in verifyPaymentController:', error);
    res.status(500).json({ error: error.message || 'Failed to verify payment' });
  }
}

export async function webhookController(req: Request, res: Response): Promise<void> {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'] as string;

    if (!webhookSecret) {
      console.warn('Webhook secret not configured, skipping signature verification');
    } else if (!signature) {
      res.status(400).json({ error: 'Missing webhook signature' });
      return;
    } else {
      // Verify webhook signature
      const rawBody = JSON.stringify(req.body);
      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);

      if (!isValid) {
        res.status(400).json({ error: 'Invalid webhook signature' });
        return;
      }
    }

    const result = await handleWebhook(req.body);

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error in webhookController:', error);
    res.status(500).json({ error: error.message || 'Failed to process webhook' });
  }
}

