# Becoming Borders

An interactive narrative web piece exploring digital borders through migrant consciousness.

## PRD

The full PRD is at `tasks/prd-migrant-consciousness.md`. All implementation work should follow it.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (gallery storage)
- HTML Canvas (drawing engine)
- Deployed to Vercel

## Aesthetic

Curl-inspired minimalism:
- **Font:** EB Garamond (400, 500, 600 + italic) from Google Fonts
- **Colors:** Pure black (#000) and white (#fff) with gray hierarchy via rgba(0,0,0,x)
- **Borders:** 1px solid black, no border-radius on rectangles, 50% on circles
- **Shadows:** Subtle — rgba(0,0,0,0.08) to rgba(0,0,0,0.15)
- **Spacing:** Generous whitespace, line-height 1.6-2.0
- **Animation:** Subtle, 0.3-0.5s ease transitions, playful micro-interactions
- **Letter-spacing:** 0.02em-0.15em for labels and small text

## Skills

Use the `ui-ux-pro-max` skill for all UI/UX decisions. Run the design system generator before building components:

```bash
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "interactive art editorial narrative minimal" --design-system -p "Becoming Borders"
```

Follow the skill's pre-delivery checklist before marking any UI story as complete.

## Quality Gates

Every story must pass:
- `next build`
- `next lint`
- Visual verification at 1440px and 375px viewports
