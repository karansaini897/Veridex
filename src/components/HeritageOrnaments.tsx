import React from 'react';

/**
 * Reusable Indian Heritage-Inspired Ornamental Primitives
 * Palette anchored on the reference specification:
 * - Espresso Brown: #241B12
 * - Terracotta Red: #9E2919
 * - Antique Gold:   #C7A56A
 * - Sage Green:     #789783
 * - Warm Ivory:     #F1E8D8
 *
 * All decorative elements strictly enforce `pointer-events-none` and `aria-hidden="true"`
 * so they never block clicks, focus, or form controls.
 */

export const HeritageEmbroideredBorder: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  return (
    <div
      aria-hidden="true"
      className={`w-full h-2.5 pointer-events-none overflow-hidden select-none relative ${className}`}
    >
      <svg
        className="w-full h-full block"
        preserveAspectRatio="none"
        viewBox="0 0 1200 12"
        fill="none"
      >
        <defs>
          <pattern
            id="veridex-heritage-embroidery"
            x="0"
            y="0"
            width="48"
            height="12"
            patternUnits="userSpaceOnUse"
          >
            {/* Top and bottom fine antique gold threads */}
            <line x1="0" y1="1" x2="48" y2="1" stroke="#C7A56A" strokeWidth="1" strokeOpacity="0.75" />
            <line x1="0" y1="11" x2="48" y2="11" stroke="#C7A56A" strokeWidth="1" strokeOpacity="0.65" />
            {/* Alternating Terracotta Red & Sage Green embroidered diamonds */}
            <polygon points="8,6 14,2 20,6 14,10" fill="#9E2919" fillOpacity="0.88" />
            <polygon points="8,6 14,2 20,6 14,10" stroke="#C7A56A" strokeWidth="0.75" />
            <circle cx="14" cy="6" r="1.3" fill="#F1E8D8" />
            {/* Connecting gold chevron stitches */}
            <path d="M0 6 L5 3 L5 9 Z" fill="#C7A56A" fillOpacity="0.6" />
            <path d="M22 3 L26 6 L22 9" stroke="#C7A56A" strokeWidth="1" fill="none" />
            {/* Sage green botanical diamond */}
            <polygon points="30,6 36,2.2 42,6 36,9.8" fill="#789783" fillOpacity="0.85" />
            <polygon points="30,6 36,2.2 42,6 36,9.8" stroke="#C7A56A" strokeWidth="0.75" />
            <circle cx="36" cy="6" r="1.2" fill="#241B12" />
            <circle cx="25" cy="6" r="1.1" fill="#C7A56A" />
            <circle cx="46" cy="6" r="1.1" fill="#C7A56A" />
          </pattern>
        </defs>
        <rect width="1200" height="12" fill="url(#veridex-heritage-embroidery)" />
      </svg>
    </div>
  );
};

export const HeritageSectionDivider: React.FC<{
  className?: string;
  compact?: boolean;
}> = ({ className = '', compact = false }) => {
  return (
    <div
      aria-hidden="true"
      className={`w-full flex items-center justify-center pointer-events-none select-none ${
        compact ? 'my-3' : 'my-6'
      } ${className}`}
    >
      <svg
        className={compact ? 'w-64 sm:w-80 h-6' : 'w-80 sm:w-[460px] h-8'}
        viewBox="0 0 460 32"
        fill="none"
      >
        {/* Left tapering antique-gold & terracotta line */}
        <line x1="10" y1="16" x2="176" y2="16" stroke="#C7A56A" strokeWidth="1.25" strokeOpacity="0.8" />
        <line x1="45" y1="19" x2="170" y2="19" stroke="#9E2919" strokeWidth="0.75" strokeOpacity="0.55" />
        {/* Left diamond accents */}
        <polygon points="184,16 190,11 196,16 190,21" fill="#9E2919" stroke="#C7A56A" strokeWidth="1" />
        <polygon points="164,16 168,13 172,16 168,19" fill="#789783" />
        <circle cx="154" cy="16" r="1.8" fill="#C7A56A" />

        {/* Center Lotus / Botanical Heritage Medallion */}
        <g transform="translate(230, 16)">
          {/* Outer lotus petals */}
          <path
            d="M0 -13 C4 -8, 6 -4, 0 0 C-6 -4, -4 -8, 0 -13 Z"
            fill="#C7A56A"
            stroke="#9E2919"
            strokeWidth="0.8"
          />
          <path
            d="M0 13 C4 8, 6 4, 0 0 C-6 4, -4 8, 0 13 Z"
            fill="#C7A56A"
            stroke="#9E2919"
            strokeWidth="0.8"
          />
          <path
            d="M-12 -6 C-6 -7, -3 -3, 0 0 C-5 2, -9 0, -12 -6 Z"
            fill="#789783"
            stroke="#C7A56A"
            strokeWidth="0.7"
          />
          <path
            d="M12 -6 C6 -7, 3 -3, 0 0 C5 2, 9 0, 12 -6 Z"
            fill="#789783"
            stroke="#C7A56A"
            strokeWidth="0.7"
          />
          <path
            d="M-12 6 C-6 7, -3 3, 0 0 C-5 -2, -9 0, -12 6 Z"
            fill="#9E2919"
            stroke="#C7A56A"
            strokeWidth="0.7"
          />
          <path
            d="M12 6 C6 7, 3 3, 0 0 C5 -2, 9 0, 12 6 Z"
            fill="#9E2919"
            stroke="#C7A56A"
            strokeWidth="0.7"
          />
          <circle cx="0" cy="0" r="3.2" fill="#F1E8D8" stroke="#9E2919" strokeWidth="1" />
          <circle cx="-20" cy="0" r="2" fill="#C7A56A" />
          <circle cx="20" cy="0" r="2" fill="#C7A56A" />
        </g>

        {/* Right diamond accents */}
        <polygon points="264,16 270,11 276,16 270,21" fill="#9E2919" stroke="#C7A56A" strokeWidth="1" />
        <polygon points="288,16 292,13 296,16 292,19" fill="#789783" />
        <circle cx="306" cy="16" r="1.8" fill="#C7A56A" />

        {/* Right tapering antique-gold & terracotta line */}
        <line x1="284" y1="16" x2="450" y2="16" stroke="#C7A56A" strokeWidth="1.25" strokeOpacity="0.8" />
        <line x1="290" y1="19" x2="415" y2="19" stroke="#9E2919" strokeWidth="0.75" strokeOpacity="0.55" />
      </svg>
    </div>
  );
};

export const HeritageCornerOrnament: React.FC<{
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size?: 'sm' | 'md';
}> = ({ position, size = 'md' }) => {
  const posClasses = {
    'top-left': 'top-1 left-1',
    'top-right': 'top-1 right-1 scale-x-[-1]',
    'bottom-left': 'bottom-1 left-1 scale-y-[-1]',
    'bottom-right': 'bottom-1 right-1 scale-[-1]',
  }[position];

  const dim = size === 'sm' ? 'w-7 h-7' : 'w-10 h-10';

  return (
    <svg
      aria-hidden="true"
      className={`absolute ${posClasses} ${dim} pointer-events-none select-none z-20`}
      viewBox="0 0 44 44"
      fill="none"
    >
      {/* Outer corner bracket in Antique Gold */}
      <path
        d="M2 38 L2 6 C2 3.8 3.8 2 6 2 L38 2"
        stroke="#C7A56A"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Inner corner bracket in Terracotta Red */}
      <path
        d="M6 32 L6 9 C6 7.3 7.3 6 9 6 L32 6"
        stroke="#9E2919"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Corner botanical jewel */}
      <polygon points="6,6 13,4 16,11 11,16 4,13" fill="#9E2919" stroke="#C7A56A" strokeWidth="1" />
      <circle cx="9.5" cy="9.5" r="2" fill="#F1E8D8" />
      {/* Sage green leaf flourishes */}
      <path d="M16 7 C20 5, 24 6, 26 9 C22 10, 18 9, 16 7 Z" fill="#789783" />
      <path d="M7 16 C5 20, 6 24, 9 26 C10 22, 9 18, 7 16 Z" fill="#789783" />
      <circle cx="29" cy="6" r="1.4" fill="#C7A56A" />
      <circle cx="6" cy="29" r="1.4" fill="#C7A56A" />
    </svg>
  );
};

export const HeritageAmbientPattern: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none"
    >
      {/* Top-Left Botanical / Mandala Filigree */}
      <svg
        className="Include-heritage-mandala absolute -top-24 -left-24 w-96 h-96 opacity-[0.06] dark:opacity-[0.09] text-[#9E2919] dark:text-[#C7A56A]"
        viewBox="0 0 240 240"
        fill="none"
      >
        <circle cx="120" cy="120" r="108" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
        <circle cx="120" cy="120" r="88" stroke="#9E2919" strokeWidth="1.2" />
        <circle cx="120" cy="120" r="64" stroke="#789783" strokeWidth="1.2" />
        <circle cx="120" cy="120" r="36" stroke="currentColor" strokeWidth="1.5" />
        {Array.from({ length: 12 }).map((_, idx) => {
          const angle = idx * 30;
          return (
            <g key={angle} transform={`rotate(${angle} 120 120)`}>
              <path
                d="M120 12 C128 32, 128 52, 120 68 C112 52, 112 32, 120 12 Z"
                stroke="currentColor"
                strokeWidth="1.1"
                fill="#9E2919"
                fillOpacity="0.18"
              />
              <circle cx="120" cy="24" r="2.2" fill="currentColor" />
            </g>
          );
        })}
      </svg>

      {/* Top-Right Botanical / Mandala Filigree */}
      <svg
        className="absolute -top-24 -right-24 w-96 h-96 opacity-[0.06] dark:opacity-[0.09] text-[#789783] dark:text-[#C7A56A]"
        viewBox="0 0 240 240"
        fill="none"
      >
        <circle cx="120" cy="120" r="108" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
        <circle cx="120" cy="120" r="84" stroke="#9E2919" strokeWidth="1.2" />
        <circle cx="120" cy="120" r="56" stroke="currentColor" strokeWidth="1.2" />
        {Array.from({ length: 12 }).map((_, idx) => {
          const angle = idx * 30;
          return (
            <g key={angle} transform={`rotate(${angle} 120 120)`}>
              <path
                d="M120 14 C127 34, 127 50, 120 64 C113 50, 113 34, 120 14 Z"
                stroke="currentColor"
                strokeWidth="1.1"
                fill="#789783"
                fillOpacity="0.18"
              />
            </g>
          );
        })}
      </svg>

      {/* Bottom Corner Folk Floral Vine Accents */}
      <svg
        className="hidden xl:block absolute bottom-8 left-6 w-52 h-52 opacity-[0.055] dark:opacity-[0.08] text-[#C7A56A]"
        viewBox="0 0 160 160"
        fill="none"
      >
        <path
          d="M8 152 L8 42 C8 22 22 8 42 8 L152 8"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="6 4"
        />
        <path
          d="M20 140 C20 75, 75 20, 140 20"
          stroke="#9E2919"
          strokeWidth="1.5"
        />
        <circle cx="32" cy="32" r="10" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="32" cy="32" r="4" fill="#789783" />
      </svg>
    </div>
  );
};
