"use client";

import { useState, useRef, useCallback } from "react";
import { Canvas } from "@/components/Canvas";
import { ContentOverlay } from "@/components/ContentOverlay";
import { Counter } from "@/components/Counter";
import { About } from "@/components/About";
import { Gallery } from "@/components/Gallery";
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

  const handleIntersectionFound = useCallback(
    (intersection: Intersection) => {
      setIntersections((prev) => {
        if (prev.length >= 7) return prev;
        return [...prev, intersection];
      });
    },
    []
  );

  const handleDotClick = useCallback(
    (dotIndex: number) => {
      // If this dot was already clicked, reopen its assigned story
      if (dotToStory.has(dotIndex)) {
        setActiveSection(dotToStory.get(dotIndex)!);
        return;
      }
      // Assign the next sequential story
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

  const handleDownload = useCallback(() => {
    // Called when section 7 auto-uploads the crossing
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
          onDownload={handleDownload}
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
