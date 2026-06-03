/**
 * tests/unit/console-prayer.test.mjs
 *
 * Unit tests for lib/console-prayer.js (the single source of truth for all
 * prayer strings and the console inscription mechanism).
 *
 * Expected to FAIL until lib/console-prayer.js exists - that is correct.
 * The assertions are written against the DESIGN.md contract (Appendix B),
 * not against any current file contents.
 *
 * Run: node --test tests/unit/console-prayer.test.mjs
 */

import { describe, it, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

// The module under test - may not exist yet; we let the import throw
// naturally so node:test reports a module-level error rather than a
// cryptic assertion failure.
const { PRAYER_LINES, CLOSING_COUPLET, INVITE, printLine, subscribe } =
  await import("../../lib/console-prayer.js");

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

  it("deep-equals the canonical five lines from Appendix B (DESIGN.md)", () => {
    // Appendix B canonical English prayer lines - verbatim from the contract
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
// INVITE
// ---------------------------------------------------------------------------
describe("INVITE", () => {
  it("is a non-empty string", () => {
    assert.equal(typeof INVITE, "string", "INVITE must be a string");
    assert.ok(INVITE.length > 0, "INVITE must be non-empty");
  });

  it("contains '<SUBSTACK_URL>' (placeholder, not yet replaced)", () => {
    assert.ok(
      INVITE.includes("<SUBSTACK_URL>"),
      `INVITE must contain '<SUBSTACK_URL>'.\nGot: ${JSON.stringify(INVITE)}`,
    );
  });

  it("contains 'the rest of this prayer lives here'", () => {
    assert.ok(
      INVITE.includes("the rest of this prayer lives here"),
      `INVITE must contain 'the rest of this prayer lives here'.\nGot: ${JSON.stringify(INVITE)}`,
    );
  });
});

// ---------------------------------------------------------------------------
// subscribe / printLine
// ---------------------------------------------------------------------------
describe("subscribe and printLine", () => {
  it("subscribe(fn) receives a notification when printLine(0) is called", async () => {
    const received = [];
    const unsub = subscribe((msg) => received.push(msg));

    try {
      printLine(0);

      // Give any microtasks a chance to settle
      await new Promise((resolve) => setImmediate(resolve));

      assert.equal(
        received.length,
        1,
        `subscribe fn should have been called once; got ${received.length} calls`,
      );
      const msg = received[0];
      assert.ok(
        msg !== null && typeof msg === "object",
        "subscriber receives an object",
      );
      assert.equal(
        msg.text,
        PRAYER_LINES[0],
        `subscriber object.text must equal PRAYER_LINES[0] ('${PRAYER_LINES[0]}').\nGot: ${JSON.stringify(msg.text)}`,
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

  it("subscribe(fn) receives notifications for each printLine call", async () => {
    const received = [];
    const unsub = subscribe((msg) => received.push(msg));

    try {
      printLine(0);
      printLine(1);
      printLine(2);
      await new Promise((resolve) => setImmediate(resolve));

      assert.equal(
        received.length,
        3,
        `expected 3 notifications; got ${received.length}`,
      );
      assert.equal(received[0].text, PRAYER_LINES[0]);
      assert.equal(received[1].text, PRAYER_LINES[1]);
      assert.equal(received[2].text, PRAYER_LINES[2]);
    } finally {
      unsub();
    }
  });

  it("each subscriber notification has a 'text' property and a 'kind' property", async () => {
    const received = [];
    const unsub = subscribe((msg) => received.push(msg));

    try {
      printLine(0);
      await new Promise((resolve) => setImmediate(resolve));

      assert.equal(received.length, 1);
      const msg = received[0];
      assert.ok("text" in msg, "notification must have a 'text' property");
      assert.ok("kind" in msg, "notification must have a 'kind' property");
      // kind for a prayer line must be 'line'
      assert.equal(
        msg.kind,
        "line",
        `kind for a prayer line must be 'line'; got '${msg.kind}'`,
      );
    } finally {
      unsub();
    }
  });
});
