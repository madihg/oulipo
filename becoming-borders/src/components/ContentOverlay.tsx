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
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
  transform?: string;
  width: number;
  height: number;
  isBackdrop?: boolean;
}

/**
 * Generate non-overlapping scattered image positions.
 *
 * - count 1: a single backdrop image, centered behind the text rectangle.
 *   Larger frame so the photo reads as the section's atmosphere.
 * - count 2-6: each image gets its own zone (TL, TR, MR, BR, BL, ML).
 *   Zones are rotated by sectionIndex so adjacent sections feel distinct
 *   rather than identical. A small seeded jitter (±15px) on width/height
 *   keeps the grid from looking mechanical.
 *
 * All sizes are in px. The CSS frame uses a 1px black border + B&W +
 * film-grain (see globals.css `.story-image-frame`).
 */
function generateImagePositions(
  sectionIndex: number,
  count: number,
): ScatteredImage[] {
  if (count === 0) return [];

  if (count === 1) {
    return [
      {
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        width: 880,
        height: 580,
        isBackdrop: true,
      },
    ];
  }

  const rand = seededRandom(sectionIndex * 13 + 7);

  // Six anchored zones around the viewport edges, well-separated from
  // each other and clear of the centered text rectangle (~520x460 visual
  // footprint at desktop). Anchors use left/right and top/bottom so
  // images stay flush to corners regardless of viewport width.
  const zones: Array<
    Pick<ScatteredImage, "left" | "right" | "top" | "bottom">
  > = [
    { left: "2.5%", top: "5%" }, //  0 TL
    { right: "2.5%", top: "5%" }, // 1 TR
    { right: "1.5%", top: "44%" }, // 2 MR
    { right: "2.5%", bottom: "6%" }, // 3 BR
    { left: "2.5%", bottom: "6%" }, //  4 BL
    { left: "1.5%", top: "44%" }, //   5 ML
  ];

  // Size scales with count: fewer images = larger frames.
  const dims =
    count <= 2
      ? { w: 480, h: 330 }
      : count <= 3
        ? { w: 430, h: 300 }
        : count <= 4
          ? { w: 400, h: 290 }
          : count <= 5
            ? { w: 360, h: 260 }
            : { w: 320, h: 230 };

  // Rotate the zone order per section so each story has its own scatter
  // pattern even when image counts match.
  const offset = sectionIndex % zones.length;
  const ordered = [...zones.slice(offset), ...zones.slice(0, offset)].slice(
    0,
    count,
  );

  return ordered.map((z) => ({
    ...z,
    width: dims.w + Math.floor(rand() * 30) - 15,
    height: dims.h + Math.floor(rand() * 20) - 10,
  }));
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
  const imagePositions = generateImagePositions(
    sectionIndex,
    section.images.length,
  );

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
          <div
            key={i}
            className={`story-image-frame absolute pointer-events-none${pos.isBackdrop ? " is-backdrop" : ""}`}
            style={{
              top: pos.top,
              left: pos.left,
              right: pos.right,
              bottom: pos.bottom,
              transform: pos.transform,
              width: pos.isBackdrop
                ? `min(${pos.width}px, 86vw)`
                : `min(${pos.width}px, 50vw)`,
              height: pos.isBackdrop
                ? `min(${pos.height}px, 78vh)`
                : `min(${pos.height}px, 40vh)`,
              opacity: visible ? 1 : 0,
              transition: `opacity 0.5s ease ${0.15 + i * 0.1}s`,
              zIndex: 51,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageSrc} alt="" />
          </div>
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
              save a screenshot of my quilt of crossings
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
                see others&rsquo; crossings
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
