# WealthNest Deployment Guide

## ✅ What's Done

1. ✅ Project pushed to GitHub: https://github.com/krutii03/WealthNest.git
2. ✅ Netlify configuration created (`netlify.toml`)
3. ✅ Frontend build tested and working

## 🚀 Deploy to Netlify (Free)

### Option 1: Via Netlify Website (Easiest)

1. Go to https://app.netlify.com
2. Sign in with GitHub (free account)
3. Click **"Add new site"** → **"Import an existing project"**
4. Select **GitHub** and authorize Netlify
5. Choose repository: **`krutii03/WealthNest`**
6. Configure build settings:
   - **Base directory:** `frontend/wealthnest-frontend`
   - **Build command:** `npm install && npm run build`
   - **Publish directory:** `frontend/wealthnest-frontend/dist`
7. Click **"Deploy site"**
8. Wait 2-3 minutes for deployment
9. Your site will be live at: `https://your-site-name.netlify.app`

### Option 2: Via Netlify CLI

```bash
# Install Netlify CLI (if not installed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
cd /Users/xyz/Desktop/WealthNest
netlify deploy --prod --dir=frontend/wealthnest-frontend/dist
```

## 📝 Environment Variables

If your app needs environment variables (like Supabase keys), add them in Netlify:
1. Go to Site settings → Environment variables
2. Add your variables (e.g., `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)

## 🔗 Your Live Site

Once deployed, you'll get a URL like:
- `https://wealthnest-xyz123.netlify.app`

You can also set a custom domain in Netlify settings.

## 📦 Project Structure

- **Frontend:** `frontend/wealthnest-frontend/` (React + Vite)
- **Backend:** `backend/WealthNestBackend/` (Node.js/TypeScript)
- **API:** `WealthNest.Api/` (.NET)

Note: Only the frontend is deployed to Netlify. Backend needs separate hosting (Railway, Render, etc.)

