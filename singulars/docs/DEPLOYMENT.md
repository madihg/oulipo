# Singulars Deployment Guide

This document explains how singulars deploys and how to fix deployment misalignment.

## Why Deploys Were Failing

The singulars Vercel project was created via `vercel` CLI from within the `singulars/` folder. That setup deploys **local files** when you run `vercel --prod` manually, but it does **not** automatically connect to the oulipo Git repo for push-triggered deploys.

**Result:** Pushing to `main` did not trigger a deploy. Changes only went live when someone ran `vercel --prod` from `singulars/` locally.

## Two Ways to Fix This

### Option A: Vercel Git Integration (Recommended)

Connect the singulars Vercel project to the oulipo repo so pushes auto-deploy:

1. Go to [Vercel Dashboard](https://vercel.com) → **singulars** project → **Settings** → **Git**
2. If not connected: **Connect Git Repository** → select `madihg/oulipo`
3. Set **Root Directory** to `singulars` (critical for monorepo)
4. Set **Production Branch** to `main`
5. Save

After this, every push to `main` that touches `singulars/**` will trigger an automatic deploy.

### Option B: GitHub Actions (Fallback)

A GitHub Action (`.github/workflows/deploy-singulars.yml`) deploys singulars when `singulars/**` changes on `main`. This works even if Vercel Git integration is broken.

**Setup (one-time):**

1. **Vercel token:** [Account Settings → Tokens](https://vercel.com/account/tokens) → Create Token
2. **GitHub secrets:** Repo → Settings → Secrets and variables → Actions → New repository secret:
   - `VERCEL_TOKEN` — your Vercel API token
   - `VERCEL_ORG_ID` — `team_9h3UVrcMfPTPWYdvGpnKezrd`
   - `VERCEL_PROJECT_ID` — `prj_wAF6Dx0ddTLn2WhNlIMAWapI0cp3`

The IDs are in `singulars/.vercel/project.json` (that folder is gitignored; values are documented here).

## Verification Checklist

Run this after any deployment setup change:

- [ ] Push a small change to `singulars/` on `main`
- [ ] Check [Vercel Deployments](https://vercel.com/halims-projects/singulars/deployments) — new deployment appears within ~2 min
- [ ] Visit [oulipo.xyz/singulars](https://oulipo.xyz/singulars) — changes are live
- [ ] Hard refresh (Cmd+Shift+R) if you see old content

## Manual Deploy (Emergency)

If both options fail, deploy from your machine:

```bash
cd singulars
vercel --prod
```

## Project Reference

| Item | Value |
|------|-------|
| Vercel project | singulars |
| Production URL | https://singulars.vercel.app/singulars |
| Rewrite URL | https://oulipo.xyz/singulars |
| Git repo | https://github.com/madihg/oulipo |
| Root directory | singulars |
