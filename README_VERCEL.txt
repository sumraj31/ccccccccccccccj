ANMOL KALA — PRODUCTION DEPLOYMENT GUIDE

This repository contains the complete Anmol Kala storefront, native media assets, authenticated REST API, and admin portal. All 174 handcrafted products, categories, descriptions, images, and brand assets are fully preserved locally.

FEATURES & HIGHLIGHTS
- SPA routing with buildCommand ("npm run build"), outputDirectory ("dist"), and standard catch-all rewrite to index.html.
- Storefront and Admin Dashboard display all 174 preserved handcrafted products and categories.
- Dashboard KPI counters show authoritative aggregate counts.
- Dedicated Photos and Videos sections.
- Mandatory product photo enforcement for video products.
- Direct category URLs and nested category page refreshes resolve properly.
- Admin authentication is verified on the backend via HMAC-signed session tokens.

DEPLOY TO VERCEL
1. Push this repository to your GitHub repository root.
2. In Vercel, import the repository.
   - Framework Preset: Vite (or Other)
   - Build Command: npm run build (preset configured in vercel.json)
   - Output Directory: dist (preset configured in vercel.json)
3. In Vercel Project > Settings > Environment Variables, configure:
   - DATABASE_URL = your PostgreSQL connection string (Supabase, Neon, etc.) [Optional: auto-connects in real time]
   - ADMIN_USERNAME = anmolkala.in@gmail.com
   - ADMIN_PASSWORD = your secure admin password
   - SESSION_SECRET = a secure random string (32+ characters) for signing session tokens
4. Trigger a deploy in Vercel.
5. Open the live site, scroll to the bottom of the footer, tap the discreet "A" icon, and sign in with your admin credentials.
