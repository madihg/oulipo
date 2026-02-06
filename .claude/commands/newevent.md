---
description: Add a new event to the upcoming page and CV
allowed-tools: [Read, Write, Edit, Bash, Glob]
---

# /newevent — Add a New Event

You are managing events for Halim Madi's website (oulipo.xyz). When the user runs this command, follow these steps precisely:

## Step 1: Gather Event Details

Ask the user for the following (they may have already provided some or all in their message):

- **Organization** (e.g. "Mozilla AI Residency", "Gray Area Education")
- **Event title** (e.g. "Versus.exe", "Weirding AI")
- **Description** (one line, e.g. "Human vs Machine", "Fine-tuning for Artists and Poets")
- **Type** (e.g. Performance, Workshop, Keynote, Panel, Residency — can be empty)
- **Location** (e.g. "SF", "Berlin", "Tokyo" — can be empty)
- **Date** (start date, and optionally end date for multi-day events)
- **Link** (URL, can be empty)

## Step 2: Add to events.json

Read `/Users/halim/Documents/oulipo/events.json`, then:

1. Create a new event object following this exact format:
```json
{
  "org": "Organization Name",
  "title": "Event Title",
  "description": "One line description",
  "type": "Performance",
  "location": "City",
  "date": "YYYY-MM-DD",
  "dateEnd": "YYYY-MM-DD",
  "dateDisplay": "Mon DD",
  "link": "https://..."
}
```

- `date` is always ISO format `YYYY-MM-DD`
- `dateEnd` is only included if the event spans multiple days
- `dateDisplay` is the human-readable date shown on the page. Format examples:
  - Single day: `"Nov 11"`, `"Mar 4"`
  - Multi-day with en-dash: `"Nov 18–20"` (use – character)
  - Multi-day with caret: `"Nov 20›24"` (use › if original used that style)
- `link` is empty string `""` if no link provided
- `type` is empty string `""` if not applicable

2. Insert the event in chronological order (sorted by `date` field)
3. Write the updated JSON back to `events.json`

## Step 3: Update the inline EVENTS array in upcoming/index.html

The upcoming page does NOT fetch events.json — events are embedded inline in the HTML for file:// compatibility.

1. Read `/Users/halim/Documents/oulipo/upcoming/index.html`
2. Find the line that starts with `const EVENTS = [`
3. Replace the entire EVENTS array with the updated contents from `events.json`, serialized as a single-line JSON array
4. Use `\u2192` for →, `\u2197` for ↗, `\u2013` for –, `\u203a` for ›, `\u2318` for ⌘ in the JSON string

## Step 4: Update the inline EVENTS array in cv/index.html

The CV page also embeds events inline.

1. Read `/Users/halim/Documents/oulipo/cv/index.html`
2. Find the line that starts with `const EVENTS = [`
3. Replace the entire EVENTS array with the same updated contents from `events.json`

## Step 5: Confirm

Tell the user what was added, showing the formatted event entry:
```
Added: **Org → Title**
Description
Type. Location, DateDisplay. Link↗
```

## Important Notes

- The `events.json` file lives at `/Users/halim/Documents/oulipo/events.json` — this is the source of truth
- After updating events.json, you MUST also update the inline `const EVENTS = [...]` in both:
  - `/Users/halim/Documents/oulipo/upcoming/index.html`
  - `/Users/halim/Documents/oulipo/cv/index.html`
- The upcoming page JS filters to only show events whose date (+ 7 day buffer) is in the future
- The CV page shows ALL events, grouped by year, newest first
- Never remove events from events.json — they are permanent CV records
- The upcoming page's client-side JS handles filtering out past events automatically
