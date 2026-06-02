#!/usr/bin/env node
// Remove gallery figures that are byte-identical to the page hero image.
// Halim 2026-06-01: several per-work pages repeat the featured/hero image
// further down in the gallery ("why is the same image showing twice"). The
// hero is the canonical display; drop the duplicate gallery figure(s). Cleans
// up any strip div left empty afterward. Operates only inside .detail-flow so
// the hero and nav thumbs are never touched.
import fs from "fs";
import path from "path";
import crypto from "crypto";

const ROOT = "/Users/halim/Documents/oulipo";
process.chdir(ROOT);

const md5 = (p) => {
  try {
    return crypto.createHash("md5").update(fs.readFileSync(p)).digest("hex");
  } catch {
    return null;
  }
};

const slugs = fs
  .readdirSync("works")
  .filter((d) => fs.existsSync(`works/${d}/index.html`));

let totalRemoved = 0;
for (const slug of slugs) {
  const file = `works/${slug}/index.html`;
  const dir = path.dirname(file);
  let html = fs.readFileSync(file, "utf8");

  const heroM = html.match(/detail-hero">\s*<img\s+src="([^"]+)"/);
  if (!heroM) continue;
  const heroHash = md5(path.normalize(path.join(dir, heroM[1])));
  if (!heroHash) continue;

  // Operate only on the .detail-flow region (hero is above it, nav below).
  const flowStart = html.indexOf('<div class="detail-flow">');
  const navStart = html.indexOf('<nav class="work-nav"');
  if (flowStart === -1 || navStart === -1) continue;
  const before = html.slice(0, flowStart);
  let flow = html.slice(flowStart, navStart);
  const after = html.slice(navStart);

  const removed = [];
  // Remove any <figure>…<img …>…</figure> whose image duplicates the hero.
  flow = flow.replace(/<figure[^>]*>[\s\S]*?<\/figure>/g, (fig) => {
    const sm = fig.match(/<img\b[\s\S]*?src="([^"]+)"/);
    if (!sm) return fig;
    if (sm[1] === heroM[1]) {
      removed.push(path.basename(sm[1]));
      return "";
    }
    const h = md5(path.normalize(path.join(dir, sm[1])));
    if (h && h === heroHash) {
      removed.push(path.basename(sm[1]));
      return "";
    }
    return fig;
  });

  if (removed.length) {
    // Drop any strip div left with only whitespace, and collapse blank lines.
    flow = flow.replace(
      /<div class="detail-image-strip">\s*<\/div>\s*/g,
      "",
    );
    flow = flow.replace(/\n[ \t]*\n[ \t]*\n/g, "\n\n");
    html = before + flow + after;
    fs.writeFileSync(file, html);
    totalRemoved += removed.length;
    console.log(`${slug}: removed ${removed.length} dup figure(s) -> ${removed.join(", ")}`);
  }
}
console.log(`\ntotal dup figures removed: ${totalRemoved}`);
