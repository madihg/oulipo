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
      {/* About label */}
      <button
        onClick={onToggle}
        className="fixed bottom-6 left-6 font-serif text-[13px] text-gray-50 tracking-open cursor-pointer bg-transparent border-none p-0 hover:text-black transition-colors duration-300 z-10"
      >
        about
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

            <p className="font-serif text-[13px] text-gray-50 mt-6 tracking-open">
              By Halim Madi.
            </p>

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
