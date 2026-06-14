// ─────────────────────────────────────────────────────────────────────────────
//  lib/stage.js  -  votivepatina-stage
//
//  The controller that ties the pure reducer (perf-state.js) to the transport
//  (realtime.js) for all three surfaces. One authority owns the reducer; the
//  others render from its broadcasts.
//
//  Authority model: the ADMIN is the single source of truth. It owns the reducer
//  and is the only surface that sets N / threshold / begin / reset and that
//  applies incoming peaces, then broadcasts the resulting state. The performer
//  and audience are pure renderers (the audience additionally SENDS peaces). This
//  keeps the projected performer screen disposable - it can reload mid-show and
//  re-sync from the next broadcast - and puts every authoritative action on the
//  operator's own console. Late joiners are caught up because the admin
//  re-broadcasts whenever the presence roster changes.
//
//  createStage({ role, sessionId, ... }) -> a handle:
//    { deviceId, mode, role, getState(),
//      passPeace(),                 // audience: "I passed the peace"
//      setThreshold(n), begin(), reset(),   // admin only (no-ops elsewhere)
//      leave() }
//  and calls onState(state) / onPresence(count, roster) as things change.
//
//  The broadcast state is the reducer state plus `started` (preroll vs active),
//  which the admin flips with begin(). No framework, no em-dashes.
// ─────────────────────────────────────────────────────────────────────────────

import { joinSession } from "./realtime.js";
import {
  createPerfState,
  applyPeace,
  setThreshold as reduceThreshold,
  reset as reduceReset,
} from "./perf-state.js";

/**
 * @param {object} opts
 * @param {"performer"|"audience"|"admin"} opts.role
 * @param {string} opts.sessionId
 * @param {number} [opts.stationCount=5]
 * @param {number} [opts.threshold=1]   initial PASSES_PER_STATION (admin)
 * @param {"supabase"|"loopback"} [opts.transport]
 * @param {(state:object)=>void} [opts.onState]
 * @param {(count:number, roster:object)=>void} [opts.onPresence]
 * @returns {Promise<object>} the stage handle
 */
export async function createStage({
  role,
  sessionId,
  stationCount = 5,
  threshold = 1,
  transport,
  onState,
  onPresence,
} = {}) {
  const session = await joinSession({ sessionId, role, transport });
  const isAuthority = role === "admin";

  let state = createPerfState({ stationCount, threshold });
  let started = false; // preroll until the admin begins
  let last = view();

  function view() {
    return { ...state, started };
  }

  function emit(v) {
    last = v;
    if (onState) onState(v);
  }

  // Authority: render locally AND broadcast to the room.
  function pushAuthoritative() {
    const v = view();
    emit(v);
    session.broadcast(v);
  }

  if (isAuthority) {
    session.onPeace((p) => {
      // Peaces only count once the show has begun and before the finale.
      if (!started || state.finale) return;
      const next = applyPeace(state, p);
      if (next !== state) {
        state = next;
        pushAuthoritative();
      }
    });
    session.onPresence((count, roster) => {
      if (onPresence) onPresence(count, roster);
      // A new device joined (or left): rebroadcast so late joiners sync.
      pushAuthoritative();
    });
    // Initial broadcast so any already-present surface gets the starting state.
    pushAuthoritative();
  } else {
    session.onState((s) => emit(s));
    if (onPresence) {
      session.onPresence((count, roster) => onPresence(count, roster));
    }
  }

  return {
    deviceId: session.deviceId,
    mode: session.mode,
    role,
    getState: () => last,

    // Audience: pass the peace for the station we currently believe is active.
    passPeace: () =>
      session.sendPeace({
        deviceId: session.deviceId,
        stationIndex: last.stationIndex ?? 0,
      }),

    // Admin authority controls (no-ops on other roles).
    setThreshold: (n) => {
      if (!isAuthority) return;
      state = reduceThreshold(state, n);
      pushAuthoritative();
    },
    begin: () => {
      if (!isAuthority) return;
      started = true;
      pushAuthoritative();
    },
    reset: () => {
      if (!isAuthority) return;
      state = reduceReset(state);
      started = false;
      pushAuthoritative();
    },

    leave: () => session.leave(),
  };
}
