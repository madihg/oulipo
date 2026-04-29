"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const SHARE_URL = "https://www.oulipo.xyz/becoming-crossings";

type QrState = "collapsed" | "expanded" | "max";

/**
 * Top-right QR entrypoint. Three states:
 *
 *   collapsed - small 56px QR pill anchored top-right. The pill is
 *     itself a tiny rendering of the same QR (the artifact, not an
 *     icon - principle "no clever icon set, only ↗"). Click to expand.
 *
 *   expanded  - centered modal with a 340px QR plus a mono caption
 *     "make bigger" affordance for projection or far-field scanning.
 *
 *   max       - same modal, QR scaled to min(85vw, 85vh). Built for
 *     audience scanning - someone projecting on a wall, or a participant
 *     at the back of a room.
 *
 * X always returns to collapsed. Backdrop click also closes.
 */
export function QrCode() {
  const [state, setState] = useState<QrState>("collapsed");

  // Close on Escape - keyboard-first per design system.
  useEffect(() => {
    if (state === "collapsed") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setState("collapsed");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);

  return (
    <>
      {/* Collapsed pill - horizontal, top-right anchor.
          Small abstract QR glyph + "show qr" mono caption. The glyph is
          a 4x4 dot pattern, not a literal QR - read as "scannable thing"
          without being noisy at icon scale. */}
      <button
        onClick={() => setState("expanded")}
        aria-label="show share qr code"
        className="fixed z-10"
        style={{
          top: 24,
          right: 24,
          padding: "0.4rem 0.7rem",
          background: "var(--background)",
          border: "1px solid var(--text-hint)",
          cursor: "pointer",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--type-size-meta)",
          color: "var(--text-tertiary)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          lineHeight: 1.2,
          display: "inline-flex",
          alignItems: "center",
          gap: "0.55rem",
          transition: "opacity 0.3s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "0.7";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
      >
        <svg
          viewBox="0 0 16 16"
          width="14"
          height="14"
          aria-hidden="true"
          style={{ display: "block", flexShrink: 0 }}
        >
          {/* Sparse 4x4 grid that reads as "QR" without simulating a real one */}
          <g fill="currentColor">
            <rect x="0" y="0" width="3" height="3" />
            <rect x="4" y="0" width="3" height="3" />
            <rect x="13" y="0" width="3" height="3" />
            <rect x="0" y="4" width="3" height="3" />
            <rect x="9" y="4" width="3" height="3" />
            <rect x="4" y="9" width="3" height="3" />
            <rect x="13" y="9" width="3" height="3" />
            <rect x="0" y="13" width="3" height="3" />
            <rect x="9" y="13" width="3" height="3" />
          </g>
        </svg>
        show qr
      </button>

      {/* Expanded / max modal */}
      {state !== "collapsed" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            animation: "fadeIn 0.3s ease forwards",
          }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.92)" }}
            onClick={() => setState("collapsed")}
          />

          {/* Close button - opacity-led hover, system close glyph */}
          <button
            onClick={() => setState("collapsed")}
            aria-label="close"
            className="absolute"
            style={{
              top: 20,
              right: 24,
              fontSize: 22,
              lineHeight: 1,
              padding: 4,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              color: "var(--text-primary)",
              zIndex: 60,
              transition: "opacity 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.7";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            &times;
          </button>

          {/* Centered QR + caption stack */}
          <div
            className="relative flex flex-col items-center"
            style={{ zIndex: 55, gap: "var(--s-5)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: state === "max" ? "1rem" : "1.25rem",
                background: "var(--background)",
                border: "1px solid var(--border)",
                lineHeight: 0,
                transition: "all 0.3s ease",
              }}
            >
              <QRCodeSVG
                value={SHARE_URL}
                // Use viewport-aware sizing for max mode so it works on any device.
                size={state === "max" ? 1200 : 320}
                style={
                  state === "max"
                    ? {
                        width: "min(85vw, 85vh)",
                        height: "min(85vw, 85vh)",
                      }
                    : undefined
                }
                fgColor="rgba(0,0,0,0.85)"
                bgColor="#ffffff"
                level="M"
                marginSize={0}
              />
            </div>

            {/* URL caption - mono, lowercase, system voice */}
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--type-size-meta)",
                color: "var(--text-tertiary)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                textAlign: "center",
                lineHeight: 1.6,
              }}
            >
              becoming-crossings
              <br />
              <span style={{ color: "var(--text-hint)" }}>
                oulipo.xyz/becoming-crossings
              </span>
            </div>

            {/* Bigger / smaller toggle - text label per system */}
            <button
              onClick={() => setState(state === "max" ? "expanded" : "max")}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--type-size-meta)",
                color: "var(--text-secondary)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                background: "none",
                border: "1px solid var(--text-hint)",
                padding: "0.45rem 0.8rem",
                cursor: "pointer",
                transition: "opacity 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.7";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
            >
              {state === "max" ? "make smaller" : "make bigger"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
