/**
 * Moving background: soft colour lights drifting, small particles rising and a far city skyline sliding slowly.
 * Low opacity and behind everything, so it never competes with the text. Static with prefers-reduced-motion.
 */
export function Backdrop() {
  return (
    <div className="backdrop no-print" aria-hidden="true">
      <span className="blob b1" />
      <span className="blob b2" />
      <span className="blob b3" />
      <span className="blob b4" />
      <div className="particles">
        {Array.from({ length: 22 }, (_, i) => (
          <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${-(i * 1.7) % 18}s`, animationDuration: `${14 + (i % 5) * 3}s` }} />
        ))}
      </div>
      <div className="skyline far" />
      <div className="skyline near" />
    </div>
  )
}
