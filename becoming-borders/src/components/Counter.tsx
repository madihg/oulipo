"use client";

interface CounterProps {
  storiesRead: number;
  total: number;
  onCounterClick: () => void;
}

export function Counter({ storiesRead, total, onCounterClick }: CounterProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
      {Array.from({ length: total }, (_, i) => {
        const isRead = i < storiesRead;
        return (
          <button
            key={i}
            onClick={isRead ? undefined : onCounterClick}
            disabled={isRead}
            style={{
              width: 18,
              height: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              background: "none",
              padding: 0,
              cursor: isRead ? "default" : "pointer",
              fontFamily: "'EB Garamond', Georgia, serif",
              fontSize: 14,
              color: isRead ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.5)",
              transition: "color 0.3s ease",
            }}
            aria-label={isRead ? `Story ${i + 1} read` : `Open next story`}
          >
            {isRead ? (
              // X mark for read stories
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              >
                <line x1="1" y1="1" x2="9" y2="9" />
                <line x1="9" y1="1" x2="1" y2="9" />
              </svg>
            ) : (
              // Circle for unread stories
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
              >
                <circle cx="5" cy="5" r="4" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
