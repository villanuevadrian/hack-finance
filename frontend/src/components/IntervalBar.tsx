interface Props {
  mean: number
  low: number
  high: number
  domain: [number, number]
  format: (x: number) => string
  label: string
}

const SEGMENTS = 20

/** Stat bar in segments. The credible interval lights up; the central estimate is a diamond. Never shows the mean alone. */
export function IntervalBar({ mean, low, high, domain, format, label }: Props) {
  const [d0, d1] = domain
  const frac = (v: number) => (Math.min(Math.max(v, d0), d1) - d0) / (d1 - d0)
  return (
    <div className="statbar" role="img" aria-label={`${label}: entre ${format(low)} y ${format(high)}, estimación central ${format(mean)}`}>
      <div className="segments">
        {Array.from({ length: SEGMENTS }, (_, i) => {
          const c = (i + 0.5) / SEGMENTS
          return <span key={i} className="seg" data-on={c >= frac(low) && c <= frac(high)} />
        })}
        <span className="diamond" style={{ left: `${frac(mean) * 100}%` }} />
      </div>
      <div className="statbar-ends"><span>{format(d0)}</span><span>{format(d1)}</span></div>
    </div>
  )
}
