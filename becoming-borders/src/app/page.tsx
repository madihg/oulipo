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
  const [hasDownloaded, setHasDownloaded] = useState(false);
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
      const storyIndex = dotToStory.size;
      dotToStory.set(dotIndex, storyIndex);
      setActiveSection(storyIndex);
      setOpenedSections((prev) => new Set(prev).add(dotIndex));
    },
    [dotToStory]
  );

  const handleCloseSection = useCallback(() => {
    setActiveSection(null);
  }, []);

  const handleDownload = useCallback(() => {
    setHasDownloaded(true);
  }, []);

  const handleShowGallery = useCallback(() => {
    setShowGallery(true);
    setActiveSection(null);
  }, []);

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

      {activeSection !== null && (
        <ContentOverlay
          sectionIndex={activeSection}
          onClose={handleCloseSection}
          onDownload={handleDownload}
          onShowGallery={handleShowGallery}
          hasDownloaded={hasDownloaded}
          canvasRef={canvasRef}
          intersections={intersections}
          openedSections={openedSections}
        />
      )}

      {showGallery && (
        <Gallery onClose={() => setShowGallery(false)} />
      )}

      <Counter current={intersections.length} total={7} />

      <About
        open={showAbout}
        onToggle={() => setShowAbout(!showAbout)}
        onShowGallery={() => {
          setShowAbout(false);
          setShowGallery(true);
        }}
        hasDownloaded={hasDownloaded}
      />
    </div>
  );
}
