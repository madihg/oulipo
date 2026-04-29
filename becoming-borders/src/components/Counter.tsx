"use client";

interface CounterProps {
  storiesRead: number;
  total: number;
  activeSection: number | null;
  onCounterClick: () => void;
  onCardClick?: (sectionIndex: number) => void;
}

/**
 * Bottom strip of numbered crossings - inspired by the as-the-hydra
 * poem strip aesthetic. Each card represents one of seven crossings.
 *
 * States per card:
 *   locked   - not yet drawn. Hairline-light border, hint color, hover
 *              advances to the next unread story (preserving the old
 *              counter-click skip affordance).
 *   unlocked - already read. Full --border, --text-primary, clickable
 *              to revisit.
 *   active   - currently shown in the modal. Full opacity. Other cards
 *              drop to 0.5 (system principle 04: selection by contrast
 *              collapse).
 */
export function Counter({
  storiesRead,
  total,
  activeSection,
  onCounterClick,
  onCardClick,
}: CounterProps) {
  const allRead = storiesRead >= total;
  const hasActive = activeSection !== null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
      {/* Wordmark reveal after all 7 crossings */}
      <div
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 15,
          letterSpacing: "0.12em",
          color: "var(--text-tertiary)",
          marginBottom: 12,
          opacity: allRead ? 1 : 0,
          transition: "opacity 0.8s ease",
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}
      >
        becoming crossings
      </div>

      {/* Numbered crossings strip */}
      <div className="flex items-center" style={{ gap: 6 }}>
        {Array.from({ length: total }, (_, i) => {
          const isRead = i < storiesRead;
          const isActive = activeSection === i;
          // contrast collapse: when a section is active, others fade
          const muted = hasActive && !isActive;
          const handleClick = isRead ? () => onCardClick?.(i) : onCounterClick;

          return (
            <button
              key={i}
              onClick={handleClick}
              style={{
                minWidth: 38,
                padding: "0.4rem 0.55rem",
                background: "var(--background)",
                border: `1px solid ${
                  isActive || isRead ? "var(--border)" : "var(--border-light)"
                }`,
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--type-size-meta)",
                color: isRead ? "var(--text-primary)" : "var(--text-hint)",
                letterSpacing: "0.05em",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1.2,
                opacity: muted ? 0.5 : 1,
                transition:
                  "opacity 0.3s ease, border-color 0.3s ease, color 0.3s ease",
              }}
              onMouseEnter={(e) => {
                if (!muted) e.currentTarget.style.opacity = "0.7";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = muted ? "0.5" : "1";
              }}
              aria-label={
                isRead ? `revisit crossing ${i + 1}` : `open next crossing`
              }
              aria-current={isActive ? "true" : undefined}
            >
              {String(i + 1).padStart(2, "0")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
