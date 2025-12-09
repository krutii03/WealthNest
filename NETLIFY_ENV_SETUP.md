# 🔧 Fix: VITE_SUPABASE_URL is required

## Problem
Your WealthNest app needs Supabase environment variables to work. These are missing in your Netlify deployment.

## ✅ Solution: Add Environment Variables in Netlify

### Step 1: Get Your Supabase Credentials

1. Go to https://app.supabase.com
2. Select your project (or create one if you don't have it)
3. Go to **Settings** → **API**
4. Copy these values:
   - **Project URL** (this is your `VITE_SUPABASE_URL`)
   - **anon/public key** (this is your `VITE_SUPABASE_KEY`)

### Step 2: Add Variables in Netlify

1. Go to https://app.netlify.com
2. Select your **WealthNest** site
3. Go to **Site settings** → **Environment variables**
4. Click **Add a variable**
5. Add these **TWO REQUIRED** variables:

   **Variable 1:**
   - Key: `VITE_SUPABASE_URL`
   - Value: `https://your-project-id.supabase.co` (your Supabase project URL)
   - Scope: All scopes

   **Variable 2:**
   - Key: `VITE_SUPABASE_KEY`
   - Value: `your-anon-key-here` (your Supabase anon/public key)
   - Scope: All scopes

6. Click **Save**

### Step 3: Redeploy

After adding the variables:
1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Deploy site**
3. Wait 2-3 minutes for the new deployment

### Optional Variables (if you use them)

If your app uses a backend API or external services, you can also add:

- `VITE_API_URL` - Your backend API URL (if deployed separately)
- `VITE_ALPHA_VANTAGE_KEY` - Alpha Vantage API key (if using stock data)
- `VITE_TWELVEDATA_KEY` - Twelve Data API key (if using market data)

## 🎯 Quick Checklist

- [ ] Got Supabase Project URL
- [ ] Got Supabase anon key
- [ ] Added `VITE_SUPABASE_URL` in Netlify
- [ ] Added `VITE_SUPABASE_KEY` in Netlify
- [ ] Triggered new deployment
- [ ] Site is working! ✅

## 📝 Example Values

Your environment variables should look like this in Netlify:

```
VITE_SUPABASE_URL = https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MjU2NzI5MCwiZXhwIjoxOTU4MTQzMjkwfQ.example
```

**Note:** Never commit your actual `.env` file with real keys to GitHub! Only use `.env.example` as a template.

