#!/usr/bin/env node
// Fix per-work page prev/next nav thumbnails + a broken slug + cache-bust.
// - Thumbnails: point every work-nav__thumb at the linked work's git-tracked
//   featured.* (correct casing/extension), or leave a clean empty box when the
//   work has no featured image. Resolves wrong-extension 404s + empty thumbs.
// - Slug: becoming-border-2026 was renamed to becoming-crossings (the old slug
//   404s). Rewrite href + visible title.
// - Cache-bust: shared.css?v=36 -> v=37 (the .detail-image-strip rules changed).
// Run from the repo root: node scripts/fix-nav-thumbs.mjs
import fs from "fs";
import { execSync } from "child_process";

const ROOT = "/Users/halim/Documents/oulipo";
process.chdir(ROOT);

// slug -> "/Assets/images/works/<slug>/<file>" from git (not the macOS FS, to
// avoid the featured.JPG vs featured.jpg case trap).
const feat = {};
for (const l of execSync("git ls-files 'Assets/images/works/*/featured.*'")
  .toString()
  .trim()
  .split("\n")) {
  if (!l) continue;
  feat[l.split("/")[3]] = "/" + l;
}

const slugs = fs
  .readdirSync("works")
  .filter((d) => fs.existsSync(`works/${d}/index.html`));

let changed = 0;
const report = [];
for (const slug of slugs) {
  const file = `works/${slug}/index.html`;
  let html = fs.readFileSync(file, "utf8");
  const orig = html;

  // Fix 4 - broken renamed slug + visible title.
  html = html.replace(/becoming-border-2026/g, "becoming-crossings");
  html = html.replace(
    /(work-nav__title">)Becoming Border(<)/g,
    "$1Becoming Crossings$2",
  );

  // Fix 1 - rewrite each nav thumb to the linked work's featured image.
  html = html.replace(
    /(<a\s+class="work-nav__link[^"]*"\s+href="\/works\/([^/"]+)\/"\s*>)([\s\S]*?)(<\/a>)/g,
    (_m, open, navSlug, body, close) => {
      const thumb = feat[navSlug]
        ? `<span class="work-nav__thumb"><img src="${feat[navSlug]}" alt="" loading="lazy" /></span>`
        : `<span class="work-nav__thumb"></span>`;
      const newBody = body.replace(
        /<span class="work-nav__thumb"\s*>[\s\S]*?<\/span>/,
        thumb,
      );
      if (!feat[navSlug]) report.push(`  EMPTY (no featured): ${slug} -> ${navSlug}`);
      return open + newBody + close;
    },
  );

  // Fix 3 - cache-bust the per-work CSS.
  html = html.replace(/shared\.css\?v=36/g, "shared.css?v=37");

  if (html !== orig) {
    fs.writeFileSync(file, html);
    changed++;
  }
}
console.log(`changed files: ${changed}`);
if (report.length) console.log("intentionally-empty thumbs:\n" + report.join("\n"));
