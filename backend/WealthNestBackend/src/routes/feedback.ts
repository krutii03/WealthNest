import { Router, Request, Response } from 'express';

const router = Router();

/**
 * POST /api/feedback
 * Sends feedback via email to krutip609@gmail.com
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const feedbackData = {
      name: name || 'Anonymous',
      email: email || 'No email provided',
      message: message.trim(),
      timestamp: new Date().toISOString(),
      recipient: 'krutip609@gmail.com'
    };

    // Log feedback for now
    console.log('=== FEEDBACK RECEIVED ===');
    console.log('From:', feedbackData.name, `(${feedbackData.email})`);
    console.log('Message:', feedbackData.message);
    console.log('Timestamp:', feedbackData.timestamp);
    console.log('To be sent to:', feedbackData.recipient);
    console.log('========================');

    // Try to send email if nodemailer is configured
    try {
      // Dynamic import to avoid errors if nodemailer is not installed
      const nodemailer = await import('nodemailer').catch(() => null);
      
      if (nodemailer && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: feedbackData.recipient,
          subject: `WealthNest Feedback from ${feedbackData.name}`,
          text: `Name: ${feedbackData.name}\nEmail: ${feedbackData.email}\nTimestamp: ${feedbackData.timestamp}\n\nMessage:\n${feedbackData.message}`,
          html: `
            <h2>New Feedback from WealthNest</h2>
            <p><strong>Name:</strong> ${feedbackData.name}</p>
            <p><strong>Email:</strong> ${feedbackData.email}</p>
            <p><strong>Timestamp:</strong> ${new Date(feedbackData.timestamp).toLocaleString()}</p>
            <hr>
            <p><strong>Message:</strong></p>
            <p>${feedbackData.message.replace(/\n/g, '<br>')}</p>
          `
        });
        
        console.log('✓ Feedback email sent successfully to', feedbackData.recipient);
      } else {
        console.log('ℹ Email not configured. To enable email sending, add SMTP_USER and SMTP_PASS to .env');
        console.log('   Feedback logged above. Configure nodemailer to send emails automatically.');
      }
    } catch (emailError: any) {
      console.error('⚠ Email sending failed (feedback still logged):', emailError.message);
      // Don't fail the request if email fails - feedback is still logged
    }

    res.status(200).json({ 
      success: true,
      message: 'Thank you for your feedback! We\'ll get back to you soon.' 
    });
  } catch (error: any) {
    console.error('Error processing feedback:', error);
    res.status(500).json({ 
      error: 'Failed to send feedback. Please try again later.',
      details: error.message 
    });
  }
});

export default router;

