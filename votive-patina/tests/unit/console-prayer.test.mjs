/**
 * tests/unit/console-prayer.test.mjs
 *
 * Unit tests for lib/console-prayer.js (the single source of truth for all
 * prayer strings and the console inscription mechanism).
 *
 * Run: node --test tests/unit/console-prayer.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

const {
  PRAYER_LINES,
  ARABIC_LINES,
  CLOSING_COUPLET,
  printLine,
  subscribe,
  fullBilingualPrayer,
} = await import("../../lib/console-prayer.js");

// ---------------------------------------------------------------------------
// PRAYER_LINES
// ---------------------------------------------------------------------------
describe("PRAYER_LINES", () => {
  it("is an array of exactly 5 strings", () => {
    assert.ok(Array.isArray(PRAYER_LINES), "PRAYER_LINES must be an array");
    assert.equal(
      PRAYER_LINES.length,
      5,
      "PRAYER_LINES must have exactly 5 elements",
    );
    for (const line of PRAYER_LINES) {
      assert.equal(
        typeof line,
        "string",
        `each line must be a string, got ${typeof line}`,
      );
      assert.ok(line.length > 0, "each line must be non-empty");
    }
  });

  it("deep-equals the canonical five English lines", () => {
    const expected = [
      "Hold us against your bosom",
      "Guard us from all evil",
      "Mother of Jesus",
      "Plead for us",
      "Amen",
    ];
    assert.deepEqual(
      PRAYER_LINES,
      expected,
      `PRAYER_LINES mismatch.\nExpected: ${JSON.stringify(expected, null, 2)}\nGot:      ${JSON.stringify(PRAYER_LINES, null, 2)}`,
    );
  });
});

// ---------------------------------------------------------------------------
// ARABIC_LINES
// ---------------------------------------------------------------------------
describe("ARABIC_LINES", () => {
  it("is an array of exactly 5 strings", () => {
    assert.ok(Array.isArray(ARABIC_LINES), "ARABIC_LINES must be an array");
    assert.equal(
      ARABIC_LINES.length,
      5,
      "ARABIC_LINES must have exactly 5 elements",
    );
    for (const line of ARABIC_LINES) {
      assert.equal(
        typeof line,
        "string",
        `each Arabic line must be a string, got ${typeof line}`,
      );
      assert.ok(line.length > 0, "each Arabic line must be non-empty");
    }
  });

  it("first element is 'بحضنك خذينا'", () => {
    assert.equal(
      ARABIC_LINES[0],
      "بحضنك خذينا",
      `ARABIC_LINES[0] must be 'بحضنك خذينا', got: ${JSON.stringify(ARABIC_LINES[0])}`,
    );
  });

  it("contains no '<SUBSTACK_URL>' placeholder", () => {
    for (const line of ARABIC_LINES) {
      assert.ok(
        !line.includes("<SUBSTACK_URL>"),
        "ARABIC_LINES must not contain '<SUBSTACK_URL>'",
      );
    }
  });
});

// ---------------------------------------------------------------------------
// CLOSING_COUPLET
// ---------------------------------------------------------------------------
describe("CLOSING_COUPLET", () => {
  it("is an array of strings", () => {
    assert.ok(
      Array.isArray(CLOSING_COUPLET),
      "CLOSING_COUPLET must be an array",
    );
    assert.ok(CLOSING_COUPLET.length > 0, "CLOSING_COUPLET must be non-empty");
    for (const line of CLOSING_COUPLET) {
      assert.equal(typeof line, "string", "each couplet line must be a string");
    }
  });

  it("joined text contains 'architecture of your faith'", () => {
    const joined = CLOSING_COUPLET.join(" ");
    assert.ok(
      joined.includes("architecture of your faith"),
      `CLOSING_COUPLET joined text must contain 'architecture of your faith'.\nGot: ${JSON.stringify(joined)}`,
    );
  });

  it("joined text contains 'hang the hammock'", () => {
    const joined = CLOSING_COUPLET.join(" ");
    assert.ok(
      joined.includes("hang the hammock"),
      `CLOSING_COUPLET joined text must contain 'hang the hammock'.\nGot: ${JSON.stringify(joined)}`,
    );
  });
});

// ---------------------------------------------------------------------------
// fullBilingualPrayer
// ---------------------------------------------------------------------------
describe("fullBilingualPrayer", () => {
  it("returns a string", () => {
    const result = fullBilingualPrayer();
    assert.equal(
      typeof result,
      "string",
      "fullBilingualPrayer must return a string",
    );
    assert.ok(
      result.length > 0,
      "fullBilingualPrayer must return a non-empty string",
    );
  });

  it("contains the first Arabic line 'بحضنك خذينا'", () => {
    const result = fullBilingualPrayer();
    assert.ok(
      result.includes("بحضنك خذينا"),
      `fullBilingualPrayer must contain 'بحضنك خذينا'.\nGot: ${JSON.stringify(result.slice(0, 200))}`,
    );
  });

  it("contains the first English line 'Hold us against your bosom'", () => {
    const result = fullBilingualPrayer();
    assert.ok(
      result.includes("Hold us against your bosom"),
      `fullBilingualPrayer must contain 'Hold us against your bosom'.\nGot: ${JSON.stringify(result.slice(0, 200))}`,
    );
  });

  it("contains no '<SUBSTACK_URL>' placeholder", () => {
    const result = fullBilingualPrayer();
    assert.ok(
      !result.includes("<SUBSTACK_URL>"),
      "fullBilingualPrayer must not contain '<SUBSTACK_URL>'",
    );
  });
});

// ---------------------------------------------------------------------------
// subscribe / printLine
// printLine now emits TWO notifications per call: Arabic then English.
// ---------------------------------------------------------------------------
describe("subscribe and printLine", () => {
  it("printLine(0) emits Arabic emission then English emission (2 total)", async () => {
    const received = [];
    const unsub = subscribe((msg) => received.push(msg));

    try {
      printLine(0);

      await new Promise((resolve) => setImmediate(resolve));

      assert.equal(
        received.length,
        2,
        `printLine(0) should emit 2 notifications (Arabic + English); got ${received.length}`,
      );

      // First emission: Arabic
      const arMsg = received[0];
      assert.ok(
        arMsg !== null && typeof arMsg === "object",
        "first emission must be an object",
      );
      assert.equal(
        arMsg.text,
        ARABIC_LINES[0],
        `first emission text must be ARABIC_LINES[0] ('${ARABIC_LINES[0]}').\nGot: ${JSON.stringify(arMsg.text)}`,
      );
      assert.ok(
        arMsg.kind && arMsg.kind.endsWith("-ar"),
        `first emission kind must end with '-ar'; got '${arMsg.kind}'`,
      );

      // Second emission: English
      const enMsg = received[1];
      assert.ok(
        enMsg !== null && typeof enMsg === "object",
        "second emission must be an object",
      );
      assert.equal(
        enMsg.text,
        PRAYER_LINES[0],
        `second emission text must be PRAYER_LINES[0] ('${PRAYER_LINES[0]}').\nGot: ${JSON.stringify(enMsg.text)}`,
      );
    } finally {
      unsub();
    }
  });

  it("unsubscribe stops further notifications", async () => {
    const received = [];
    const unsub = subscribe((msg) => received.push(msg));
    unsub(); // unsubscribe immediately

    printLine(0);
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(
      received.length,
      0,
      `after unsubscribe, fn must not be called. Got ${received.length} calls`,
    );
  });

  it("each subscriber notification has 'text' and 'kind' properties", async () => {
    const received = [];
    const unsub = subscribe((msg) => received.push(msg));

    try {
      printLine(0);
      await new Promise((resolve) => setImmediate(resolve));

      // Both emissions must have text and kind
      for (const msg of received) {
        assert.ok("text" in msg, "notification must have a 'text' property");
        assert.ok("kind" in msg, "notification must have a 'kind' property");
      }
    } finally {
      unsub();
    }
  });

  it("3 printLine calls produce 6 notifications (2 per call)", async () => {
    const received = [];
    const unsub = subscribe((msg) => received.push(msg));

    try {
      printLine(0);
      printLine(1);
      printLine(2);
      await new Promise((resolve) => setImmediate(resolve));

      assert.equal(
        received.length,
        6,
        `3 printLine calls should emit 6 notifications; got ${received.length}`,
      );
    } finally {
      unsub();
    }
  });
});
