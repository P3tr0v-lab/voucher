# Hotspot Voucher Manager

A production-ready MVP for managing TP-Link hotspot voucher sales across multiple sites.

## Stack
- **Next.js 15** App Router + TypeScript
- **Tailwind CSS** + custom dark theme
- **Recharts** for analytics
- **Supabase** Auth + Database (free tier)
- **Vercel** deployment

## Setup

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase/schema.sql`
3. Go to **Authentication > Settings** and enable Email auth
4. Copy your **Project URL** and **anon key**

### 2. Environment Variables
```bash
cp .env.example .env.local
```
Fill in:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### 3. Run locally
```bash
npm install
npm run dev
```

### 4. Create your account
Go to your Supabase project → **Authentication → Users → Invite user** (or use the signup flow).

### 5. Deploy to Vercel
```bash
npx vercel --prod
```
Set the two env vars in Vercel dashboard under **Settings → Environment Variables**.

## Features
- 🔐 Secure auth with protected routes
- 🏢 Multi-site management
- 📦 Voucher batch tracking (FIFO inventory deduction)
- 📊 Daily sales entry with auto revenue calculation
- 📈 Analytics with Recharts (revenue, usage, site comparison)
- 📋 Daily & monthly reports with CSV/Excel export
- 💰 Expense tracker + net profit calculator
- 💾 JSON backup & restore
- ⚠️ Low stock alerts

## Voucher Types
| Type | Duration | Price |
|------|----------|-------|
| 500 TSH | 6 Hours | 500 TSH |
| 1000 TSH | 24 Hours | 1000 TSH |
