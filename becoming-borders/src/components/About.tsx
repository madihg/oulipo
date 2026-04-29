"use client";

import { useEffect, useState } from "react";

interface AboutProps {
  open: boolean;
  onToggle: () => void;
  onShowGallery: () => void;
}

export function About({ open, onToggle, onShowGallery }: AboutProps) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setAnimating(true);
    } else if (visible) {
      setAnimating(false);
      const timeout = setTimeout(() => setVisible(false), 500);
      return () => clearTimeout(timeout);
    }
  }, [open, visible]);

  return (
    <>
      {/* Circle button — opacity-led hover per design system principle 05 */}
      <button
        onClick={onToggle}
        className="fixed z-10"
        style={{
          bottom: 24,
          left: 24,
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "1px solid var(--text-hint)",
          background: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          transition: "opacity 0.3s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "0.7";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
        aria-label="about"
      >
        <span
          style={{
            fontFamily: "'EB Garamond', Georgia, serif",
            fontSize: 14,
            color: "var(--text-tertiary)",
            lineHeight: 1,
            marginTop: 1,
          }}
        >
          ?
        </span>
      </button>

      {/* Overlay panel */}
      {visible && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center ${
            animating ? "animate-fade-in" : "animate-fade-out"
          }`}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-white/80" onClick={onToggle} />

          {/* Panel — hairline rule, no shadow, no rounded corners */}
          <div
            className="relative bg-white px-10 py-12 max-w-[480px] w-[calc(100%-48px)] z-10"
            style={{ border: "1px solid var(--border)" }}
          >
            {/* Close button — opacity hover only */}
            <button
              onClick={onToggle}
              className="absolute top-4 right-4 bg-transparent border-none cursor-pointer leading-none p-1"
              style={{
                fontFamily: "'EB Garamond', Georgia, serif",
                fontSize: 18,
                color: "var(--text-tertiary)",
                transition: "opacity 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.7";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
              aria-label="close"
            >
              &times;
            </button>

            {/* Body — EB Garamond, lowercase, hyphen-with-spaces */}
            <p
              style={{
                fontFamily: "'EB Garamond', Georgia, serif",
                fontSize: 15,
                lineHeight: 1.8,
                color: "var(--text-primary)",
                letterSpacing: "0.02em",
              }}
            >
              becoming crossings is an interactive piece exploring digital
              borders through the lens of migrant consciousness. each line you
              draw creates crossings - each crossing opens a passage.
            </p>

            {/* Attribution + links — mono caption per principle 03 */}
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--type-size-meta)",
                color: "var(--text-secondary)",
                marginTop: 24,
                lineHeight: 1.6,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              by{" "}
              <a
                href="https://www.halimmadi.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "inherit",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                  transition: "opacity 0.3s ease",
                }}
              >
                halim madi
              </a>
            </p>

            <div
              className="flex gap-4 mt-3"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--type-size-meta)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              <a
                href="https://www.halimmadi.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "var(--text-tertiary)",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                  transition: "opacity 0.3s ease",
                }}
              >
                halimmadi.com
              </a>
              <a
                href="https://www.instagram.com/yalla_halim"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "var(--text-tertiary)",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                  transition: "opacity 0.3s ease",
                }}
              >
                @yalla_halim
              </a>
            </div>

            <button
              onClick={onShowGallery}
              className="mt-8 bg-transparent border-none cursor-pointer p-0"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--type-size-meta)",
                color: "var(--text-tertiary)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                textDecoration: "underline",
                textUnderlineOffset: "4px",
                transition: "opacity 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.7";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
            >
              see all crossings
            </button>
          </div>
        </div>
      )}
    </>
  );
}
