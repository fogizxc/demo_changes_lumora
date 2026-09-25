import React from 'react';

export interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'light' | 'dark' | 'on-dark';
  showTagline?: boolean;
  taglineText?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'dark',
  showTagline = true,
  taglineText = 'ONE SYSTEM. MORE POSSIBILITIES.',
  align = 'left',
  className = '',
}) => {
  const isDarkBg = variant === 'on-dark' || variant === 'light';

  const sizeClasses = {
    xs: 'text-base',
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
    '2xl': 'text-5xl',
  };

  const taglineSizeClasses = {
    xs: 'text-[7px]',
    sm: 'text-[8px]',
    md: 'text-[9.5px]',
    lg: 'text-[11px]',
    xl: 'text-xs',
    '2xl': 'text-sm',
  };

  const alignClasses = {
    left: 'items-start text-left',
    center: 'items-center text-center',
    right: 'items-end text-right',
  };

  return (
    <div className={`flex flex-col select-none ${alignClasses[align]} ${className}`}>
      <div
        className={`inline-flex items-center font-extrabold tracking-[0.14em] uppercase leading-none ${
          isDarkBg ? 'text-white' : 'text-[#141414]'
        } ${sizeClasses[size]}`}
        style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
      >
        <span>LUM</span>

        {/* Signature O: Hollow circular ring with distinctive top-right red accent arc */}
        <span
          className="inline-flex items-center justify-center relative mx-[0.04em] shrink-0"
          style={{
            width: '0.86em',
            height: '0.86em',
            verticalAlign: '-0.02em',
          }}
        >
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Base segment (dark or white) from ~3:00 through bottom and left up to 12 o'clock */}
            <path
              d="M 91.85 63.60 A 44 44 0 1 1 50 6 L 50 21.5 A 28.5 28.5 0 1 0 77.11 58.81 Z"
              fill="currentColor"
            />
            {/* Signature Red Accent Arc from 12 o'clock to ~2:30/3:00 */}
            <path
              d="M 50 6 A 44 44 0 0 1 91.85 63.60 L 77.11 58.81 A 28.5 28.5 0 0 0 50 21.5 Z"
              fill="#E5233D"
            />
          </svg>
        </span>

        <span>RA</span>
      </div>

      {showTagline && (
        <span
          className={`${taglineSizeClasses[size]} uppercase tracking-[0.24em] font-bold mt-1 block whitespace-nowrap ${
            isDarkBg ? 'text-[#8EA2B8]' : 'text-[#524B44]'
          }`}
          style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
        >
          {taglineText}
        </span>
      )}
    </div>
  );
};

