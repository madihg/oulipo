import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PACING,
  momentDurationMs,
  scheduleKeyframes,
} from "../../src/pacing.js";

test("momentDurationMs clamps to the configured range", () => {
  assert.equal(momentDurationMs(""), DEFAULT_PACING.minMomentMs);
  assert.equal(momentDurationMs("x".repeat(5000)), DEFAULT_PACING.maxMomentMs);
});

test("momentDurationMs scales with text length in range", () => {
  const short = momentDurationMs("x".repeat(120));
  const long = momentDurationMs("x".repeat(180));
  assert.ok(long > short, "longer line takes longer");
  assert.ok(
    short >= DEFAULT_PACING.minMomentMs && long <= DEFAULT_PACING.maxMomentMs,
  );
});

test("scheduleKeyframes returns count ascending starts within duration", () => {
  const dur = 9000;
  const sched = scheduleKeyframes(4, dur);
  assert.equal(sched.length, 4);
  assert.equal(sched[0].start, 0);
  for (let i = 1; i < sched.length; i++) {
    assert.ok(sched[i].start > sched[i - 1].start, "strictly ascending");
    assert.ok(sched[i].start <= dur, "within duration");
  }
});

test("scheduleKeyframes handles single + empty keyframe sets", () => {
  assert.deepEqual(scheduleKeyframes(0, 9000), []);
  const one = scheduleKeyframes(1, 9000);
  assert.equal(one.length, 1);
  assert.equal(one[0].start, 0);
});
