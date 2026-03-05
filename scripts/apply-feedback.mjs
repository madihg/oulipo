#!/usr/bin/env node

// Apply user feedback from DATA-GAPS-AND-QUESTIONS.md
// Deletes 4 cancelled events, updates 22 with new links,
// fixes 3 wrong links, corrects metadata where URLs reveal errors.
//
// Usage: node scripts/apply-feedback.mjs
//        node scripts/apply-feedback.mjs --dry-run

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.OULIPO_SUPABASE_URL,
  process.env.OULIPO_SUPABASE_SERVICE_KEY,
);
const db = supabase.schema("oulipo_dashboard").from("events");
const dryRun = process.argv.includes("--dry-run");

// ── DELETIONS (4 cancelled events) ──────────────────────────────────────────
const deletions = [
  { id: "911cd20b-c71c-4177-9668-82a79c928780", reason: "AWP panel cancelled" },
  {
    id: "97dbd68e-a51c-468c-b188-1d0ab76e1dc6",
    reason: "Tea ⌘ Tech Tokyo cancelled",
  },
  {
    id: "4eea5b3e-cdb4-4167-8b15-b186549ee3cb",
    reason: "AI Agent Workshop cancelled",
  },
  {
    id: "d92b70ae-1e1a-42a3-8c27-ab4bedcbaf6d",
    reason: "Missed Us Yet? removed",
  },
];

// ── UPDATES (link + metadata corrections) ───────────────────────────────────
const updates = [
  // #1 — Weirding Machines / Maryland Uni
  {
    id: "43159021-1906-49c5-9f5d-193d98d451e4",
    set: { link: "https://english.umd.edu/" },
    label: "Weirding Machines / Maryland",
  },

  // #2 — Becoming everyone / CultureHub LA (fix org: no space, match EDS entry)
  {
    id: "7abfa0a5-6a72-44a8-a257-f5850e0c79ca",
    set: {
      link: "https://www.culturehub.org/los-angeles",
      org: "CultureHub LA",
    },
    label: "Becoming everyone / CultureHub LA (fix org spacing)",
  },

  // #4 — Weirding Machines: UC Santa Cruz → Santa Clara University
  {
    id: "9916219c-5cda-49b9-9339-46d97900e13b",
    set: {
      org: "Santa Clara University",
      location: "Santa Clara",
      link: "https://www.scu.edu/engineering/",
    },
    label: "Weirding Machines → Santa Clara University (was UC Santa Cruz)",
  },

  // #5 — Seeding Secrets: Berlin Uni → Berlin International (berlin-international.de)
  {
    id: "0dfeb367-f64d-4ce8-9d21-5fcdca875e87",
    set: {
      org: "Berlin International",
      link: "https://www.berlin-international.de/en/magazine/blog/bi-talk-halim-madi/",
    },
    label: "Seeding Secrets → Berlin International (was Berlin Uni)",
  },

  // #7 — Becoming → The Strange Choir (rename, kind: performance → workshop)
  {
    id: "4cd89ea6-b466-4e25-ae36-39d503ca5bc4",
    set: {
      title: "The Strange Choir",
      kind: "workshop",
      link: "https://luma.com/8w7s7oa8",
      description: "Workshop as part of Mozilla AI Residency",
    },
    label: "Becoming → The Strange Choir (performance→workshop)",
  },

  // #8 — Weirding AI / Gray Area Education (online version)
  {
    id: "52efe29e-b2b4-41cf-9fb6-9a5e13298500",
    set: {
      link: "https://grayarea.org/course/weirding-ai-fine-tuning-for-poets-artists-online/",
    },
    label: "Weirding AI / Gray Area Education (online)",
  },

  // #9 — Versus.exe
  {
    id: "f81dec8e-77e4-4afd-b831-5e6011c3fad3",
    set: { link: "https://www.instagram.com/reel/DTrwbt4ifqI/" },
    label: "Versus.exe / Mozilla",
  },

  // #10 — Hard.exe: tiat.place as primary, other links in description
  {
    id: "cc1a404b-1a47-48ab-adde-c9d73de555f1",
    set: {
      link: "https://www.tiat.place/exhibitions/creative-futures-counterstructures",
      description:
        "Singulars Act IV, poetry meets ML. Also: instagram.com/reel/DTrwbt4ifqI, mozillafoundation.org/creative-futures-counterstructures",
    },
    label: "Hard.exe (tiat.place primary, others in desc)",
  },

  // #11 — Reinforcement.exe
  {
    id: "e612d98e-04b1-4295-8ffe-5917e20e3d75",
    set: { link: "https://infinitegarden.art/" },
    label: "Reinforcement.exe / Ethereum",
  },

  // #13 — Carnation.exe
  {
    id: "b1f2a596-d96d-443f-b9e4-666916710da9",
    set: { link: "https://www.instagram.com/p/DLBCaQUoOmx/" },
    label: "Carnation.exe / Yellow Cube",
  },

  // #14 — Talk / NWMP
  {
    id: "f4c78b70-8c6c-48c8-a075-cb5ac2da6c69",
    set: { link: "https://newmediawritingprize.co.uk/" },
    label: "Talk / NWMP",
  },

  // #15 — Applied Poetics / APE Korea
  {
    id: "8b384a11-367a-473a-aaa7-b3ffc8e27f35",
    set: { link: "https://www.instagram.com/p/DK0J60pssr0/" },
    label: "Applied Poetics / APE Korea",
  },

  // #17 — Talk / Stanford d.school
  {
    id: "6b078535-559e-4f7b-b7c6-b585dbd3f0a3",
    set: { link: "https://dschool.stanford.edu/" },
    label: "Talk / Stanford d.school",
  },

  // #18 — Talk / UC Berkeley
  {
    id: "af293401-8b59-4474-b6a9-f3684f9819ee",
    set: { link: "https://ies.berkeley.edu/spanish" },
    label: "Talk / UC Berkeley",
  },

  // #19 — Performance / Happy Endings Show
  {
    id: "6c0cd7d4-11d1-490d-bd6e-0b0adfc31b05",
    set: { link: "http://www.makeoutroom.com/events/previous/39" },
    label: "Performance / Happy Endings Show",
  },

  // #20 — Fun Hackathon / Kiron
  {
    id: "94735b3d-e63e-4394-b522-d0bdb3437dee",
    set: { link: "https://mistral.ai/news/memory" },
    label: "Fun Hackathon / Kiron",
  },

  // #21 — Product Lead / Mistral AI
  {
    id: "26ce83c0-c2c9-43f0-afd6-4fc3a2190fd2",
    set: { link: "https://mistral.ai/news/memory" },
    label: "Product Lead / Mistral AI",
  },

  // #22 — Masters / UofT
  {
    id: "80c4bc7e-515d-4a83-9b85-e4819be7fff8",
    set: { link: "https://learning.cs.toronto.edu/" },
    label: "Masters / University of Toronto",
  },

  // #23 — Liberal Arts / Sorbonne
  {
    id: "a6c35d99-04f8-42a9-83f1-6077a580094e",
    set: {
      link: "https://lettres.sorbonne-universite.fr/faculte-des-lettres/ufr/ufr-de-philosophie",
    },
    label: "Liberal Arts / Sorbonne",
  },

  // #24 — Reprises ou Re/crises? book
  {
    id: "03383967-fbc9-4434-afc8-3384864fb03f",
    set: {
      link: "https://www.amazon.com/Reprise-re-crise-Halim-Thomas-Porcher/dp/2358100080",
    },
    label: "Reprises ou Re/crises? / Respublica",
  },

  // #25 — Carlos Ghosn → Nissan NPO Learning Scholarship
  {
    id: "eed2ac0e-68d0-4b72-a301-09a469b6b959",
    set: {
      title: "NPO Learning Scholarship",
      org: "Nissan Foundation",
      link: "https://global.nissannews.com/en/releases/nissans-investment-in-the-future-society-nissan-npo-learning-scholarship-program",
    },
    label:
      "Carlos Ghosn Scholarship → NPO Learning Scholarship / Nissan Foundation",
  },

  // #26 + Wrong link #1 — Sleeping with Machines workshop
  {
    id: "d6a863fd-edff-48aa-92c8-03db72ed54ec",
    set: {
      link: "https://www.kickstarter.com/projects/theheeledpoet/in-the-name-of-scandal/creator",
    },
    label: "Sleeping with Machines / ITNS Kickstarter",
  },

  // Wrong link #2 — Deep & Fast book (Kickstarter → Amazon ebook)
  {
    id: "d9e560dc-655d-49c0-8dde-ef93db243735",
    set: {
      link: "https://www.amazon.com/Deep-Fast-remember-testament-connection-ebook/dp/B09955BL7L",
    },
    label: "Deep & Fast book → Amazon ebook",
  },

  // Wrong link #3 — In the Name of Scandal book (paperback → ebook)
  {
    id: "057fe2b4-286b-43af-87d0-323ecc7be6b0",
    set: {
      link: "https://www.amazon.com/Name-Scandal-collection-immigrant-queerness-ebook/dp/B087NZC75W",
    },
    label: "In the Name of Scandal book → Amazon ebook",
  },
];

// ── EXECUTE ─────────────────────────────────────────────────────────────────
async function run() {
  let ok = 0,
    err = 0;

  // Deletions
  for (const d of deletions) {
    if (dryRun) {
      console.log(`  [DEL·DRY] ${d.reason}`);
      ok++;
      continue;
    }
    const { error } = await supabase
      .schema("oulipo_dashboard")
      .from("events")
      .delete()
      .eq("id", d.id);
    if (error) {
      console.error(`  [DEL·ERR] ${d.reason}: ${error.message}`);
      err++;
    } else {
      console.log(`  [DEL·OK]  ${d.reason}`);
      ok++;
    }
  }

  // Updates
  for (const u of updates) {
    if (dryRun) {
      console.log(`  [UPD·DRY] ${u.label}`);
      for (const [k, v] of Object.entries(u.set)) {
        console.log(`            ${k}: ${v}`);
      }
      ok++;
      continue;
    }
    const { error } = await supabase
      .schema("oulipo_dashboard")
      .from("events")
      .update(u.set)
      .eq("id", u.id);
    if (error) {
      console.error(`  [UPD·ERR] ${u.label}: ${error.message}`);
      err++;
    } else {
      console.log(`  [UPD·OK]  ${u.label}`);
      ok++;
    }
  }

  console.log(
    `\nDone — ${deletions.length} deletions, ${updates.length} updates. ${ok} ok, ${err} errors.`,
  );
}

run();
