import React from 'react';

interface SafarLogoProps {
  variant?: 'light' | 'dark' | 'auto';
  showWordmark?: boolean;
  showSubtitle?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SafarMark: React.FC<{ size?: number; className?: string; inverted?: boolean }> = ({
  size = 36,
  className = '',
  inverted = false,
}) => {
  const strokePath1 = inverted ? '#A1D1CA' : '#142B3B';
  const strokePath2 = inverted ? '#4FA095' : '#24766F';
  const nodeStart = inverted ? '#E3E7E5' : '#142B3B';
  const nodeEnd = inverted ? '#4FA095' : '#24766F';
  const nodeMid = '#D7A45B';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Safar Saarthi navigation route symbol"
    >
      {/* Route Arc 1 */}
      <path
        d="M 28 12 C 28 8.8 25.5 6.5 22 6.5 C 16 6.5 11 10.8 11 16.5 C 11 23 18.5 22.5 19.5 25.5 C 20.2 27.8 18.5 30 15 30 C 12 30 9.8 28.5 9 25.5"
        stroke={strokePath1}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Route Arc 2 */}
      <path
        d="M 12 28 C 12 31.2 14.5 33.5 18 33.5 C 24 33.5 29 29.2 29 23.5 C 29 17 21.5 17.5 20.5 14.5 C 19.8 12.2 21.5 10 25 10 C 28 10 30.2 11.5 31 14.5"
        stroke={strokePath2}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Waypoint Nodes */}
      <circle cx="9" cy="25.5" r="2.2" fill={nodeStart} />
      <circle cx="31" cy="14.5" r="2.2" fill={nodeEnd} />
      <circle cx="20" cy="20" r="2.4" fill={nodeMid} />
    </svg>
  );
};

export const SafarLogo: React.FC<SafarLogoProps> = ({
  variant = 'light',
  showWordmark = true,
  showSubtitle = true,
  size = 'md',
  className = '',
}) => {
  const isDark = variant === 'dark';

  const markSizes = {
    sm: 28,
    md: 36,
    lg: 44,
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Geometric Symbol */}
      <div
        className={`rounded-xl flex items-center justify-center p-1.5 transition-transform group-hover:scale-[1.02] ${
          isDark
            ? 'bg-navy-900 border border-navy-800'
            : 'bg-white border border-[#E3E7E5] shadow-sm'
        }`}
      >
        <SafarMark size={markSizes[size]} inverted={isDark} />
      </div>

      {showWordmark && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black tracking-tight ${titleSizes[size]} ${
                isDark ? 'text-white' : 'text-[#142B3B]'
              }`}
            >
              Safar<span className={isDark ? 'text-[#4FA095]' : 'text-[#24766F]'}>Saarthi</span>
            </span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase ${
                isDark
                  ? 'bg-teal-900/60 text-[#84C0B6] border border-teal-800/80'
                  : 'bg-[#F0F8F7] text-[#24766F] border border-[#B4DAD4]'
              }`}
            >
              India
            </span>
          </div>
          {showSubtitle && (
            <span
              className={`text-[11px] font-medium tracking-wide ${
                isDark ? 'text-[#93ADBE]' : 'text-[#586875]'
              }`}
            >
              Multi-Modal Travel &amp; AI Planner
            </span>
          )}
        </div>
      )}
    </div>
  );
};
