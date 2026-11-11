/** Small inline icons (24x24, stroke = currentColor). Decorative: aria-hidden. */
type P = { className?: string }
const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }

export const IconWallet = ({ className }: P) => (
  <svg {...base} className={className}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M16 14.5h2" /></svg>
)
export const IconDrop = ({ className }: P) => (
  <svg {...base} className={className}><path d="M3 6l6 6 4-4 8 8" /><path d="M15 16h6v-6" /></svg>
)
export const IconChart = ({ className }: P) => (
  <svg {...base} className={className}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
)
export const IconCoins = ({ className }: P) => (
  <svg {...base} className={className}><ellipse cx="9" cy="7" rx="6" ry="3" /><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7" /><path d="M15 11.5c3.2.2 6 1.4 6 3V18c0 1.7-2.7 3-6 3-2 0-3.8-.5-4.9-1.3" /></svg>
)
export const IconExit = ({ className }: P) => (
  <svg {...base} className={className}><path d="M14 4h5a1 1 0 011 1v14a1 1 0 01-1 1h-5" /><path d="M10 16l-4-4 4-4M6 12h10" /></svg>
)
export const IconPause = ({ className }: P) => (
  <svg {...base} className={className}><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
)
export const IconPlus = ({ className }: P) => (
  <svg {...base} className={className}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>
)
export const IconBolt = ({ className }: P) => (
  <svg {...base} className={className}><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></svg>
)
