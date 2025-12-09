# 🚀 Quick Start: Deploy Backend to Railway (5 Minutes)

## Step-by-Step Instructions

### 1. Sign Up for Railway
- Go to https://railway.app
- Click "Start a New Project"
- Sign up with your GitHub account

### 2. Create New Project
- Click "New Project"
- Select "Deploy from GitHub repo"
- Authorize Railway to access your GitHub
- Select repository: **krutii03/WealthNest**

### 3. Configure the Service
Railway will auto-detect Node.js, but verify:
- **Root Directory:** `backend/WealthNestBackend`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`

If not auto-detected:
- Click on the service → Settings → Root Directory → Set to `backend/WealthNestBackend`

### 4. Set Environment Variables
Go to your service → **Variables** tab → Add these:

#### Required:
```
NODE_ENV=production
SUPABASE_URL=https://spnttuopczrpmrdjwwbt.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwbnR0dW9wY3pycG1yZGp3d2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTk3MjMsImV4cCI6MjA3Mzk3NTcyM30.rrwkTozEsqoNKMyM-8inkgZL8rN7XAeENYln0Cy01CY
SUPABASE_SERVICE_ROLE_KEY=<get from Supabase dashboard>
```

#### Optional (for full functionality):
```
RAZORPAY_KEY_ID=<your_razorpay_key>
RAZORPAY_KEY_SECRET=<your_razorpay_secret>
FINNHUB_API_KEY=<optional_for_news>
```

**To get SUPABASE_SERVICE_ROLE_KEY:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy "service_role" key (keep it secret!)

### 5. Deploy
- Railway will automatically deploy when you push to GitHub
- Or click "Deploy" in the Railway dashboard
- Wait 2-3 minutes for build and deployment

### 6. Get Your Backend URL
- Once deployed, Railway will show a URL like: `https://wealthnest-production.up.railway.app`
- Copy this URL

### 7. Update Frontend (Netlify)
1. Go to https://app.netlify.com/projects/wealthnestt/overview
2. Site settings → Environment variables
3. Add/Update: `VITE_API_URL=https://your-railway-url.railway.app`
4. Redeploy your frontend (or wait for auto-deploy)

### 8. Test
- Visit: `https://your-railway-url.railway.app/api/health`
- Should see: `{"status":"ok","message":"WealthNest API is running"}`

## ✅ Done!

Your backend is now live! Test your frontend to verify API calls work.

---

## 🔄 Alternative: Deploy to Render

If Railway doesn't work, try Render:

1. Go to https://render.com
2. Sign up with GitHub
3. New → Web Service
4. Connect repo: `krutii03/WealthNest`
5. Settings:
   - **Root Directory:** `backend/WealthNestBackend`
   - **Build:** `npm install && npm run build`
   - **Start:** `npm start`
6. Add environment variables (same as Railway)
7. Deploy!

---

## ❓ Need Help?

Check the full deployment guide: `backend/WealthNestBackend/DEPLOYMENT.md`

