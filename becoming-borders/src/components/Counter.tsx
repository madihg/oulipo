"use client";

interface CounterProps {
  current: number;
  total: number;
}

export function Counter({ current, total }: CounterProps) {
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 font-serif text-[14px] text-gray-50 tracking-open pointer-events-none select-none"
    >
      {current} of {total}
    </div>
  );
}
