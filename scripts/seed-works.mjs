#!/usr/bin/env node

// Seed Supabase works table (oulipo_dashboard.works)
// Usage: node scripts/seed-works.mjs             (seed all works)
//        node scripts/seed-works.mjs --clear      (delete all rows first, then seed)
//
// Requires: OULIPO_SUPABASE_URL and OULIPO_SUPABASE_SERVICE_KEY in .env.local

import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

dotenv.config({ path: resolve(ROOT, ".env.local") });

const SUPABASE_URL = process.env.OULIPO_SUPABASE_URL;
const SUPABASE_KEY = process.env.OULIPO_SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing OULIPO_SUPABASE_URL or OULIPO_SUPABASE_SERVICE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: "oulipo_dashboard" },
});

const clearFirst = process.argv.includes("--clear");

// All 21 works + books
const works = [
  {
    title: "Carnation.exe",
    slug: "carnation-exe",
    type: "performance",
    date_start: "2025-05-01",
    venue: "European Artist Program",
    location: "Paris, Barcelona",
    short_description:
      "Part I of the Singulars series - a daily duel between a human poet and a fine-tuned language model trained exclusively on poetry.",
    cover_image: "Assets/images/works/carnation-exe/gallery-1.jpg",
    tags: ["ai", "poetry", "performance", "singulars", "computational"],
    series: "singulars",
    external_links: [
      { url: "https://singulars.oulipo.xyz/carnation-exe", label: "Live site" },
      {
        url: "https://huggingface.co/datasets/madihalim/carnation-fr",
        label: "Dataset",
      },
    ],
    featured: true,
    sort_order: 1,
  },
  {
    title: "Versus.exe",
    slug: "versus-exe",
    type: "performance",
    date_start: "2025-10-01",
    venue: "Mozilla San Francisco",
    location: "San Francisco",
    short_description:
      "Part II of the Singulars series - a 10-day human-machine poetry confrontation exploring rivalry as intimacy.",
    cover_image: "Assets/images/works/versus-exe/IMG_9921.jpg",
    tags: ["ai", "poetry", "performance", "singulars", "computational"],
    series: "singulars",
    external_links: [
      { url: "https://singulars.oulipo.xyz/versus-exe", label: "Live site" },
      {
        url: "https://huggingface.co/datasets/madihalim/versus",
        label: "Dataset",
      },
    ],
    featured: true,
    sort_order: 2,
  },
  {
    title: "Reinforcement.exe",
    slug: "reinforcement-exe",
    type: "installation",
    date_start: "2026-01-01",
    venue: "IGAC Gallery",
    location: "Istanbul",
    short_description:
      "Part III of the Singulars series - reinforcement learning meets poetic confrontation at DevConnect Istanbul.",
    cover_image:
      "Assets/images/works/reinforcement-exe/IGAC-exhibition-photography-049.jpg",
    tags: ["ai", "poetry", "installation", "singulars", "computational"],
    series: "singulars",
    external_links: [
      {
        url: "https://singulars.oulipo.xyz/reinforcement-exe",
        label: "Live site",
      },
      {
        url: "https://huggingface.co/datasets/madihalim/reinforcement",
        label: "Dataset",
      },
    ],
    featured: true,
    sort_order: 3,
  },
  {
    title: "Borderline",
    slug: "borderline",
    type: "performance",
    date_start: "2026-02-01",
    venue: "Counterpulse",
    location: "San Francisco",
    short_description:
      "A full-body multimedia poem about borders, queerness, and the architecture of belonging. Features Arabic zajal, projected code, and live performance.",
    cover_image:
      "Assets/images/works/borderline/border--line---by-halim-madi_54209730387_o.jpg",
    tags: ["performance", "queer", "migration", "poetry"],
    external_links: [
      { url: "https://borderline.oulipo.xyz", label: "Live site" },
    ],
    featured: true,
    sort_order: 4,
  },
  {
    title: "We Called Us Poetry",
    slug: "we-called-us",
    type: "digital",
    date_start: "2024-10-01",
    venue: "ELO Conference / Bergen / TIAT",
    location: "Toronto, Bergen, San Francisco",
    short_description:
      "An interactive web poem exploring consciousness, Arabic linguistics, and human-machine co-authorship.",
    cover_image:
      "Assets/images/works/we-called-us/We-Called-Us-Poetry_Web_2024.png",
    tags: ["ai", "poetry", "digital", "computational"],
    external_links: [
      { url: "https://elo-2025.vercel.app", label: "Live site" },
    ],
    featured: false,
    sort_order: 5,
  },
  {
    title: "Feed It",
    slug: "feed-it",
    type: "performance",
    date_start: "2025-06-01",
    venue: "APE Camp Seoul",
    location: "Seoul",
    short_description:
      "A durational AI-body performance where audience answers shape a real-time generative portrait.",
    cover_image: "Assets/images/works/feed-it/IMG_6388.jpg",
    tags: ["ai", "performance"],
    external_links: [],
    featured: false,
    sort_order: 6,
  },
  {
    title: "Deserve It",
    slug: "deserve-it",
    type: "performance",
    date_start: "2024-08-01",
    venue: "Gray Area",
    location: "San Francisco",
    short_description:
      "A durational immigration performance - a fictional visa form that scrambles your answers into poetry.",
    cover_image:
      "Assets/images/works/deserve-it/gray_area_summer_artist_2024-060.jpg",
    tags: ["performance", "migration", "queer", "digital"],
    external_links: [
      { url: "https://deserve.vercel.app/", label: "Live site" },
    ],
    featured: false,
    sort_order: 7,
  },
  {
    title: "I Live Here",
    slug: "i-live-here",
    type: "performance",
    date_start: "2025-03-01",
    venue: "Counterpulse / We-Topia Gala",
    location: "San Francisco",
    short_description:
      "A walking poem through San Francisco's Tenderloin, mapping queer nightlife from Beirut to the Bay.",
    cover_image:
      "Assets/images/works/i-live-here/We-Topia-Gala-2025-Photo-1.jpg",
    tags: ["performance", "queer", "migration"],
    external_links: [],
    featured: false,
    sort_order: 8,
  },
  {
    title: "Borderline.exe",
    slug: "borderline-exe",
    type: "digital",
    date_start: "2024-01-01",
    venue: "Robert Coover Award",
    location: "Online",
    short_description:
      "An interactive HTML poem - a border that writes itself between two lovers.",
    cover_image:
      "Assets/images/works/borderline-exe/Screenshot-2025-10-06-at-2.03.39PM.png",
    tags: ["digital", "poetry", "queer", "computational"],
    external_links: [
      { url: "https://borderline.oulipo.xyz/exe", label: "Live site" },
    ],
    featured: false,
    sort_order: 9,
  },
  {
    title: "Weirder Webs",
    slug: "weirder-webs",
    type: "workshop_piece",
    date_start: "2024-11-01",
    venue: "Multiple venues",
    location: "Barcelona, Paris, London, San Francisco",
    short_description:
      "A traveling workshop-performance inviting participants to build weird, queer web dwellings.",
    cover_image: "Assets/images/works/weirder-webs/Whitagram-Image-4.JPG",
    tags: ["digital", "queer", "computational"],
    external_links: [],
    featured: false,
    sort_order: 10,
  },
  {
    title: "Borrow and Never Give Back",
    slug: "borrow-never-give-back",
    type: "installation",
    date_start: "2024-06-01",
    venue: "Silo Gallery",
    location: "San Francisco",
    short_description:
      "A collage-poetry installation transforming spam text into sacred objects at a queer arts space.",
    cover_image: "Assets/images/works/borrow-never-give-back/IMG_5272.JPG",
    tags: ["installation", "poetry", "queer"],
    external_links: [],
    featured: false,
    sort_order: 11,
  },
  {
    title: "Re/declarations",
    slug: "re-declarations",
    type: "digital",
    date_start: "2024-07-01",
    venue: "Online",
    location: "San Francisco",
    short_description:
      "A generative web piece that rewrites the Declaration of Independence using AI and immigrant voices.",
    cover_image:
      "Assets/images/works/re-declarations/Screenshot-2024-10-31-at-2.27.15PM.png",
    tags: ["digital", "ai", "migration", "computational"],
    external_links: [],
    featured: false,
    sort_order: 12,
  },
  {
    title: "American Metabolisis",
    slug: "american-metabolisis",
    type: "installation",
    date_start: "2019-06-01",
    venue: "Gray Area",
    location: "San Francisco",
    short_description:
      "An installation mapping the metabolization of immigrant identity through receipt-poems and data visualization.",
    cover_image: "Assets/images/works/american-metabolisis/IMG_7153.JPG",
    tags: ["installation", "migration", "poetry"],
    external_links: [],
    featured: false,
    sort_order: 13,
  },
  {
    title: "Avenir",
    slug: "avenir",
    type: "installation",
    date_start: "2019-06-01",
    venue: "Multiple venues",
    location: "Paris, Sao Paulo",
    short_description:
      "A series of site-specific interventions exploring futures, migration, and the politics of public space.",
    cover_image: "Assets/images/works/avenir/FullSizeRender.jpg",
    tags: ["installation", "migration"],
    external_links: [
      { url: "https://medium.com/@builduntitled", label: "Website" },
    ],
    featured: false,
    sort_order: 14,
  },
  {
    title: "WHOMP",
    slug: "whomp",
    type: "digital",
    date_start: "2023-01-01",
    venue: "Online",
    location: "San Francisco",
    short_description:
      "A generative text interface that turns casual messaging into absurdist poetry.",
    cover_image:
      "Assets/images/works/whomp/Screenshot-2025-10-06-at-4.39.43PM.png",
    tags: ["digital", "poetry", "computational"],
    external_links: [],
    featured: false,
    sort_order: 15,
  },
  {
    title: "def(hug)",
    slug: "def-hug",
    type: "performance",
    date_start: "2023-06-01",
    venue: "Various venues",
    location: "San Francisco",
    short_description:
      "A computational poetry performance exploring the syntax of intimacy and touch.",
    cover_image: null,
    tags: ["performance", "poetry", "computational"],
    external_links: [],
    featured: false,
    sort_order: 16,
  },
  {
    title: "Invasions (Performance)",
    slug: "invasions-performance",
    type: "performance",
    date_start: "2022-06-01",
    venue: "Various venues",
    location: "San Francisco, LA, CDMX, Santa Barbara, Ojai",
    short_description:
      "Live readings from the Invasions poetry book - performing spam-text poems as ritual incantation.",
    cover_image: null,
    tags: ["performance", "poetry"],
    external_links: [],
    featured: false,
    sort_order: 17,
  },
  {
    title: "Invasions: The Book",
    slug: "invasions",
    type: "book",
    date_start: "2022-06-01",
    venue: null,
    location: "San Francisco",
    short_description:
      "Poetry responses to scam texts - an act of infiltration reclaiming manipulative language as lyric.",
    cover_image: "Assets/images/books/invasions-cover.jpg",
    tags: ["book", "poetry", "digital"],
    external_links: [
      {
        url: "https://www.kickstarter.com/projects/theheeledpoet/invasions-poetry-to-strike-back-at-robotexts",
        label: "Kickstarter",
      },
      {
        url: "https://www.amazon.com/Invasions-Poetry-Strike-Robotexts-Halims/dp/B0C644BZRZ",
        label: "Amazon",
      },
    ],
    featured: false,
    sort_order: 18,
  },
  {
    title: "Flight of the Jaguar",
    slug: "flight-of-the-jaguar",
    type: "book",
    date_start: "2018-04-01",
    venue: null,
    location: "San Francisco",
    short_description:
      "A computational poetry work merging printed bookwork with virtual embodiment, exploring sluthood and migratory identity.",
    cover_image: "Assets/images/books/flight-cover.jpg",
    tags: ["book", "poetry", "queer"],
    external_links: [
      {
        url: "https://www.kickstarter.com/projects/theheeledpoet/flight-of-the-jaguar/description",
        label: "Kickstarter",
      },
      {
        url: "https://www.amazon.com/Flight-jaguar-Halim-Madi/dp/B086B2DFQ6",
        label: "Amazon",
      },
    ],
    featured: false,
    sort_order: 19,
  },
  {
    title: "In the Name of Scandal",
    slug: "in-the-name-of-scandal",
    type: "book",
    date_start: "2020-04-01",
    venue: null,
    location: "San Francisco",
    short_description:
      "A collection addressing sluthood, queer migration, and spiritual exhaustion - poetry as flesh, as tenderness, as resistance.",
    cover_image: "Assets/images/books/scandal-cover.jpg",
    tags: ["book", "poetry", "queer", "migration"],
    external_links: [
      {
        url: "https://www.kickstarter.com/projects/theheeledpoet/in-the-name-of-scandal",
        label: "Kickstarter",
      },
      {
        url: "https://www.amazon.com/Name-Scandal-collection-immigrant-queerness/dp/B087L4R3T1",
        label: "Amazon",
      },
    ],
    featured: false,
    sort_order: 20,
  },
  {
    title: "Deep & Fast",
    slug: "deep-fast",
    type: "book",
    date_start: "2021-07-01",
    venue: null,
    location: "San Francisco",
    short_description:
      "Poetic responses to questions harvested from the internet - pocket-sized, lo-fi, rejecting self-help's forced optimism.",
    cover_image: "Assets/images/books/deep-fast-cover.jpg",
    tags: ["book", "poetry"],
    external_links: [
      {
        url: "https://www.kickstarter.com/projects/theheeledpoet/deep-and-fast",
        label: "Kickstarter",
      },
      {
        url: "https://www.amazon.com/Deep-Fast-remember-testament-connection-ebook/dp/B09955BL7L/",
        label: "Amazon",
      },
    ],
    featured: false,
    sort_order: 21,
  },
];

async function main() {
  if (clearFirst) {
    console.log("Clearing existing works...");
    const { error: delErr } = await supabase
      .from("works")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (delErr) {
      console.error("Clear failed:", delErr.message);
      process.exit(1);
    }
    console.log("Cleared.");
  }

  console.log(`Seeding ${works.length} works...`);
  const { data, error } = await supabase.from("works").upsert(works, {
    onConflict: "slug",
  });

  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${works.length} works successfully.`);
}

main();
