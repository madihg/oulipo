# Events → Supabase Migration

## Overview

Events data has been migrated from hardcoded JSON (`events.json`) to a Supabase PostgreSQL database. This enables a single source of truth that powers both the Upcoming page and the CV page, and can be written to by external agents or dashboards.

## Schema

### Enum: `event_kind`

Values: `performance`, `workshop`, `keynote`, `panel`, `residency`, `professional_experience`, `education`

### Table: `events`

| Column         | Type          | Constraints                               |
| -------------- | ------------- | ----------------------------------------- |
| `id`           | `uuid`        | PK, default `gen_random_uuid()`           |
| `title`        | `text`        | NOT NULL                                  |
| `org`          | `text`        | NOT NULL                                  |
| `description`  | `text`        | —                                         |
| `kind`         | `event_kind`  | nullable                                  |
| `location`     | `text`        | —                                         |
| `link`         | `text`        | —                                         |
| `date`         | `date`        | NOT NULL                                  |
| `date_end`     | `date`        | for multi-day events                      |
| `date_display` | `text`        | NOT NULL, pre-computed (e.g. "Nov 18–20") |
| `created_at`   | `timestamptz` | default `now()`                           |
| `updated_at`   | `timestamptz` | auto-updated via trigger                  |

### Indexes

- `idx_events_date` on `date`

## Environment Variables

| Variable                      | Purpose                                               |
| ----------------------------- | ----------------------------------------------------- |
| `OULIPO_SUPABASE_URL`         | Supabase project URL (e.g. `https://xxx.supabase.co`) |
| `OULIPO_SUPABASE_ANON_KEY`    | Public anon key — safe for browser, read-only via RLS |
| `OULIPO_SUPABASE_SERVICE_KEY` | Service role key — bypasses RLS, use only server-side |

## Setup Guide

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Run the schema SQL** — copy contents of `scripts/events-schema.sql` into the Supabase SQL Editor and execute
3. **Set environment variables** — copy `.env.local.example` to `.env.local` and fill in your project URL, anon key, and service role key
4. **Seed the data** — run `node scripts/seed-events.mjs` to populate the table from `events.json`
5. **Update HTML placeholders** — in `upcoming/index.html` and `cv/index.html`, replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` with your actual values

## Row Level Security (RLS)

RLS is enabled on the `events` table with the following policies:

| Policy              | Role            | Permissions                    |
| ------------------- | --------------- | ------------------------------ |
| `anon_read`         | `anon`          | SELECT only                    |
| `authenticated_all` | `authenticated` | SELECT, INSERT, UPDATE, DELETE |
| Service role key    | —               | Bypasses RLS entirely          |

The **anon key** is safe to embed in browser-side JavaScript — it can only read events. The **service role key** should never be exposed in client code.

## CRUD Examples

### Insert a new event (SQL)

```sql
INSERT INTO events (title, org, description, kind, location, link, date, date_display)
VALUES (
  'My Performance',
  'Gallery Name',
  'A description of the event',
  'performance',
  'NYC',
  'https://example.com',
  '2026-05-15',
  'May 15'
);
```

### Insert a new event (JavaScript — service role)

```javascript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const { data, error } = await supabase
  .from("events")
  .insert({
    title: "My Performance",
    org: "Gallery Name",
    description: "A description of the event",
    kind: "performance",
    location: "NYC",
    link: "https://example.com",
    date: "2026-05-15",
    date_display: "May 15",
  })
  .select();
```

### Update an event

```javascript
const { data, error } = await supabase
  .from("events")
  .update({ location: "Brooklyn", link: "https://newlink.com" })
  .eq("id", "event-uuid-here")
  .select();
```

### Delete an event

```javascript
const { error } = await supabase
  .from("events")
  .delete()
  .eq("id", "event-uuid-here");
```

### Query upcoming events (with 7-day buffer)

```javascript
const { data, error } = await supabase
  .from("events")
  .select("*")
  .order("date", { ascending: true });

const now = new Date();
const bufferMs = 7 * 24 * 60 * 60 * 1000;

const upcoming = data.filter((e) => {
  const eventDate = new Date(e.date_end || e.date);
  return eventDate.getTime() + bufferMs >= now.getTime();
});
```

### Query all events grouped by year (CV page)

```javascript
const { data, error } = await supabase
  .from("events")
  .select("*")
  .order("date", { ascending: false });

const grouped = {};
data.forEach((e) => {
  const year = new Date(e.date).getFullYear();
  if (!grouped[year]) grouped[year] = [];
  grouped[year].push(e);
});
```

## Field Mapping (events.json → Supabase)

| events.json   | Supabase column | Notes                                 |
| ------------- | --------------- | ------------------------------------- |
| `title`       | `title`         | —                                     |
| `org`         | `org`           | —                                     |
| `description` | `description`   | —                                     |
| `type`        | `kind`          | Lowercase enum, empty string → `null` |
| `location`    | `location`      | Empty string → `null`                 |
| `link`        | `link`          | Empty string → `null`                 |
| `date`        | `date`          | —                                     |
| `dateEnd`     | `date_end`      | —                                     |
| `dateDisplay` | `date_display`  | —                                     |

## Query Patterns

### Upcoming Page

- Fetches all events ordered by `date` ascending
- Client-side filters to only show events where `date_end` (or `date`) + 7 days >= now
- Displays: org → title, description, kind (capitalized), location, date_display, link

### CV Page

- Fetches all events ordered by `date` descending
- Groups by year client-side
- Displays: org → title, description, then meta line with kind · location · date_display
