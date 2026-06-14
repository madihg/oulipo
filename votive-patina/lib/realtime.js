// ─────────────────────────────────────────────────────────────────────────────
//  lib/realtime.js  -  votivepatina-stage
//
//  The cross-device transport for the live performance. One channel per show
//  carries two kinds of message and a presence roster:
//
//    state  - the authoritative performance state, broadcast by the single host
//             (performer, or admin if there is no performer). Every surface
//             renders from it. See lib/perf-state.js.
//    peace  - "I passed the peace", sent by an audience phone. The host applies
//             it to the reducer and broadcasts the new state.
//    presence - who is connected; the admin counts audience devices against N.
//
//  Two transports behind one interface:
//
//    "supabase" (default, live shows): Supabase Realtime broadcast + presence.
//               The client is loaded as an ESM module from a CDN at runtime - the
//               ONE allowed remote import in the codebase (see verify-purity).
//    "loopback" (offline tests): a BroadcastChannel that bridges pages in the
//               same browser context, so the 2-client sync test runs with no
//               network. Force it with `?rt=loopback` or window.__VOTIVE_LOOPBACK__.
//
//  joinSession() resolves to a handle:
//    { deviceId, mode, broadcast(state), onState(cb), sendPeace(payload),
//      onPeace(cb), onPresence(cb), leave() }
//  Each on*(cb) returns an unsubscribe function.
//
//  No bundler, no em-dashes.
// ─────────────────────────────────────────────────────────────────────────────

import {
  SUPABASE_URL,
  SUPABASE_KEY,
  CHANNEL_PREFIX,
} from "./realtime-config.js";

// The single allowed remote import. Kept as a literal so the purity checker can
// see it and allowlist the host explicitly (it does, for esm.sh only).
const SUPABASE_ESM = "https://esm.sh/@supabase/supabase-js@2";

/**
 * Join a performance session.
 *
 * @param {object} opts
 * @param {string} opts.sessionId            the per-show id (channel suffix)
 * @param {"performer"|"audience"|"admin"} [opts.role="audience"]
 * @param {string} [opts.deviceId]           stable id for dedupe/presence (generated if absent)
 * @param {"supabase"|"loopback"} [opts.transport]  force a transport (else auto)
 * @returns {Promise<object>} the session handle
 */
export async function joinSession({
  sessionId,
  role = "audience",
  deviceId,
  transport,
} = {}) {
  const id = deviceId || randomId();
  const mode = transport || pickTransport();
  const impl =
    mode === "loopback"
      ? loopbackTransport({ sessionId, role, deviceId: id })
      : await supabaseTransport({ sessionId, role, deviceId: id });
  return { deviceId: id, mode, ...impl };
}

// Auto-pick: loopback only when explicitly requested (offline tests); else live.
function pickTransport() {
  try {
    const p = new URLSearchParams(location.search);
    if (p.get("rt") === "loopback") return "loopback";
  } catch {
    /* no location (non-browser) */
  }
  if (typeof globalThis !== "undefined" && globalThis.__VOTIVE_LOOPBACK__) {
    return "loopback";
  }
  return "supabase";
}

// ── Supabase transport (live) ────────────────────────────────────────────────

async function supabaseTransport({ sessionId, role, deviceId }) {
  const { createClient } =
    await import("https://esm.sh/@supabase/supabase-js@2");
  const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    realtime: { params: { eventsPerSecond: 20 } },
  });
  const channelName = `${CHANNEL_PREFIX}:${sessionId}`;
  const channel = client.channel(channelName, {
    config: { broadcast: { self: false }, presence: { key: deviceId } },
  });

  const stateCbs = new Set();
  const peaceCbs = new Set();
  const presenceCbs = new Set();

  channel.on("broadcast", { event: "state" }, ({ payload }) =>
    stateCbs.forEach((cb) => cb(payload)),
  );
  channel.on("broadcast", { event: "peace" }, ({ payload }) =>
    peaceCbs.forEach((cb) => cb(payload)),
  );
  channel.on("presence", { event: "sync" }, () => {
    const count = countAudience(channel.presenceState());
    presenceCbs.forEach((cb) => cb(count, channel.presenceState()));
  });

  await new Promise((resolve) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.track({ role, deviceId, t: Date.now() });
        resolve();
      }
    });
  });

  return {
    broadcast: (state) =>
      channel.send({ type: "broadcast", event: "state", payload: state }),
    sendPeace: (payload) =>
      channel.send({ type: "broadcast", event: "peace", payload }),
    onState: (cb) => addCb(stateCbs, cb),
    onPeace: (cb) => addCb(peaceCbs, cb),
    onPresence: (cb) => addCb(presenceCbs, cb),
    leave: () => {
      try {
        channel.untrack();
      } catch {
        /* ignore */
      }
      client.removeChannel(channel);
    },
  };
}

// presenceState() is keyed by presence key; each value is an array of metas.
function countAudience(state) {
  let n = 0;
  for (const key of Object.keys(state || {})) {
    const metas = state[key];
    if (Array.isArray(metas) && metas.some((m) => m && m.role === "audience")) {
      n += 1;
    }
  }
  return n;
}

// ── Loopback transport (offline: BroadcastChannel across pages) ───────────────

function loopbackTransport({ sessionId, role, deviceId }) {
  const bc = new BroadcastChannel(`${CHANNEL_PREFIX}:${sessionId}`);
  const stateCbs = new Set();
  const peaceCbs = new Set();
  const presenceCbs = new Set();
  const peers = new Map(); // deviceId -> { role }
  peers.set(deviceId, { role });

  const emitPresence = () => {
    let n = 0;
    for (const v of peers.values()) if (v.role === "audience") n += 1;
    const roster = Object.fromEntries(peers);
    presenceCbs.forEach((cb) => cb(n, roster));
  };

  bc.onmessage = (e) => {
    const msg = e.data;
    if (!msg || typeof msg !== "object") return;
    switch (msg.kind) {
      case "state":
        stateCbs.forEach((cb) => cb(msg.payload));
        break;
      case "peace":
        peaceCbs.forEach((cb) => cb(msg.payload));
        break;
      case "hello":
        // a peer announced itself: record it and announce back so it sees us.
        peers.set(msg.deviceId, { role: msg.role });
        bc.postMessage({ kind: "here", deviceId, role });
        emitPresence();
        break;
      case "here":
        peers.set(msg.deviceId, { role: msg.role });
        emitPresence();
        break;
      case "bye":
        peers.delete(msg.deviceId);
        emitPresence();
        break;
      default:
        break;
    }
  };

  // Announce ourselves and ask the room to announce back.
  bc.postMessage({ kind: "hello", deviceId, role });
  emitPresence();

  const sayBye = () => {
    try {
      bc.postMessage({ kind: "bye", deviceId });
    } catch {
      /* channel may be closed */
    }
  };
  try {
    addEventListener("pagehide", sayBye);
  } catch {
    /* non-browser */
  }

  return {
    broadcast: (state) => bc.postMessage({ kind: "state", payload: state }),
    sendPeace: (payload) => bc.postMessage({ kind: "peace", payload }),
    onState: (cb) => addCb(stateCbs, cb),
    onPeace: (cb) => addCb(peaceCbs, cb),
    onPresence: (cb) => addCb(presenceCbs, cb),
    leave: () => {
      sayBye();
      try {
        bc.close();
      } catch {
        /* ignore */
      }
    },
  };
}

// ── helpers ───────────────────────────────────────────────────────────────────

function addCb(set, cb) {
  set.add(cb);
  return () => set.delete(cb);
}

function randomId() {
  try {
    if (globalThis.crypto && globalThis.crypto.randomUUID) {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return "d-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
