"use client";

import { useState, useEffect, useCallback } from "react";
import { sections } from "@/lib/content";
import type { Intersection } from "@/lib/types";

interface ContentOverlayProps {
  sectionIndex: number;
  onClose: () => void;
  onShowGallery: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  intersections: Intersection[];
  openedSections: Set<number>;
}

/**
 * Seeded pseudo-random number generator (mulberry32).
 * Returns a function that produces deterministic values in [0, 1).
 */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface ScatteredImage {
  top: string;
  left: string;
  width: number;
}

function generateImagePositions(sectionIndex: number, count: number): ScatteredImage[] {
  const rand = seededRandom(sectionIndex * 7 + 31);
  const positions: ScatteredImage[] = [];

  const zones = [
    { xMin: -5, xMax: 25, yMin: 5, yMax: 65 },
    { xMin: 55, xMax: 85, yMin: 5, yMax: 65 },
    { xMin: 10, xMax: 40, yMin: -5, yMax: 20 },
    { xMin: 45, xMax: 80, yMin: 60, yMax: 85 },
    { xMin: 60, xMax: 90, yMin: -5, yMax: 25 },
  ];

  for (let i = 0; i < count; i++) {
    const zone = zones[(sectionIndex + i) % zones.length];
    const x = zone.xMin + rand() * (zone.xMax - zone.xMin);
    const y = zone.yMin + rand() * (zone.yMax - zone.yMin);
    const w = 320 + Math.floor(rand() * 120);

    positions.push({
      left: `${x.toFixed(1)}%`,
      top: `${y.toFixed(1)}%`,
      width: w,
    });
  }

  return positions;
}

export function ContentOverlay({
  sectionIndex,
  onClose,
  onShowGallery,
  canvasRef,
  intersections,
  openedSections,
}: ContentOverlayProps) {
  const [visible, setVisible] = useState(false);
  const section = sections[sectionIndex];
  const isNoticeSection = sectionIndex === 6;
  const imagePositions = generateImagePositions(sectionIndex, section.images.length);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setVisible(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dw = canvas.clientWidth;
    const dh = canvas.clientHeight;

    // Draw dots onto canvas for the screenshot
    for (let i = 0; i < intersections.length; i++) {
      const { nx, ny } = intersections[i].point;
      const isOpened = openedSections.has(i);
      ctx.beginPath();
      ctx.arc(nx * dw, ny * dh, 7, 0, Math.PI * 2);
      if (isOpened) {
        ctx.fillStyle = "transparent";
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.fillStyle = "#000000";
        ctx.fill();
      }
    }

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `crossing-${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Restore canvas
    window.dispatchEvent(new Event("resize"));
  }, [canvasRef, intersections, openedSections]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 0.5s ease",
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(255, 255, 255, 0.85)" }}
        onClick={onClose}
      />

      {/* Scattered images */}
      {imagePositions.map((pos, i) => {
        const imageSrc = section.images[i];
        if (!imageSrc) return null;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={imageSrc}
            alt=""
            className="absolute pointer-events-none"
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
              height: "auto",
              objectFit: "cover",
              boxShadow: "0 1px 6px rgba(0, 0, 0, 0.08)",
              opacity: visible ? 1 : 0,
              transition: `opacity 0.5s ease ${0.15 + i * 0.1}s`,
              zIndex: 51,
            }}
          />
        );
      })}

      {/* Content rectangle */}
      <div
        className="relative"
        style={{
          maxWidth: 420,
          width: "90vw",
          backgroundColor: "#ffffff",
          border: "1px solid #000000",
          padding: "45px",
          zIndex: 52,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.5s ease 0.05s",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute"
          style={{
            top: 14,
            right: 18,
            fontSize: 18,
            lineHeight: 1,
            cursor: "pointer",
            background: "none",
            border: "none",
            fontFamily: "'EB Garamond', Georgia, serif",
            color: "#000000",
            padding: "4px",
          }}
          aria-label="Close"
        >
          &times;
        </button>

        {/* Section text */}
        <div
          style={{
            fontFamily: "'EB Garamond', Georgia, serif",
            fontSize: 17,
            lineHeight: 1.6,
            whiteSpace: "pre-line",
            color: "#000000",
          }}
        >
          {section.text}
        </div>

        {/* Section 7 (index 6) — download + gallery */}
        {isNoticeSection && (
          <div style={{ marginTop: 28 }}>
            <button
              onClick={handleDownload}
              style={{
                fontFamily: "'EB Garamond', Georgia, serif",
                fontSize: 15,
                lineHeight: 1.6,
                padding: "12px 20px",
                border: "1px solid #000000",
                backgroundColor: "transparent",
                cursor: "pointer",
                transition: "box-shadow 0.25s ease",
                color: "#000000",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 2px 8px rgba(0, 0, 0, 0.15)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }}
            >
              Save a screenshot of my quilt of crossings
            </button>

            <div
              style={{
                marginTop: 20,
                opacity: 0,
                animation: "fadeIn 0.5s ease 0.5s forwards",
              }}
            >
              <span
                onClick={onShowGallery}
                style={{
                  fontFamily: "'EB Garamond', Georgia, serif",
                  fontSize: 15,
                  lineHeight: 1.6,
                  cursor: "pointer",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                  color: "#000000",
                }}
              >
                See others&rsquo; crossings
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
