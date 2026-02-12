"use client";

import { useState, useEffect, useCallback } from "react";
import { sections } from "@/lib/content";
import { uploadCrossing } from "@/lib/supabase";
import type { Intersection } from "@/lib/types";

interface ContentOverlayProps {
  sectionIndex: number;
  onClose: () => void;
  onDownload: () => void;
  onShowGallery: () => void;
  hasDownloaded: boolean;
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

  // Define zones that avoid the center rectangle area.
  // The center overlay is roughly max-width 420px centered,
  // so we scatter images in left/right margins and top/bottom edges.
  const zones = [
    // left column
    { xMin: 3, xMax: 18, yMin: 10, yMax: 75 },
    // right column
    { xMin: 76, xMax: 92, yMin: 10, yMax: 75 },
    // top-left
    { xMin: 5, xMax: 28, yMin: 3, yMax: 20 },
    // bottom-right
    { xMin: 68, xMax: 90, yMin: 72, yMax: 90 },
    // top-right
    { xMin: 72, xMax: 92, yMin: 3, yMax: 22 },
  ];

  for (let i = 0; i < count; i++) {
    const zone = zones[(sectionIndex + i) % zones.length];
    const x = zone.xMin + rand() * (zone.xMax - zone.xMin);
    const y = zone.yMin + rand() * (zone.yMax - zone.yMin);
    const w = 200 + Math.floor(rand() * 80); // 200-280

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
  onDownload,
  onShowGallery,
  hasDownloaded,
  canvasRef,
  intersections,
  openedSections,
}: ContentOverlayProps) {
  const [visible, setVisible] = useState(false);
  const section = sections[sectionIndex];
  const isNoticeSection = sectionIndex === 6;
  const imagePositions = generateImagePositions(sectionIndex, section.images.length);

  // Trigger fade-in after mount
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

    // The canvas uses devicePixelRatio scaling: canvas.width/height are
    // multiplied by dpr, but the context has a dpr transform applied via
    // setTransform(dpr, 0, 0, dpr, 0, 0). So we draw at display coordinates
    // (the transform handles scaling to physical pixels).
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    const dotRadius = 7; // 14px diameter / 2

    // Draw intersection dots onto the canvas
    for (let i = 0; i < intersections.length; i++) {
      const intersection = intersections[i];
      const cx = intersection.point.nx * displayWidth;
      const cy = intersection.point.ny * displayHeight;
      const isOpened = openedSections.has(i);

      ctx.beginPath();
      ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);

      if (isOpened) {
        // Hollow ring: 1.5px stroke, rgba(0,0,0,0.3)
        ctx.fillStyle = "transparent";
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // Filled black circle
        ctx.fillStyle = "#000000";
        ctx.fill();
      }
    }

    // Capture the image with dots included
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `crossing-${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Upload to Supabase gallery in the background (non-blocking)
    canvas.toBlob((blob) => {
      if (blob) {
        uploadCrossing(blob).catch((err) => {
          console.error("Gallery upload failed:", err);
        });
      }
    }, "image/png");

    // Restore canvas to lines-only state so the DOM overlay dots
    // don't double up with the dots we just drew. Dispatching a resize
    // event causes the Canvas component to re-run its draw effect,
    // which clears the canvas and redraws only the line segments.
    window.dispatchEvent(new Event("resize"));

    onDownload();
  }, [canvasRef, onDownload, intersections, openedSections]);

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

      {/* Scattered images outside the rectangle */}
      {imagePositions.map((pos, i) => {
        const imageSrc = section.images[i];
        if (!imageSrc) return null;
        return (
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
            lineHeight: 1.9,
            whiteSpace: "pre-line",
            color: "#000000",
          }}
        >
          {section.text}
        </div>

        {/* Section 7 (index 6) — download button */}
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

            {/* Post-download gallery link */}
            {hasDownloaded && (
              <div
                style={{
                  marginTop: 20,
                  opacity: visible ? 1 : 0,
                  transition: "opacity 0.5s ease",
                  animation: "fadeIn 0.5s ease forwards",
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
                  download and see others&rsquo; crossings
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
