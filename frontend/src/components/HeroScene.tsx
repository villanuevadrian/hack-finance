/**
 * Animated hero of the welcome screen: a floating island where a column grows each month, a little player
 * hops from top to top and a cloud drifts by. Pure SVG + CSS, decorative only; still with reduced motion.
 */
const HEIGHTS = [120, 95, 70, 88, 112, 140]

export function HeroScene() {
  return (
    <svg className="hero-scene" viewBox="0 0 520 440" aria-hidden="true">
      <defs>
        <linearGradient id="hs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b3aa8" />
          <stop offset="1" stopColor="#1a1440" />
        </linearGradient>
        <linearGradient id="hs-col" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4cc3ff" />
          <stop offset="1" stopColor="#3b2f86" />
        </linearGradient>
        <radialGradient id="hs-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffc94a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffc94a" stopOpacity="0" />
        </radialGradient>
        <clipPath id="hs-clip"><rect width="520" height="440" rx="36" /></clipPath>
      </defs>
      <g clipPath="url(#hs-clip)">
        <rect width="520" height="440" fill="url(#hs-sky)" />
        <circle cx="420" cy="90" r="90" fill="url(#hs-glow)" />
        <circle cx="420" cy="90" r="30" fill="#ffe7a3" />
        {Array.from({ length: 26 }, (_, i) => (
          <circle key={i} className="hs-star" cx={(i * 97) % 520} cy={(i * 53) % 200} r={(i % 3) * 0.6 + 0.8} style={{ animationDelay: `${(i % 7) * 0.4}s` }} />
        ))}
        <g className="hs-cloud">
          <ellipse cx="120" cy="96" rx="46" ry="20" fill="#f4f1ff" opacity="0.85" />
          <ellipse cx="150" cy="84" rx="34" ry="22" fill="#f4f1ff" opacity="0.85" />
          <ellipse cx="92" cy="92" rx="26" ry="15" fill="#f4f1ff" opacity="0.85" />
        </g>
        <g className="hs-island">
          <path d="M60 330 Q260 300 460 330 L420 360 Q260 420 100 360 Z" fill="#2b2463" />
          <path d="M100 360 Q260 420 420 360 L330 430 Q260 450 190 430 Z" fill="#1d1846" />
          <path d="M60 330 Q260 300 460 330 Q260 350 60 330 Z" fill="#3ddc97" opacity="0.85" />
          {HEIGHTS.map((h, i) => (
            <g key={i} transform={`translate(${108 + i * 54},322)`}>
              <rect className="hs-col" x="-18" y={-h} width="36" height={h} rx="5" fill="url(#hs-col)" style={{ animationDelay: `${i * 0.9}s` }} />
              <rect className="hs-cap" x="-20" y={-h - 6} width="40" height="8" rx="3" fill="#f4f1ff" style={{ animationDelay: `${i * 0.9}s` }} />
            </g>
          ))}
          <g className="hs-flag" transform="translate(388,136)">
            <rect x="0" y="0" width="3" height="40" fill="#f4f1ff" />
            <path d="M3 2 L26 9 L3 16 Z" fill="#ffc94a" />
          </g>
          <g className="hs-player">
            <ellipse cx="0" cy="2" rx="12" ry="3" fill="#000" opacity="0.3" />
            <rect x="-9" y="-30" width="18" height="28" rx="8" fill="#ff8a3d" />
            <circle cx="0" cy="-38" r="11" fill="#ff8a3d" />
            <rect x="-8" y="-41" width="16" height="5" rx="2.5" fill="#4cc3ff" />
          </g>
        </g>
      </g>
    </svg>
  )
}
