# WealthNest Backend Deployment Guide

This guide covers deploying the Node.js/Express backend to various platforms.

## Prerequisites

- Node.js backend code ready
- Supabase project configured
- Environment variables prepared

## 🚀 Option 1: Deploy to Railway (Recommended - Free Tier Available)

### Steps:

1. **Sign up for Railway:**
   - Go to https://railway.app
   - Sign up with GitHub (free account)

2. **Create a New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository: `krutii03/WealthNest`
   - Select the root directory

3. **Configure Service:**
   - Railway will auto-detect Node.js
   - Set **Root Directory** to: `backend/WealthNestBackend`
   - Build command: `npm install && npm run build`
   - Start command: `npm start`

4. **Set Environment Variables:**
   - Go to your service → Variables tab
   - Add these required variables:
     ```
     NODE_ENV=production
     PORT=3001 (or let Railway auto-assign)
     SUPABASE_URL=your_supabase_url
     SUPABASE_ANON_KEY=your_anon_key
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
     ```
   - Optional variables:
     ```
     RAZORPAY_KEY_ID=your_razorpay_key_id
     RAZORPAY_KEY_SECRET=your_razorpay_secret
     FINNHUB_API_KEY=your_finnhub_key
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=587
     SMTP_USER=your_email
     SMTP_PASS=your_password
     ```

5. **Deploy:**
   - Railway will automatically deploy on git push
   - Check the Deployments tab for status
   - Once deployed, you'll get a URL like: `https://your-app.railway.app`

6. **Get Your Backend URL:**
   - Copy the generated Railway URL
   - Update Netlify environment variable:
     - Go to Netlify → Site settings → Environment variables
     - Add: `VITE_API_URL=https://your-app.railway.app`

---

## 🚀 Option 2: Deploy to Render (Free Tier Available)

### Steps:

1. **Sign up for Render:**
   - Go to https://render.com
   - Sign up with GitHub

2. **Create a Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Choose repository: `krutii03/WealthNest`

3. **Configure Service:**
   - **Name:** `wealthnest-backend`
   - **Root Directory:** `backend/WealthNestBackend`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free (or paid for better performance)

4. **Set Environment Variables:**
   - Scroll to "Environment Variables" section
   - Add all required variables (same as Railway)

5. **Deploy:**
   - Click "Create Web Service"
   - Render will deploy automatically
   - Get your URL: `https://wealthnest-backend.onrender.com`

6. **Update Frontend:**
   - Add `VITE_API_URL` in Netlify with your Render URL

---

## 🚀 Option 3: Deploy to Heroku (Paid/Free Tier Limited)

### Steps:

1. **Install Heroku CLI:**
   ```bash
   brew install heroku/brew/heroku  # macOS
   # or visit https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Login to Heroku:**
   ```bash
   heroku login
   ```

3. **Create Heroku App:**
   ```bash
   cd backend/WealthNestBackend
   heroku create wealthnest-backend
   ```

4. **Set Environment Variables:**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set SUPABASE_URL=your_url
   heroku config:set SUPABASE_ANON_KEY=your_key
   heroku config:set SUPABASE_SERVICE_ROLE_KEY=your_key
   # ... add all other env vars
   ```

5. **Deploy:**
   ```bash
   git subtree push --prefix backend/WealthNestBackend heroku main
   ```
   Or use Heroku GitHub integration for auto-deploy.

---

## 📝 Required Environment Variables

### Required:
- `NODE_ENV` - Set to `production`
- `PORT` - Server port (usually auto-assigned)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

### Optional:
- `RAZORPAY_KEY_ID` - For payment processing
- `RAZORPAY_KEY_SECRET` - For payment processing
- `RAZORPAY_WEBHOOK_SECRET` - For webhook verification
- `FINNHUB_API_KEY` - For market news
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - For email
- `DATABASE_URL` - Direct PostgreSQL connection (if not using Supabase)
- `FRONTEND_URL` - Your Netlify frontend URL for CORS

---

## ✅ After Deployment

1. **Test Your Backend:**
   - Visit: `https://your-backend-url.com/api/health`
   - Should return: `{"status":"ok","message":"WealthNest API is running"}`

2. **Update Frontend:**
   - Go to Netlify → Environment Variables
   - Set: `VITE_API_URL=https://your-backend-url.com`

3. **Verify CORS:**
   - Make sure your frontend URL is in the CORS allowed origins
   - Backend will accept requests from `*.netlify.app` domains

4. **Test Endpoints:**
   - Try `/api/assets` - Should return assets list
   - Try `/api/wallet/balance` (with auth) - Should return wallet

---

## 🔧 Troubleshooting

### Build Fails:
- Check that `npm run build` completes successfully locally
- Verify TypeScript compiles without errors
- Check Node.js version compatibility

### Runtime Errors:
- Check environment variables are set correctly
- Verify Supabase credentials are valid
- Check server logs for specific error messages

### CORS Issues:
- Add your frontend URL to `corsOptions.origin` in `app.ts`
- Or set `FRONTEND_URL` environment variable

### Database Connection Issues:
- Verify `SUPABASE_URL` and keys are correct
- Check Supabase project is active
- Verify RLS policies allow access

---

## 🎯 Recommended Setup

**Best for Free:**
- **Frontend:** Netlify (already deployed)
- **Backend:** Railway or Render (free tier)

**Production Ready:**
- **Frontend:** Netlify Pro or Vercel
- **Backend:** Railway Paid or AWS/Railway

---

## 📚 Additional Resources

- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs
- Heroku Docs: https://devcenter.heroku.com

