# WealthNest Frontend (Vite + React + TypeScript)

A production-aware scaffold for the WealthNest fintech app with Supabase Auth, routing, pages, utilities, charts, realtime updates, and calculators.

## Prerequisites
- Node.js LTS
- A Supabase project with Auth and the database tables from your PDF

## Setup
```
cd frontend/wealthnest-frontend
npm install
cp .env.example .env
# Edit .env and set VITE_SUPABASE_URL and VITE_SUPABASE_KEY (anon/public key)
```

## Run
```
npm run dev
```
Open http://localhost:5173

## How it’s organized
- `src/lib/supabaseClient.ts` – Supabase client using VITE env vars (anon key only).
- `src/App.tsx` – Router with protected routes using Supabase session.
- `src/pages/*` – Pages: Login, Signup, Dashboard, Assets, Portfolio, Wallet, Transactions, Calculators, Leaderboard, Support.
- `src/components/*` – Reusable UI components (cards, tables, calculators, charts, CSV export, modal, etc.).
- `src/utils/*` – Currency formatting, calculators (pure functions), CSV helpers.
- `src/types/index.ts` – Typed domain entities for the app.
- `src/styles/styles.css` – Minimalist Groww-like layout and components.

## Environment Variables (.env)
```
VITE_SUPABASE_URL= https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_KEY= YOUR_SUPABASE_ANON_PUBLIC_KEY
```
Note: Never put `service_role` keys in the frontend.

## Test Scenario (happy path)
1. Signup
   - Go to /signup, create an account (email/password). Confirm email if required.
2. Login
   - Sign in via /login.
3. Add Money (simulate)
   - Go to Wallet page, set an amount and click "Add Money (simulate)".
4. Buy Asset (simulate)
   - Go to Assets, click Buy on an asset. Confirm in the modal.
   - This creates a Transaction (completed), reduces Wallet balance, and should reflect in Portfolio holdings.
5. View Portfolio
   - Check total value and rows.
6. Transactions
   - Filter and export CSV.
7. Calculators
   - Use SIP / Lumpsum / Goal calculators, export SIP schedule CSV.

## Realtime
- The Assets page subscribes to `public.Assets` UPDATE events and applies live price updates to the list.

## Charts
- Recharts is used to show:
  - Portfolio value trend (synthetic 30d for now)
  - Calculators can be extended with charts.

## Security & Production Notes
- THIS IS A SIMULATION for money flows and buy flow:
  - For production, implement a backend (.NET or serverless) that:
    - uses `service_role` key securely on the server only,
    - performs double-entry ledger updates in `Client_Fund_Ledger` and `System_Financials`,
    - records OTP in `OTP_Log` and verifies OTP server-side for sensitive ops (buy/withdraw),
    - marks transactions completed only after payment/OTP validation.
- RLS: Ensure Row Level Security policies allow `auth.uid()` to read/write their own rows in `Users`, `Wallets`, `Portfolios`, `Portfolio_Holdings`, `Transactions`, etc.

## CSV Export
- Portfolio and Transactions pages use a browser Blob to download CSV files.

## OAuth
- Login page has placeholder buttons for Google/LinkedIn/Microsoft via `supabase.auth.signInWithOAuth`.
- Configure providers in the Supabase dashboard and set Site URL and Redirect URLs (e.g., http://localhost:5173).

## Next Steps
- Replace simulated wallet and buy flows with secure backend endpoints.
- Add admin placeholder pages with protected routes (RBAC) and dashboards for audit/compliance.
- Hook a price API and/or a historical prices table for accurate portfolio charts.
- Add tests (vitest) for `utils/calculators.ts` (pure functions are already documented and deterministic).
