// Runs every unit test file and exits non-zero if any of them fails.
//
// The four test files are plain scripts, not `node:test` suites, so
// `node --test engine/test` mis-collects them. Use this instead:
//
//   node engine/test/all.mjs
//
// The two long measurements are deliberately NOT run here, because they take
// minutes and they are measurements rather than pass/fail tests:
//
//   node engine/test/conformance.mjs   -> engine/test/REPORT.md
//   node engine/test/calibrate.mjs     -> engine/test/REPORT-calibration.md

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const files = [
  "parser.test.mjs",
  "pattern.test.mjs",
  "runtime.test.mjs",
  "smoke.test.mjs",
];

let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [join(here, f)], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const out = (r.stdout || "") + (r.stderr || "");
  const last = out.trim().split("\n").filter(Boolean).pop() || "";
  if (r.status === 0) {
    console.log(`PASS  ${f.padEnd(20)} ${last.slice(0, 90)}`);
  } else {
    failed++;
    console.log(`FAIL  ${f}`);
    console.log(
      out
        .trim()
        .split("\n")
        .slice(-25)
        .map((l) => "      " + l)
        .join("\n"),
    );
  }
}

console.log(
  failed ? `\n${failed} of ${files.length} test files failed` : "\nall green",
);
process.exit(failed ? 1 : 0);
