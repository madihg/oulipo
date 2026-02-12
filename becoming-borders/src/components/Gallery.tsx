"use client";

import { useState, useEffect } from "react";
import { fetchCrossings } from "@/lib/supabase";

interface GalleryProps {
  onClose: () => void;
}

export function Gallery({ onClose }: GalleryProps) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const urls = await fetchCrossings();
      if (!cancelled) {
        setImages(urls);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-white animate-fade-in flex flex-col"
      style={{ overflowY: "auto" }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 20,
          right: 24,
          fontSize: 22,
          lineHeight: 1,
          cursor: "pointer",
          background: "none",
          border: "none",
          fontFamily: "'EB Garamond', Georgia, serif",
          color: "#000000",
          padding: "4px",
          zIndex: 10,
          transition: "opacity 0.3s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = "0.5";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = "1";
        }}
        aria-label="Close gallery"
      >
        &times;
      </button>

      {/* Title */}
      <h1
        style={{
          fontFamily: "'EB Garamond', Georgia, serif",
          fontSize: 22,
          fontWeight: 400,
          letterSpacing: "0.1em",
          textAlign: "center",
          marginTop: 64,
          marginBottom: 12,
          color: "#000000",
        }}
      >
        Crossing Gallery
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontFamily: "'EB Garamond', Georgia, serif",
          fontSize: 14,
          fontStyle: "italic",
          letterSpacing: "0.02em",
          textAlign: "center",
          color: "rgba(0, 0, 0, 0.5)",
          marginBottom: 48,
          lineHeight: 1.8,
        }}
      >
        A collective archive of crossings
      </p>

      {/* Content area */}
      <div
        style={{
          flex: 1,
          padding: "0 32px 64px 32px",
          maxWidth: 1200,
          width: "100%",
          margin: "0 auto",
        }}
      >
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 200,
            }}
          >
            <p
              style={{
                fontFamily: "'EB Garamond', Georgia, serif",
                fontSize: 15,
                color: "rgba(0, 0, 0, 0.4)",
                letterSpacing: "0.05em",
              }}
            >
              Loading crossings&hellip;
            </p>
          </div>
        ) : images.length === 0 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 200,
            }}
          >
            <p
              style={{
                fontFamily: "'EB Garamond', Georgia, serif",
                fontSize: 15,
                color: "rgba(0, 0, 0, 0.4)",
                letterSpacing: "0.05em",
              }}
            >
              No crossings yet. Be the first to leave a trace.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 24,
            }}
          >
            {images.map((url, index) => (
              <div
                key={url}
                onClick={() => setSelectedImage(url)}
                style={{
                  border: "1px solid #000000",
                  backgroundColor: "#ffffff",
                  boxShadow: "0 1px 6px rgba(0, 0, 0, 0.08)",
                  cursor: "pointer",
                  transition: "box-shadow 0.3s ease, transform 0.3s ease",
                  overflow: "hidden",
                  opacity: 0,
                  animation: `fadeIn 0.5s ease ${0.05 * Math.min(index, 20)}s forwards`,
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.boxShadow = "3px 4px 15px rgba(0, 0, 0, 0.15)";
                  el.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.boxShadow = "0 1px 6px rgba(0, 0, 0, 0.08)";
                  el.style.transform = "translateY(0)";
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Crossing ${index + 1}`}
                  style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                    aspectRatio: "16 / 9",
                    objectFit: "cover",
                  }}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image lightbox */}
      {selectedImage && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255, 255, 255, 0.92)",
            animation: "fadeIn 0.3s ease forwards",
          }}
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImage(null);
            }}
            style={{
              position: "absolute",
              top: 20,
              right: 24,
              fontSize: 24,
              lineHeight: 1,
              cursor: "pointer",
              background: "none",
              border: "none",
              fontFamily: "'EB Garamond', Georgia, serif",
              color: "#000000",
              padding: "4px",
              zIndex: 61,
            }}
            aria-label="Close image"
          >
            &times;
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "90vw",
              maxHeight: "85vh",
              border: "1px solid #000000",
              boxShadow: "3px 4px 15px rgba(0, 0, 0, 0.15)",
              backgroundColor: "#ffffff",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage}
              alt="Crossing detail"
              style={{
                maxWidth: "90vw",
                maxHeight: "85vh",
                display: "block",
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
