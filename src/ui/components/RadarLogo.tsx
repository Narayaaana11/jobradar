import React from 'react';

interface RadarLogoProps {
  className?: string;
  size?: number | string;
  color?: string;
}

export function RadarLogo({ className = 'w-5 h-5', size, color = 'currentColor' }: RadarLogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={color}
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M22,12a10.009,10.009,0,1,1-9-9.949v8.226a2,2,0,1,1-2,0V7.934A4.2,4.2,0,1,0,15,9.07V6.812a6,6,0,1,1-4-.722V4.069a7.993,7.993,0,1,0,4,.518V2.461A10.017,10.017,0,0,1,22,12Z" />
    </svg>
  );
}

export function RadarLogoBadge({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';
  const iconDim = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';

  return (
    <div className={`${dim} rounded-2xl bg-gradient-to-tr from-white via-zinc-200 to-zinc-600 p-[1px] flex items-center justify-center shadow-lg shadow-white/5 shrink-0`}>
      <div className="w-full h-full bg-black rounded-2xl flex items-center justify-center">
        <RadarLogo className={`${iconDim} text-white`} />
      </div>
    </div>
  );
}
