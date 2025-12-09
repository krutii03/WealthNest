import dotenv from 'dotenv';
dotenv.config();

import { app } from './app';
import { startPriceScheduler } from './services/priceSimulator';

const PORT = process.env.PORT || 3001; // Default to 3001 to match existing setup

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Start the price update scheduler (updates prices every 2 hours)
    startPriceScheduler();
  });
}

export default app;
