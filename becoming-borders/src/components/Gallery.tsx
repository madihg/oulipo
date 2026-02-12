"use client";

interface GalleryProps {
  onClose: () => void;
}

export function Gallery({ onClose }: GalleryProps) {
  return (
    <div className="fixed inset-0 z-50 bg-white animate-fade-in flex flex-col">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 font-serif text-[18px] text-gray-50 hover:text-black transition-colors duration-300 bg-transparent border-none cursor-pointer leading-none p-1 z-10"
        aria-label="Close gallery"
      >
        &times;
      </button>

      {/* Title */}
      <h1 className="font-serif text-[22px] tracking-wide text-center mt-16 mb-12 font-normal">
        Crossing Gallery
      </h1>

      {/* Placeholder content */}
      <div className="flex-1 flex items-start justify-center">
        <p className="font-serif text-[14px] text-gray-50 tracking-open">
          Gallery will show others&rsquo; crossings here.
        </p>
      </div>
    </div>
  );
}
