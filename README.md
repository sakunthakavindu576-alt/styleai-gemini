# StyleAI — Powered by Google Gemini (FREE)

AI fashion advisor using Google Gemini 1.5 Flash — completely FREE tier!

---

## Free Tier Limits (Gemini 1.5 Flash)
- 1,500 requests/day FREE
- 1,000,000 tokens/minute
- No credit card needed!

---

## Deploy to Vercel — Step by Step

### Step 1 — Get FREE Gemini API Key
1. Go to https://aistudio.google.com
2. Sign in with Google account
3. Click "Get API Key" → "Create API Key"
4. Copy the key (starts with `AIza...`)

### Step 2 — Upload to GitHub
1. Go to https://github.com → New repository → name: `styleai`
2. Upload all files from this folder

### Step 3 — Deploy on Vercel
1. Go to https://vercel.com → Sign up with GitHub
2. Click "Add New Project" → Import your repo
3. Root Directory: `styleai` (if files are inside a folder)
4. Click "Deploy"

### Step 4 — Add API Key
1. Vercel Dashboard → Settings → Environment Variables
2. Add:
   - Name: `GEMINI_API_KEY`
   - Value: `AIzaSy...your key`
3. Save → Redeploy

### Done! Your app is live for FREE!

---

## Monetization
Update shop links in `public/js/app.js` with affiliate tracking IDs:
- ASOS: https://www.asos.com/affiliate-programme/
- Amazon: https://affiliate-program.amazon.com
- Zalando: https://www.zalando.co.uk/affiliate-programme/
