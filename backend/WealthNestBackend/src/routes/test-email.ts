import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { sendEmail, generateTransactionEmailHTML, TransactionEmailData } from '../services/email.service';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

router.post('/test-email', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user?.email) {
      return res.status(400).json({ error: 'User email not found' });
    }

    const { data: userProfile } = await supabaseAdmin
      ?.from('users')
      .select('name, email')
      .eq('email', req.user.email)
      .maybeSingle() || { data: null };

    const userName = userProfile?.name || req.user.email?.split('@')[0] || 'User';

    const testEmailData: TransactionEmailData = {
      userName,
      userEmail: req.user.email,
      transactionType: 'invest',
      assetName: 'Test Mutual Fund',
      assetSymbol: 'TEST',
      quantity: 10.5,
      price: 100.50,
      totalAmount: 1055.25,
      transactionDate: new Date(),
      newWalletBalance: 5000.00,
    };

    const emailSent = await sendEmail({
      to: req.user.email,
      subject: 'Test Email - WealthNest Transaction',
      html: generateTransactionEmailHTML(testEmailData),
    });

    if (emailSent) {
      res.json({
        success: true,
        message: `Test email sent successfully to ${req.user.email}`,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email. Check backend logs and SMTP configuration.',
        hint: 'Make sure SMTP_USER and SMTP_PASSWORD are set in .env file',
      });
    }
  } catch (error: any) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send test email',
    });
  }
});

export default router;

