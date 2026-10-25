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
  size?: 'xs' | 'sm' | 'md' | 'lg';
}> = ({ position, size = 'md' }) => {
  const posClasses = {
    'top-left': 'top-0.5 left-0.5',
    'top-right': 'top-0.5 right-0.5 scale-x-[-1]',
    'bottom-left': 'bottom-0.5 left-0.5 scale-y-[-1]',
    'bottom-right': 'bottom-0.5 right-0.5 scale-[-1]',
  }[position];

  const dim = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  }[size];

  return (
    <svg
      aria-hidden="true"
      className={`absolute ${posClasses} ${dim} pointer-events-none select-none z-10`}
      viewBox="0 0 44 44"
      fill="none"
    >
      {/* Outer perimeter corner bracket in Antique Gold */}
      <path
        d="M2 38 L2 6 C2 3.8 3.8 2 6 2 L38 2"
        stroke="#C7A56A"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Inner perimeter corner bracket in Terracotta Red */}
      <path
        d="M5.5 28 L5.5 8.5 C5.5 6.8 6.8 5.5 8.5 5.5 L28 5.5"
        stroke="#9E2919"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      {/* Corner botanical jewel tucked strictly in corner margin */}
      <polygon points="4.5,4.5 11,3.5 13,10 10,13 3.5,11" fill="#9E2919" stroke="#C7A56A" strokeWidth="1" />
      <circle cx="7.8" cy="7.8" r="1.7" fill="#F1E8D8" />
      {/* Sage green perimeter leaf flourishes hugging edge */}
      <path d="M14 5.5 C18 3.8, 22 4.5, 24 7 C20 7.8, 16 7, 14 5.5 Z" fill="#789783" />
      <path d="M5.5 14 C3.8 18, 4.5 22, 7 24 C7.8 20, 7 16, 5.5 14 Z" fill="#789783" />
      <circle cx="28" cy="4.5" r="1.4" fill="#C7A56A" />
      <circle cx="4.5" cy="28" r="1.4" fill="#C7A56A" />
    </svg>
  );
};

export const HeritageCornerSet: React.FC<{
  size?: 'xs' | 'sm' | 'md' | 'lg';
}> = ({ size = 'md' }) => (
  <>
    <HeritageCornerOrnament position="top-left" size={size} />
    <HeritageCornerOrnament position="top-right" size={size} />
    <HeritageCornerOrnament position="bottom-left" size={size} />
    <HeritageCornerOrnament position="bottom-right" size={size} />
  </>
);

export const HeritageAmbientPattern: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none"
    >
      {/* Subtle Full-Viewport Indian Heritage Jaali & Floral Diamond Lattice (Tuned for high Light Mode clarity & balanced Dark Mode) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.22] dark:opacity-[0.07]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="veridex-ambient-jaali-lattice"
            width="96"
            height="96"
            patternUnits="userSpaceOnUse"
          >
            {/* Outer diamond lattice in Antique Gold */}
            <path
              d="M48 4 L92 48 L48 92 L4 48 Z"
              fill="none"
              stroke="#C7A56A"
              strokeWidth="1.15"
              strokeOpacity="0.85"
            />
            {/* Inner scalloped diamond in Terracotta Red */}
            <path
              d="M48 16 L80 48 L48 80 L16 48 Z"
              fill="none"
              stroke="#9E2919"
              strokeWidth="0.75"
              strokeDasharray="3 3"
              strokeOpacity="0.65"
            />
            {/* Center 4-petal botanical rosette in Sage Green & Terracotta */}
            <g transform="translate(48, 48)">
              <path d="M0 -8 C2.5 -4, 2.5 -2, 0 0 C-2.5 -2, -2.5 -4, 0 -8 Z" fill="#9E2919" fillOpacity="0.55" />
              <path d="M0 8 C2.5 4, 2.5 2, 0 0 C-2.5 2, -2.5 4, 0 8 Z" fill="#9E2919" fillOpacity="0.55" />
              <path d="M-8 0 C-4 2.5, -2 2.5, 0 0 C-2 -2.5, -4 -2.5, -8 0 Z" fill="#789783" fillOpacity="0.65" />
              <path d="M8 0 C4 2.5, 2 2.5, 0 0 C2 -2.5, 4 -2.5, 8 0 Z" fill="#789783" fillOpacity="0.65" />
              <circle cx="0" cy="0" r="2" fill="#C7A56A" />
            </g>
            {/* Corner intersection studs */}
            <circle cx="0" cy="0" r="2.2" fill="#C7A56A" fillOpacity="0.7" />
            <circle cx="96" cy="0" r="2.2" fill="#C7A56A" fillOpacity="0.7" />
            <circle cx="0" cy="96" r="2.2" fill="#C7A56A" fillOpacity="0.7" />
            <circle cx="96" cy="96" r="2.2" fill="#C7A56A" fillOpacity="0.7" />
            <circle cx="48" cy="4" r="1.6" fill="#789783" fillOpacity="0.75" />
            <circle cx="92" cy="48" r="1.6" fill="#9E2919" fillOpacity="0.65" />
            <circle cx="48" cy="92" r="1.6" fill="#789783" fillOpacity="0.75" />
            <circle cx="4" cy="48" r="1.6" fill="#9E2919" fillOpacity="0.65" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#veridex-ambient-jaali-lattice)" />
      </svg>

      {/* Top-Left Semicircular Ornamental Mandala Wheel — Continuously Rotating Around Its Own Center */}
      <div className="absolute -top-28 -left-28 w-[420px] h-[420px] pointer-events-none select-none">
        <svg
          data-testid="heritage-top-left-wheel"
          className="w-full h-full heritage-corner-wheel-spin opacity-[0.44] dark:opacity-[0.17]"
          viewBox="0 0 240 240"
          fill="none"
        >
          <circle cx="120" cy="120" r="114" stroke="#C7A56A" strokeWidth="1.6" strokeDasharray="3 3" />
          <circle cx="120" cy="120" r="108" stroke="#9E2919" strokeWidth="1.8" />
          <circle cx="120" cy="120" r="96" stroke="#C7A56A" strokeWidth="1.2" strokeDasharray="6 3" />
          <circle cx="120" cy="120" r="86" stroke="#789783" strokeWidth="1.5" />
          <circle cx="120" cy="120" r="64" stroke="#9E2919" strokeWidth="1.4" />
          <circle cx="120" cy="120" r="40" stroke="#C7A56A" strokeWidth="1.8" />
          <circle cx="120" cy="120" r="18" stroke="#9E2919" strokeWidth="1.5" fill="#C7A56A" fillOpacity="0.18" />
          {Array.from({ length: 16 }).map((_, idx) => {
            const angle = idx * 22.5;
            const isEven = idx % 2 === 0;
            return (
              <g key={angle} transform={`rotate(${angle} 120 120)`}>
                {/* Radial wheel spoke */}
                <line x1="120" y1="18" x2="120" y2="102" stroke="#C7A56A" strokeWidth="1" strokeOpacity="0.8" />
                {/* Outer lotus petal */}
                <path
                  d="M120 10 C127 28, 127 48, 120 64 C113 48, 113 28, 120 10 Z"
                  stroke={isEven ? '#9E2919' : '#C7A56A'}
                  strokeWidth="1.2"
                  fill={isEven ? '#9E2919' : '#789783'}
                  fillOpacity="0.24"
                />
                {/* Inner diamond spoke motif */}
                <polygon
                  points="120,66 124,76 120,86 116,76"
                  fill={isEven ? '#C7A56A' : '#9E2919'}
                  fillOpacity="0.45"
                  stroke="#C7A56A"
                  strokeWidth="0.8"
                />
                {/* Rim jewel bead */}
                <circle cx="120" cy="20" r="2.3" fill={isEven ? '#9E2919' : '#789783'} stroke="#C7A56A" strokeWidth="0.7" />
              </g>
            );
          })}
          <circle cx="120" cy="120" r="7" fill="#9E2919" stroke="#C7A56A" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Top-Right Semicircular Ornamental Mandala Wheel — Continuously Rotating Around Its Own Center */}
      <div className="absolute -top-28 -right-28 w-[420px] h-[420px] pointer-events-none select-none">
        <svg
          data-testid="heritage-top-right-wheel"
          className="w-full h-full heritage-corner-wheel-spin-reverse opacity-[0.44] dark:opacity-[0.17]"
          viewBox="0 0 240 240"
          fill="none"
        >
          <circle cx="120" cy="120" r="114" stroke="#C7A56A" strokeWidth="1.6" strokeDasharray="3 3" />
          <circle cx="120" cy="120" r="108" stroke="#789783" strokeWidth="1.8" />
          <circle cx="120" cy="120" r="96" stroke="#C7A56A" strokeWidth="1.2" strokeDasharray="6 3" />
          <circle cx="120" cy="120" r="84" stroke="#9E2919" strokeWidth="1.5" />
          <circle cx="120" cy="120" r="60" stroke="#C7A56A" strokeWidth="1.4" />
          <circle cx="120" cy="120" r="38" stroke="#789783" strokeWidth="1.8" />
          <circle cx="120" cy="120" r="18" stroke="#9E2919" strokeWidth="1.5" fill="#789783" fillOpacity="0.18" />
          {Array.from({ length: 16 }).map((_, idx) => {
            const angle = idx * 22.5;
            const isEven = idx % 2 === 0;
            return (
              <g key={angle} transform={`rotate(${angle} 120 120)`}>
                <line x1="120" y1="18" x2="120" y2="102" stroke="#C7A56A" strokeWidth="1" strokeOpacity="0.8" />
                <path
                  d="M120 12 C126.5 30, 126.5 48, 120 62 C113.5 48, 113.5 30, 120 12 Z"
                  stroke={isEven ? '#789783' : '#9E2919'}
                  strokeWidth="1.2"
                  fill={isEven ? '#789783' : '#9E2919'}
                  fillOpacity="0.24"
                />
                <polygon
                  points="120,64 124,74 120,84 116,74"
                  fill={isEven ? '#9E2919' : '#C7A56A'}
                  fillOpacity="0.45"
                  stroke="#C7A56A"
                  strokeWidth="0.8"
                />
                <circle cx="120" cy="21" r="2.3" fill={isEven ? '#789783' : '#9E2919'} stroke="#C7A56A" strokeWidth="0.7" />
              </g>
            );
          })}
          <circle cx="120" cy="120" r="7" fill="#789783" stroke="#C7A56A" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Bottom-Left Folk Floral & Geometric Arch Accent */}
      <svg
        className="absolute bottom-4 left-4 w-56 h-56 opacity-[0.34] dark:opacity-[0.12]"
        viewBox="0 0 180 180"
        fill="none"
      >
        <path
          d="M8 172 L8 44 C8 22 22 8 44 8 L172 8"
          stroke="#C7A56A"
          strokeWidth="2.2"
          strokeDasharray="6 4"
        />
        <path
          d="M18 160 L18 52 C18 32 32 18 52 18 L160 18"
          stroke="#9E2919"
          strokeWidth="1.5"
        />
        <path
          d="M28 148 C28 80, 80 28, 148 28"
          stroke="#789783"
          strokeWidth="1.4"
          strokeDasharray="4 4"
        />
        <circle cx="38" cy="38" r="14" stroke="#C7A56A" strokeWidth="1.6" fill="#9E2919" fillOpacity="0.16" />
        <polygon points="38,26 44,38 38,50 32,38" fill="#789783" fillOpacity="0.55" stroke="#C7A56A" strokeWidth="0.9" />
        <circle cx="38" cy="38" r="4" fill="#9E2919" />
      </svg>

      {/* Bottom-Right Folk Floral & Geometric Arch Accent */}
      <svg
        className="absolute bottom-4 right-4 w-56 h-56 opacity-[0.34] dark:opacity-[0.12] scale-x-[-1]"
        viewBox="0 0 180 180"
        fill="none"
      >
        <path
          d="M8 172 L8 44 C8 22 22 8 44 8 L172 8"
          stroke="#C7A56A"
          strokeWidth="2.2"
          strokeDasharray="6 4"
        />
        <path
          d="M18 160 L18 52 C18 32 32 18 52 18 L160 18"
          stroke="#9E2919"
          strokeWidth="1.5"
        />
        <path
          d="M28 148 C28 80, 80 28, 148 28"
          stroke="#789783"
          strokeWidth="1.4"
          strokeDasharray="4 4"
        />
        <circle cx="38" cy="38" r="14" stroke="#C7A56A" strokeWidth="1.6" fill="#789783" fillOpacity="0.16" />
        <polygon points="38,26 44,38 38,50 32,38" fill="#9E2919" fillOpacity="0.55" stroke="#C7A56A" strokeWidth="0.9" />
        <circle cx="38" cy="38" r="4" fill="#789783" />
      </svg>
    </div>
  );
};

