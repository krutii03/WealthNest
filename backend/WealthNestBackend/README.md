# WealthNest Backend

Backend API server for WealthNest application.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account (for database)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:**
   Copy `.env.example` to `.env` and fill in your configuration:
   ```bash
   cp .env.example .env
   ```
   
   Or manually create `.env` with:
   ```
   PORT=3001
   NODE_ENV=development
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

## Running the Server

### Development Mode
```bash
npm run dev
```
This will start the server using `ts-node` on port 3001 (or the port specified in `.env`).

The server will be available at: `http://localhost:3001`

### Production Mode

1. **Build the TypeScript code:**
   ```bash
   npm run build
   ```

2. **Start the compiled server:**
   ```bash
   npm start
   ```

## API Endpoints

- `GET /api/health` - Health check endpoint
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `GET /api/auth/me` - Get current user (requires auth)
- `POST /api/auth/signout` - Sign out
- `GET /api/portfolio` - Get user portfolio (requires auth)
- `POST /api/portfolio/add` - Add to portfolio (requires auth)
- `GET /api/assets` - Get all assets
- `GET /api/wallet/balance` - Get wallet balance (requires auth)

## Environment Variables

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon/public key

