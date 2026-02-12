"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Canvas } from "@/components/Canvas";
import { ContentOverlay } from "@/components/ContentOverlay";
import { Counter } from "@/components/Counter";
import { About } from "@/components/About";
import { Gallery } from "@/components/Gallery";
import { uploadCrossing } from "@/lib/supabase";
import type { Intersection, Segment } from "@/lib/types";

export default function Home() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [intersections, setIntersections] = useState<Intersection[]>([]);
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const [openedSections, setOpenedSections] = useState<Set<number>>(new Set());
  const [dotToStory] = useState<Map<number, number>>(() => new Map());
  const [storiesRead, setStoriesRead] = useState(0);
  const storiesReadRef = useRef(0);
  const [showGallery, setShowGallery] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasUploadedRef = useRef(false);

  const handleIntersectionFound = useCallback(
    (intersection: Intersection) => {
      setIntersections((prev) => {
        if (prev.length >= 7) return prev;
        return [...prev, intersection];
      });
    },
    []
  );

  // Auto-upload canvas screenshot when 7th dot appears
  useEffect(() => {
    if (intersections.length < 7 || hasUploadedRef.current) return;
    hasUploadedRef.current = true;

    // Small delay so the 7th dot renders on canvas first
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Canvas already has lines drawn by the Canvas component.
      // The dots are DOM overlays, so we need to draw them onto
      // the canvas pixel data for the screenshot.
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dw = canvas.clientWidth;
      const dh = canvas.clientHeight;

      for (let i = 0; i < intersections.length; i++) {
        const { nx, ny } = intersections[i].point;
        ctx.beginPath();
        ctx.arc(nx * dw, ny * dh, 7, 0, Math.PI * 2);
        ctx.fillStyle = "#000000";
        ctx.fill();
      }

      canvas.toBlob((blob) => {
        if (blob) {
          uploadCrossing(blob).catch((err) => {
            console.error("Gallery upload failed:", err);
          });
        }
      }, "image/png");

      // Restore canvas (remove the dots we just drew)
      window.dispatchEvent(new Event("resize"));
    }, 500);

    return () => clearTimeout(timer);
  }, [intersections]);

  const handleDotClick = useCallback(
    (dotIndex: number) => {
      if (dotToStory.has(dotIndex)) {
        setActiveSection(dotToStory.get(dotIndex)!);
        return;
      }
      const storyIndex = storiesReadRef.current;
      if (storyIndex >= 7) return;
      dotToStory.set(dotIndex, storyIndex);
      storiesReadRef.current = storyIndex + 1;
      setStoriesRead(storyIndex + 1);
      setActiveSection(storyIndex);
      setOpenedSections((prev) => new Set(prev).add(dotIndex));
    },
    [dotToStory]
  );

  const handleCounterClick = useCallback(() => {
    const storyIndex = storiesReadRef.current;
    if (storyIndex >= 7) return;
    storiesReadRef.current = storyIndex + 1;
    setStoriesRead(storyIndex + 1);
    setActiveSection(storyIndex);
  }, []);

  const handleCloseSection = useCallback(() => {
    setActiveSection(null);
  }, []);

  const handleShowGallery = useCallback(() => {
    setShowGallery(true);
    setActiveSection(null);
  }, []);

  const hasStarted = segments.length > 1;

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <Canvas
        segments={segments}
        setSegments={setSegments}
        intersections={intersections}
        onIntersectionFound={handleIntersectionFound}
        onDotClick={handleDotClick}
        openedSections={openedSections}
        disabled={activeSection !== null}
        canvasRef={canvasRef}
      />

      {/* Title — visible on landing, fades out on first click */}
      <div
        className="fixed left-1/2 -translate-x-1/2 pointer-events-none select-none"
        style={{
          top: "calc(50% + 28px)",
          fontFamily: "'EB Garamond', Georgia, serif",
          fontSize: 15,
          letterSpacing: "0.12em",
          color: "rgba(0, 0, 0, 0.3)",
          opacity: hasStarted ? 0 : 1,
          transition: "opacity 0.6s ease",
        }}
      >
        Becoming Borders
      </div>

      {activeSection !== null && (
        <ContentOverlay
          sectionIndex={activeSection}
          onClose={handleCloseSection}
          onShowGallery={handleShowGallery}
          canvasRef={canvasRef}
          intersections={intersections}
          openedSections={openedSections}
        />
      )}

      {showGallery && (
        <Gallery onClose={() => setShowGallery(false)} />
      )}

      <Counter
        storiesRead={storiesRead}
        total={7}
        onCounterClick={handleCounterClick}
      />

      <About
        open={showAbout}
        onToggle={() => setShowAbout(!showAbout)}
        onShowGallery={() => {
          setShowAbout(false);
          setShowGallery(true);
        }}
      />
    </div>
  );
}
