interface AppMarkProps {
  className?: string;
}

export default function AppMark({ className }: AppMarkProps) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="am-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5B9BFF" />
          <stop offset="0.55" stopColor="#4A52EA" />
          <stop offset="1" stopColor="#7B3FDA" />
        </linearGradient>
        <linearGradient id="am-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.42" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" fill="url(#am-bg)" />
      <path d="M0 0H512V236C400 192 112 192 0 236Z" fill="url(#am-gloss)" />
      <g transform="rotate(-90 256 256)" fill="none" strokeWidth="56" strokeLinecap="round">
        <circle cx="256" cy="256" r="120" stroke="#FFFFFF" strokeOpacity="0.18" />
        <circle cx="256" cy="256" r="120" stroke="#7CF2A8" strokeDasharray="230 524" strokeDashoffset="0" />
        <circle cx="256" cy="256" r="120" stroke="#FFD866" strokeDasharray="180 574" strokeDashoffset="-304" />
        <circle cx="256" cy="256" r="120" stroke="#FF8FB3" strokeDasharray="122 632" strokeDashoffset="-558" />
      </g>
    </svg>
  );
}
