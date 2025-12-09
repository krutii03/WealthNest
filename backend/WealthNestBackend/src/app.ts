import express from 'express';
import cors from 'cors';
import { supabase } from './config/supabase';
import authRoutes from './routes/auth';
import portfolioRoutes from './routes/portfolio';
import assetsRoutes from './routes/assets';
import walletRoutes from './routes/wallet';
import walletNewRoutes from './routes/wallet-new';
import leaderboardRoutes from './routes/leaderboard';
import marketRoutes from './routes/market';
import feedbackRoutes from './routes/feedback';
import adminRoutes from './routes/admin';
import paymentRoutes from './routes/payment';
import testEmailRoutes from './routes/test-email';
import testRoutes from './routes/test-routes';
import { startPriceScheduler } from './services/priceSimulator';
import './services/db.service';
import { isDatabaseAvailable } from './services/db.service';

export const app = express();
const PORT = process.env.PORT || 3001;

const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5000',
    'http://localhost:3001',
    'https://wealthnestt.netlify.app',
    'https://*.netlify.app',
    process.env.FRONTEND_URL || ''
  ].filter(Boolean),
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  credentials: true,
  optionsSuccessStatus: 204,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/', (req, res) => {
  res.redirect('/api/health');
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'WealthNest API is running',
    endpoints: [
      '/api/health - Health check',
      '/api/auth - Authentication routes',
      '/api/portfolio - Portfolio management',
      '/api/assets - Asset information',
      '/api/wallet - Wallet operations',
      '/api/payment - Payment operations (Razorpay)',
      '/api/leaderboard - Leaderboard',
      '/api/market - Market data',
      '/api/feedback - Feedback submission',
      '/api/admin - Admin portal routes'
    ]
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);

if (isDatabaseAvailable()) {
  console.log('PostgreSQL wallet routes enabled (DATABASE_URL configured and connection available)');
  app.use('/api/wallet', walletNewRoutes);
}
app.use('/api/wallet', walletRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/test', testEmailRoutes);
app.use('/api/test', testRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

export default app;

