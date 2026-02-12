"use client";

import { useEffect, useState } from "react";

interface AboutProps {
  open: boolean;
  onToggle: () => void;
  onShowGallery: () => void;
  hasDownloaded: boolean;
}

export function About({ open, onToggle, onShowGallery, hasDownloaded }: AboutProps) {
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
      {/* Circle button */}
      <button
        onClick={onToggle}
        className="fixed z-10"
        style={{
          bottom: 24,
          left: 24,
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "1px solid rgba(0, 0, 0, 0.3)",
          background: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          transition: "border-color 0.3s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.8)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.3)";
        }}
        aria-label="About"
      >
        <span
          style={{
            fontFamily: "'EB Garamond', Georgia, serif",
            fontSize: 14,
            fontStyle: "italic",
            color: "rgba(0, 0, 0, 0.5)",
            lineHeight: 1,
            marginTop: 1,
          }}
        >
          i
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
          <div
            className="absolute inset-0 bg-white/80"
            onClick={onToggle}
          />

          {/* Panel */}
          <div className="relative bg-white border border-black px-10 py-12 max-w-[480px] w-[calc(100%-48px)] z-10">
            {/* Close button */}
            <button
              onClick={onToggle}
              className="absolute top-4 right-4 font-serif text-[18px] text-gray-50 hover:text-black transition-colors duration-300 bg-transparent border-none cursor-pointer leading-none p-1"
              aria-label="Close about panel"
            >
              &times;
            </button>

            {/* Content */}
            <p className="font-serif text-[15px] leading-[1.8] text-black tracking-open">
              Becoming Borders is an interactive piece exploring digital borders
              through the lens of migrant consciousness. Each line you draw
              creates crossings &mdash; each crossing opens a passage.
            </p>

            <p
              className="font-serif text-[14px] text-gray-60 mt-6"
              style={{ lineHeight: 1.8 }}
            >
              By{" "}
              <a
                href="https://www.halimmadi.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "inherit",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
              >
                Halim Madi
              </a>
            </p>

            <div
              className="flex gap-4 mt-3"
              style={{ fontSize: 13 }}
            >
              <a
                href="https://www.halimmadi.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-serif text-gray-50 hover:text-black transition-colors duration-300"
                style={{
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
              >
                halimmadi.com
              </a>
              <a
                href="https://www.instagram.com/yalla_halim"
                target="_blank"
                rel="noopener noreferrer"
                className="font-serif text-gray-50 hover:text-black transition-colors duration-300"
                style={{
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
              >
                @yalla_halim
              </a>
            </div>

            {hasDownloaded && (
              <button
                onClick={onShowGallery}
                className="mt-8 font-serif text-[13px] text-gray-50 tracking-open underline underline-offset-4 bg-transparent border-none cursor-pointer p-0 hover:text-black transition-colors duration-300"
              >
                View crossing gallery
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
