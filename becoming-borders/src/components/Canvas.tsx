"use client";

import React, { useEffect, useCallback, useRef, useState } from "react";
import type { Segment, Intersection, NormalizedPoint } from "@/lib/types";
import { findIntersections } from "@/lib/geometry";

interface CanvasProps {
  segments: Segment[];
  setSegments: React.Dispatch<React.SetStateAction<Segment[]>>;
  intersections: Intersection[];
  onIntersectionFound: (intersection: Intersection) => void;
  onDotClick: (index: number) => void;
  openedSections: Set<number>;
  disabled: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

/** The initial horizontal line: centered vertically, ~35% of viewport width. */
function createInitialSegment(): Segment {
  const margin = (1 - 0.35) / 2;
  return {
    start: { nx: margin, ny: 0.5 },
    end: { nx: 1 - margin, ny: 0.5 },
  };
}

export function Canvas({
  segments,
  setSegments,
  intersections,
  onIntersectionFound,
  onDotClick,
  openedSections,
  disabled,
  canvasRef,
}: CanvasProps) {
  const lastEndpointRef = useRef<NormalizedPoint | null>(null);
  const hasInitializedRef = useRef(false);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // ---------------------------------------------------------------
  // Initialization: create the initial segment once on mount
  // ---------------------------------------------------------------
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const initial = createInitialSegment();
    setSegments([initial]);
    lastEndpointRef.current = initial.end;
  }, [setSegments]);

  // ---------------------------------------------------------------
  // Resize handler: update canvas dimensions with devicePixelRatio
  // ---------------------------------------------------------------
  useEffect(() => {
    function handleResize() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      setSize({ w, h });
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [canvasRef]);

  // ---------------------------------------------------------------
  // Drawing: redraw all segments whenever segments or size change
  // ---------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = size;
    if (w === 0 || h === 0) return;

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";

    for (const seg of segments) {
      ctx.beginPath();
      ctx.moveTo(seg.start.nx * w, seg.start.ny * h);
      ctx.lineTo(seg.end.nx * w, seg.end.ny * h);
      ctx.stroke();
    }
  }, [segments, size, canvasRef]);

  // ---------------------------------------------------------------
  // Click / touch handler: draw new line, detect intersections
  // ---------------------------------------------------------------
  const handleCanvasInteraction = useCallback(
    (clientX: number, clientY: number) => {
      if (disabled) return;
      if (!lastEndpointRef.current) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      const nx = (clientX - rect.left) / w;
      const ny = (clientY - rect.top) / h;
      const clickPoint: NormalizedPoint = { nx, ny };

      const newSegment: Segment = {
        start: { ...lastEndpointRef.current },
        end: clickPoint,
      };

      // Check intersections against ALL existing segments
      const hits = findIntersections(newSegment, segments);

      // Commit the new segment
      setSegments((prev) => [...prev, newSegment]);
      lastEndpointRef.current = clickPoint;

      // Report intersections (up to 7 total)
      let runningCount = intersections.length;
      for (const point of hits) {
        if (runningCount >= 7) break;
        onIntersectionFound({ point });
        runningCount++;
      }
    },
    [disabled, segments, intersections.length, canvasRef, setSegments, onIntersectionFound]
  );

  // ---------------------------------------------------------------
  // Dot click handler with hit-area check
  // ---------------------------------------------------------------
  const handleDotInteraction = useCallback(
    (clientX: number, clientY: number): boolean => {
      const canvas = canvasRef.current;
      if (!canvas) return false;

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const hitRadius = 20; // 40px diameter hit area

      for (let i = 0; i < intersections.length; i++) {
        const intersection = intersections[i];
        const px = intersection.point.nx * w + rect.left;
        const py = intersection.point.ny * h + rect.top;
        const dx = clientX - px;
        const dy = clientY - py;

        if (dx * dx + dy * dy <= hitRadius * hitRadius) {
          onDotClick(i);
          return true;
        }
      }

      return false;
    },
    [intersections, canvasRef, onDotClick]
  );

  // ---------------------------------------------------------------
  // Wrapper handlers that check dots first, then draw
  // ---------------------------------------------------------------
  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const hitDot = handleDotInteraction(e.clientX, e.clientY);
      if (hitDot) return;

      // Only forward to canvas drawing if the click was on the canvas itself
      if ((e.target as HTMLElement).tagName === "CANVAS") {
        handleCanvasInteraction(e.clientX, e.clientY);
      }
    },
    [handleDotInteraction, handleCanvasInteraction]
  );

  const handleContainerTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.changedTouches.length === 0) return;
      const touch = e.changedTouches[0];

      const hitDot = handleDotInteraction(touch.clientX, touch.clientY);
      if (hitDot) {
        e.preventDefault();
        return;
      }

      if ((e.target as HTMLElement).tagName === "CANVAS") {
        handleCanvasInteraction(touch.clientX, touch.clientY);
      }
    },
    [handleDotInteraction, handleCanvasInteraction]
  );

  // ---------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------
  return (
    <div
      className="absolute inset-0 w-screen h-screen"
      onClick={handleContainerClick}
      onTouchEnd={handleContainerTouchEnd}
    >
      {/* The canvas itself — click/touch handled by container */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none"
        style={{ cursor: disabled ? "default" : "crosshair" }}
      />

      {/* Intersection dots overlaid as absolutely-positioned divs */}
      {intersections.map((intersection, i) => {
        const isOpened = openedSections.has(i);
        const px = intersection.point.nx * size.w;
        const py = intersection.point.ny * size.h;

        return (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={{
              left: px,
              top: py,
              transform: "translate(-50%, -50%)",
            }}
          >
            {/* Hit area — invisible, but captures pointer events */}
            <div
              className="absolute pointer-events-auto cursor-pointer"
              style={{
                width: 40,
                height: 40,
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                borderRadius: "50%",
              }}
              role="button"
              tabIndex={0}
              aria-label={`Open story`}
              onClick={(e) => {
                e.stopPropagation();
                onDotClick(i);
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onDotClick(i);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onDotClick(i);
                }
              }}
            />

            {/* Visible dot: solid black + pulse when unread, hollow ring when opened */}
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                backgroundColor: isOpened ? "transparent" : "#000",
                border: isOpened
                  ? "1.5px solid rgba(0,0,0,0.3)"
                  : "1.5px solid #000",
                pointerEvents: "none",
                transition:
                  "background-color 0.4s ease, border-color 0.4s ease",
                animation: isOpened
                  ? "none"
                  : `pulse 2s ease-in-out ${i * 0.35}s infinite`,
              }}
            />
          </div>
        );
      })}

      {/* Pulse animation keyframes */}
      <style jsx>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.5);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(0, 0, 0, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
          }
        }
      `}</style>
    </div>
  );
}
