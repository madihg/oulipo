---
name: autoforge
description: "Deployment and build automation. Always push when building. Verify branch (main) before push. Deploy to production after changes. Use for: build, deploy, push, release, ship. Monorepo: check Vercel Git integration, root directory, GitHub Actions fallback."
---

# Autoforge — Build, Push, Deploy

Automation workflow for shipping code. Ensures builds are pushed and deployed correctly across projects.

## When to Use

- After building or making changes the user wants live
- When the user says "push", "deploy", "ship", or "build and push"
- When debugging "changes not showing" on a live site

## Core Rules

1. **Always push when you build** — If you run a build and it succeeds, commit and push the changes.
2. **Verify branch before push** — Confirm you're on `main` (or the production branch) and pushing to the correct remote. Run `git branch -vv` and `git remote -v` before pushing.
3. **Deploy after push** — For Vercel projects: either rely on Git-triggered deploys or run `vercel --prod` from the project directory if Git integration is misconfigured.

## Monorepo Deployment

For repos with multiple Vercel projects (e.g. singulars, becoming-borders):

1. **Vercel Git** — Each project must have Root Directory set to its subfolder. Check: Vercel Dashboard → Project → Settings → Git.
2. **GitHub Actions** — Use workflows as fallback when Git integration fails. Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` as repo secrets.
3. **Manual deploy** — `cd <subfolder> && vercel --prod` when needed.

## Verification

After push:
- Check Vercel Deployments for new deploy
- Visit live URL and hard refresh (Cmd+Shift+R) if cached
