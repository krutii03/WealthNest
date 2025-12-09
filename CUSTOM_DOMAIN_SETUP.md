# 🌐 Change Domain Name on Netlify

Yes! You can change your Netlify domain name in two ways:

## Option 1: Change Netlify Subdomain (Free & Easy)

Change from `wealthnest-xyz123.netlify.app` to something like `wealthnest.netlify.app`

### Steps:
1. Go to https://app.netlify.com
2. Select your **WealthNest** site
3. Go to **Site settings** → **General** → **Site details**
4. Click **Change site name**
5. Enter your desired name (e.g., `wealthnest`, `wealthnest-app`, `my-wealthnest`)
6. Click **Save**
7. Your new URL will be: `https://your-chosen-name.netlify.app`

**Note:** The name must be:
- 3-63 characters
- Only lowercase letters, numbers, and hyphens
- Must start and end with a letter or number

## Option 2: Add Custom Domain (Your Own Domain)

Use your own domain like `wealthnest.com` or `wealthnest.app`

### Steps:

#### Step 1: Buy a Domain (if you don't have one)
- Go to domain registrars like:
  - Namecheap (https://www.namecheap.com)
  - Google Domains (https://domains.google)
  - GoDaddy (https://www.godaddy.com)
  - Cloudflare (https://www.cloudflare.com/products/registrar)

#### Step 2: Add Domain in Netlify
1. Go to https://app.netlify.com
2. Select your **WealthNest** site
3. Go to **Site settings** → **Domain management**
4. Click **Add custom domain**
5. Enter your domain (e.g., `wealthnest.com`)
6. Click **Verify**

#### Step 3: Configure DNS
Netlify will show you DNS records to add. You need to:

**If using Netlify DNS (Recommended):**
1. In Netlify, go to **Domain settings** → **DNS**
2. Add the DNS records Netlify provides
3. Update your domain registrar's nameservers to point to Netlify:
   - `dns1.p01.nsone.net`
   - `dns2.p01.nsone.net`
   - `dns3.p01.nsone.net`
   - `dns4.p01.nsone.net`

**If using your registrar's DNS:**
1. Go to your domain registrar's DNS settings
2. Add an **A record** pointing to Netlify's IP (Netlify will show you the IP)
3. Or add a **CNAME record** pointing to `your-site-name.netlify.app`

#### Step 4: Wait for DNS Propagation
- Usually takes 24-48 hours (can be faster)
- Netlify will show "DNS configuration detected" when ready

#### Step 5: Enable HTTPS (Automatic)
- Netlify automatically provisions SSL certificates via Let's Encrypt
- Your site will be available at `https://wealthnest.com` (secure)

## 🎯 Quick Summary

| Option | Cost | Setup Time | URL Example |
|--------|------|------------|-------------|
| **Change Subdomain** | Free | Instant | `wealthnest.netlify.app` |
| **Custom Domain** | Domain cost (~$10-15/year) | 24-48 hours | `wealthnest.com` |

## 💡 Recommendation

1. **Start with Option 1** - Change the subdomain to something cleaner like `wealthnest.netlify.app`
2. **Later, add Option 2** - If you want a professional domain, buy one and add it

Both options work great! The subdomain change is instant and free.

