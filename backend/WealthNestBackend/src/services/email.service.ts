import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

let transporter: nodemailer.Transporter | null = null;

function initializeTransporter() {
  if (transporter) return transporter;

  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;

  if (!smtpUser || !smtpPassword) {
    console.warn('SMTP credentials not configured. Email service will be disabled.');
    console.warn('Please set SMTP_USER and SMTP_PASSWORD (or SMTP_PASS) in .env');
    return null;
  }

  // Use Gmail service if SMTP_HOST is not set (matches feedback implementation)
  if (!process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });
  } else {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });
  }

  return transporter;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const emailTransporter = initializeTransporter();
    
    if (!emailTransporter) {
      console.warn('⚠️  Email service not available. Skipping email send.');
      console.warn('   To enable emails, add SMTP_USER and SMTP_PASSWORD to your .env file');
      console.warn('   See EMAIL_SETUP.md for configuration instructions');
      return false;
    }

    const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@wealthnest.com';

    console.log(`📧 Attempting to send email to ${options.to}...`);
    
    const info = await emailTransporter.sendMail({
      from: `"WealthNest" <${smtpFrom}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    console.log(`✅ Email sent successfully to ${options.to}`);
    console.log(`   Message ID: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error('❌ Error sending email:', error.message);
    console.error('   Full error:', error);
    if (error.code === 'EAUTH') {
      console.error('   Authentication failed. Check your SMTP_USER and SMTP_PASSWORD.');
    } else if (error.code === 'ECONNECTION') {
      console.error('   Connection failed. Check SMTP_HOST and SMTP_PORT.');
    }
    return false;
  }
}

export interface TransactionEmailData {
  userName: string;
  userEmail: string;
  transactionType: 'buy' | 'sell' | 'invest' | 'redeem' | 'deposit' | 'withdraw';
  assetName: string;
  assetSymbol?: string;
  quantity: number;
  price: number;
  totalAmount: number;
  transactionDate: Date;
  newWalletBalance?: number;
}

export function generateTransactionEmailHTML(data: TransactionEmailData): string {
  const transactionTypeLabel = {
    buy: 'Stock Purchase',
    sell: 'Stock Sale',
    invest: 'Mutual Fund Investment',
    redeem: 'Mutual Fund Redemption',
    deposit: 'Wallet Deposit',
    withdraw: 'Wallet Withdrawal',
  }[data.transactionType];

  const actionLabel = {
    buy: 'Purchased',
    sell: 'Sold',
    invest: 'Invested in',
    redeem: 'Redeemed',
    deposit: 'Deposited',
    withdraw: 'Withdrew',
  }[data.transactionType];

  const unitLabel = data.transactionType === 'buy' || data.transactionType === 'sell' 
    ? 'shares' 
    : data.transactionType === 'deposit' || data.transactionType === 'withdraw'
    ? 'transaction'
    : 'units';

  const formattedDate = data.transactionDate.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transaction Confirmation - WealthNest</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">WealthNest</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Transaction Confirmation</p>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Dear ${data.userName},</p>
    
    <p style="font-size: 16px; margin-bottom: 25px;">
      This is to confirm that your ${transactionTypeLabel.toLowerCase()} has been processed successfully.
    </p>
    
    <div style="background: #f9fafb; border-left: 4px solid #14b8a6; padding: 20px; margin: 25px 0; border-radius: 5px;">
      <h2 style="margin-top: 0; color: #14b8a6; font-size: 20px;">Transaction Details</h2>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 0; font-weight: 600; color: #6b7280;">Type:</td>
          <td style="padding: 10px 0; text-align: right; color: #111827;">${transactionTypeLabel}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 0; font-weight: 600; color: #6b7280;">Asset:</td>
          <td style="padding: 10px 0; text-align: right; color: #111827;">
            ${data.assetName}${data.assetSymbol ? ` (${data.assetSymbol})` : ''}
          </td>
        </tr>
        ${data.transactionType !== 'deposit' && data.transactionType !== 'withdraw' ? `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 0; font-weight: 600; color: #6b7280;">Quantity:</td>
          <td style="padding: 10px 0; text-align: right; color: #111827;">
            ${data.quantity.toLocaleString('en-IN', { maximumFractionDigits: 4 })} ${unitLabel}
          </td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 0; font-weight: 600; color: #6b7280;">Price per ${unitLabel.slice(0, -1)}:</td>
          <td style="padding: 10px 0; text-align: right; color: #111827;">
            ₹${data.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </td>
        </tr>
        ` : ''}
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 0; font-weight: 600; color: #6b7280;">Total Amount:</td>
          <td style="padding: 10px 0; text-align: right; color: #111827; font-weight: 700; font-size: 18px;">
            ₹${data.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 0; font-weight: 600; color: #6b7280;">Date & Time:</td>
          <td style="padding: 10px 0; text-align: right; color: #111827;">${formattedDate} IST</td>
        </tr>
        ${data.newWalletBalance !== undefined ? `
        <tr>
          <td style="padding: 10px 0; font-weight: 600; color: #6b7280;">New Wallet Balance:</td>
          <td style="padding: 10px 0; text-align: right; color: #111827; font-weight: 700;">
            ₹${data.newWalletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 25px; margin-bottom: 5px;">
      Thank you for using WealthNest!
    </p>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 5px;">
      If you did not perform this transaction, please contact our support team immediately.
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 5px 0;">This is an automated email. Please do not reply to this message.</p>
    <p style="margin: 5px 0;">© ${new Date().getFullYear()} WealthNest. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();
}

