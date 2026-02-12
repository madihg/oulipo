"use client";

import { useState, useEffect } from "react";

interface CounterProps {
  storiesRead: number;
  total: number;
  onCounterClick: () => void;
}

export function Counter({ storiesRead, total, onCounterClick }: CounterProps) {
  const allRead = storiesRead >= total;
  const [showCrossings, setShowCrossings] = useState(false);

  // After "Becoming Borders" appears, morph "Borders" → "Crossings"
  useEffect(() => {
    if (!allRead) return;
    const timer = setTimeout(() => setShowCrossings(true), 1800);
    return () => clearTimeout(timer);
  }, [allRead]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
      {/* Title reveal after all 7 crossings */}
      <div
        style={{
          fontFamily: "'EB Garamond', Georgia, serif",
          fontSize: 15,
          letterSpacing: "0.12em",
          color: "rgba(0, 0, 0, 0.3)",
          marginBottom: 10,
          opacity: allRead ? 1 : 0,
          transition: "opacity 0.8s ease",
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}
      >
        <span>Becoming </span>
        <span style={{ position: "relative", display: "inline-block" }}>
          <span
            style={{
              opacity: showCrossings ? 0 : 1,
              transition: "opacity 0.8s ease",
            }}
          >
            Borders
          </span>
          <span
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              opacity: showCrossings ? 1 : 0,
              transition: "opacity 0.8s ease",
            }}
          >
            Crossings
          </span>
        </span>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center gap-3">
        {Array.from({ length: total }, (_, i) => {
          const isRead = i < storiesRead;
          return (
            <button
              key={i}
              onClick={isRead ? undefined : onCounterClick}
              disabled={isRead}
              style={{
                width: 18,
                height: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                background: "none",
                padding: 0,
                cursor: isRead ? "default" : "pointer",
                fontFamily: "'EB Garamond', Georgia, serif",
                fontSize: 14,
                color: isRead ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.5)",
                transition: "color 0.3s ease",
              }}
              aria-label={isRead ? `Story ${i + 1} read` : `Open next story`}
            >
              {isRead ? (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                >
                  <line x1="1" y1="1" x2="9" y2="9" />
                  <line x1="9" y1="1" x2="1" y2="9" />
                </svg>
              ) : (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                >
                  <circle cx="5" cy="5" r="4" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
