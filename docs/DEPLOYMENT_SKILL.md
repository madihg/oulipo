# Deployment Skill — Monorepo Alignment Checklist

Use this when debugging "changes not showing" or deployment misalignment in the oulipo monorepo.

## Root Cause (Common)

Vercel projects created via CLI from a subfolder (e.g. `singulars/`) deploy **local files** on `vercel --prod` but are **not** connected to Git. Pushes to the repo do not trigger deploys.

## Per-Project Fix

### 1. Vercel Dashboard (Preferred)

For each subfolder project (singulars, becoming-borders):

1. Vercel Dashboard → Project → **Settings** → **Git**
2. **Connect** to `madihg/oulipo` if not connected
3. **Root Directory:** set to the subfolder (e.g. `singulars`, `becoming-borders`)
4. **Production Branch:** `main`

### 2. GitHub Actions (Fallback)

Workflows in `.github/workflows/` deploy on push when their paths change:

- `deploy-singulars.yml` — deploys when `singulars/**` changes

**Required secrets:** `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`  
(Get IDs from the project's `.vercel/project.json`)

### 3. Manual Deploy (Emergency)

```bash
cd singulars   # or becoming-borders
vercel --prod
```

## Verification

1. Push a trivial change to the subfolder
2. Check Vercel Deployments — new deploy within ~2 min
3. Visit live URL — hard refresh (Cmd+Shift+R) if cached

## Project IDs (for reference)

| Project | Org ID | Project ID |
|---------|--------|------------|
| singulars | team_9h3UVrcMfPTPWYdvGpnKezrd | prj_wAF6Dx0ddTLn2WhNlIMAWapI0cp3 |
