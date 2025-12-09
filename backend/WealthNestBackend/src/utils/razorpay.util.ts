import crypto from 'crypto';

export function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  secret: string
): boolean {
  try {
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !secret) {
      console.error('Missing required parameters for signature verification');
      return false;
    }

    const message = `${razorpayOrderId}|${razorpayPaymentId}`;
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');
    
    const normalizedReceived = razorpaySignature.trim().toLowerCase();
    const normalizedExpected = expectedSignature.trim().toLowerCase();
    
    if (normalizedReceived.length !== normalizedExpected.length) {
      console.error('Signature length mismatch');
      return false;
    }
    
    try {
      return crypto.timingSafeEqual(
        Buffer.from(normalizedReceived, 'hex'),
        Buffer.from(normalizedExpected, 'hex')
      );
    } catch (bufferError) {
      console.warn('Hex parsing failed, using string comparison:', bufferError);
      return normalizedReceived === normalizedExpected;
    }
  } catch (error: any) {
    console.error('Error verifying Razorpay signature:', error);
    return false;
  }
}

export function verifyWebhookSignature(
  webhookBody: string,
  webhookSignature: string,
  secret: string
): boolean {
  try {
    if (!webhookBody || !webhookSignature || !secret) {
      console.error('Missing required parameters for webhook signature verification');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(webhookBody)
      .digest('hex');
    
    const normalizedReceived = webhookSignature.trim().toLowerCase();
    const normalizedExpected = expectedSignature.trim().toLowerCase();
    
    if (normalizedReceived.length !== normalizedExpected.length) {
      console.error('Webhook signature length mismatch');
      return false;
    }
    
    try {
      return crypto.timingSafeEqual(
        Buffer.from(normalizedReceived, 'hex'),
        Buffer.from(normalizedExpected, 'hex')
      );
    } catch (bufferError) {
      console.warn('Webhook hex parsing failed, using string comparison:', bufferError);
      return normalizedReceived === normalizedExpected;
    }
  } catch (error: any) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

