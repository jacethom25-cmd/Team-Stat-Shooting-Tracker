// Small, dependency-free SVG line chart. Dates are plotted as evenly spaced
// categorical points (not a true time axis) since practices aren't evenly
// spaced on the calendar -- this keeps points readable even after byes/breaks.
const PALETTE = ['#3b82f6', '#f5a524', '#2ecc71', '#e14ed0']

export default function LineChart({ series, refLines = [], height = 260, valueSuffix = '' }) {
  const width = 640
  const padLeft = 46
  const padRight = 16
  const padTop = 14
  const padBottom = 34
  const plotW = width - padLeft - padRight
  const plotH = height - padTop - padBottom

  const allDates = Array.from(
    new Set(series.flatMap((s) => s.points.map((p) => p.date)))
  ).sort()

  const allValues = [
    ...series.flatMap((s) => s.points.map((p) => p.value)),
    ...refLines.map((r) => r.value),
  ].filter((v) => v !== null && v !== undefined && !Number.isNaN(v))

  if (allDates.length === 0 || allValues.length === 0) {
    return <p className="muted small">No data points in this range yet.</p>
  }

  let min = Math.min(...allValues)
  let max = Math.max(...allValues)
  if (min === max) { min -= 1; max += 1 }
  const span = max - min
  min -= span * 0.08
  max += span * 0.08

  const xFor = (date) => {
    const idx = allDates.indexOf(date)
    return allDates.length > 1 ? padLeft + (idx / (allDates.length - 1)) * plotW : padLeft + plotW / 2
  }
  const yFor = (value) => padTop + plotH - ((value - min) / (max - min)) * plotH

  // Show at most ~7 x-axis labels so dates don't overlap on a long season.
  const labelStep = Math.max(1, Math.ceil(allDates.length / 7))

  return (
    <div>
      {series.length > 1 && (
        <div className="row" style={{ gap: 14, marginBottom: 6 }}>
          {series.map((s, i) => (
            <span key={s.name} className="small" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color || PALETTE[i % PALETTE.length], display: 'inline-block' }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Trend line chart">
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + plotH} stroke="var(--border)" strokeWidth="1" />
        <line x1={padLeft} y1={padTop + plotH} x2={padLeft + plotW} y2={padTop + plotH} stroke="var(--border)" strokeWidth="1" />

        {[min + span * 0.08, (min + max) / 2, max - span * 0.08].map((v, i) => (
          <text key={i} x={padLeft - 6} y={yFor(v) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">
            {Math.round(v * 10) / 10}{valueSuffix}
          </text>
        ))}

        {refLines.map((r, i) => (
          <g key={i}>
            <line x1={padLeft} y1={yFor(r.value)} x2={padLeft + plotW} y2={yFor(r.value)} stroke={r.color || 'var(--muted)'} strokeWidth="1" strokeDasharray="4 3" />
            <text x={padLeft + plotW} y={yFor(r.value) - 3} textAnchor="end" fontSize="10" fill={r.color || 'var(--muted)'}>{r.label}</text>
          </g>
        ))}

        {allDates.map((d, i) => (
          i % labelStep === 0 && (
            <text key={d} x={xFor(d)} y={height - 10} textAnchor="middle" fontSize="9" fill="var(--muted)">
              {d.slice(5)}
            </text>
          )
        ))}

        {series.map((s, si) => {
          const color = s.color || PALETTE[si % PALETTE.length]
          const pts = s.points.filter((p) => p.value !== null && p.value !== undefined && !Number.isNaN(p.value))
          if (pts.length === 0) return null
          const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p.date)} ${yFor(p.value)}`).join(' ')
          return (
            <g key={s.name}>
              <path d={path} fill="none" stroke={color} strokeWidth="2" />
              {pts.map((p) => (
                <circle key={p.date} cx={xFor(p.date)} cy={yFor(p.value)} r="3" fill={color}>
                  <title>{p.date}: {p.value}{valueSuffix}</title>
                </circle>
              ))}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
