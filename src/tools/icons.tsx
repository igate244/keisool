// ツールのアイコン（線画SVG、色はCSSの currentColor）
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const IconSignal = () => (
  <svg viewBox="0 0 24 24" {...P}>
    <path d="M3 17h3l3-10 4 12 3-8h5" />
    <circle cx="21" cy="11" r="0.6" fill="currentColor" />
  </svg>
);

export const IconRtd = () => (
  <svg viewBox="0 0 24 24" {...P}>
    <path d="M10 4a2 2 0 0 1 4 0v10.3a4 4 0 1 1-4 0Z" />
    <path d="M12 17.5V9" />
    <path d="M17 6h3M17 9h3M17 12h2" />
  </svg>
);

export const IconTc = () => (
  <svg viewBox="0 0 24 24" {...P}>
    <path d="M5 21V9l6 6" />
    <path d="M19 21V9l-6 6" />
    <circle cx="12" cy="15.5" r="1.4" fill="currentColor" />
    <path d="M12 3c1.6 1.6 1.6 3 0 4.6C10.4 6 10.4 4.6 12 3Z" />
  </svg>
);

export const IconUnit = () => (
  <svg viewBox="0 0 24 24" {...P}>
    <path d="M4 8h13l-3-3M20 16H7l3 3" />
  </svg>
);

export const IconLevel = () => (
  <svg viewBox="0 0 24 24" {...P}>
    <path d="M4 4v15a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V4" />
    <path d="M4 12c2 1 3-1 5.5 0S13 13 15 12" />
    <path d="M15 17h4v3M19 8h-4" />
  </svg>
);

export const IconStar = ({ on }: { on?: boolean }) => (
  <svg viewBox="0 0 24 24" {...P} fill={on ? 'currentColor' : 'none'}>
    <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z" />
  </svg>
);

export const IconBack = () => (
  <svg viewBox="0 0 24 24" {...P}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const IconSearch = () => (
  <svg viewBox="0 0 24 24" {...P}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </svg>
);

export const IconGrid = () => (
  <svg viewBox="0 0 24 24" {...P}>
    <rect x="4" y="4" width="7" height="7" rx="2" />
    <rect x="13" y="4" width="7" height="7" rx="2" />
    <rect x="4" y="13" width="7" height="7" rx="2" />
    <rect x="13" y="13" width="7" height="7" rx="2" />
  </svg>
);

export const IconHistory = () => (
  <svg viewBox="0 0 24 24" {...P}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5" />
    <path d="M4 4v4.5h4.5M12 8v4.5l3 2" />
  </svg>
);

export const IconGear = () => (
  <svg viewBox="0 0 24 24" {...P}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" />
  </svg>
);

export const IconWork = () => (
  <svg viewBox="0 0 24 24" {...P}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="m8 12 2.5 2.5L16 9" />
  </svg>
);

export const IconMemo = () => (
  <svg viewBox="0 0 24 24" {...P}>
    <path d="M6 3.5h9l3.5 3.5V20a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5Z" />
    <path d="M9 10h6M9 14h6M9 18h3" />
  </svg>
);

export const IconPid = () => (
  <svg viewBox="0 0 24 24" {...P}>
    <path d="M3 18h3c2 0 2-10 5-10s2.5 6 4.5 6S17 11 19 11h2" />
    <path d="M3 11h18" strokeDasharray="2 2.5" opacity="0.6" />
  </svg>
);
