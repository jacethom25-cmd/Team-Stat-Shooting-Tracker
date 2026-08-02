import { ZONES } from '../lib/zones'

// Half-court diagram with 7 zones. Coordinates below were computed with real
// trig (basket at 250,70; 3PT radius 230; straight corner segments where the
// arc would otherwise fold back on itself near the baseline) rather than
// hand-drawn, so every zone's edges line up exactly with its neighbors.
const SHAPES = {
  left_corner_3: { type: 'rect', x: 20, y: 20, w: 53.8, h: 197.8 },
  right_corner_3: { type: 'rect', x: 426.2, y: 20, w: 53.8, h: 197.8 },
  paint: { type: 'rect', x: 190, y: 20, w: 120, h: 240 },
  mid_range: {
    type: 'poly',
    points: '73.8,20 73.8,217.8 118.1,258.4 171.3,286.1 250,300 328.7,286.1 381.9,258.4 426.2,217.8 426.2,20',
  },
  left_wing_3: {
    type: 'poly',
    points: '73.8,217.8 118.1,258.4 171.3,286.1 108.1,460 73.8,460',
  },
  right_wing_3: {
    type: 'poly',
    points: '426.2,217.8 381.9,258.4 328.7,286.1 391.9,460 426.2,460',
  },
  top_key_3: {
    type: 'poly',
    points: '171.3,286.1 250,300 328.7,286.1 391.9,460 108.1,460',
  },
}

function colorFor(pct, attempts) {
  if (!attempts) return 'rgba(147,164,181,0.10)'
  if (pct >= 0.5) return 'rgba(46,204,113,0.55)'
  if (pct >= 0.35) return 'rgba(245,165,36,0.55)'
  return 'rgba(224,69,92,0.55)'
}

function Shape({ shape, fill, stroke, onClick }) {
  const common = { fill, stroke, strokeWidth: 1.5, style: { cursor: onClick ? 'pointer' : 'default' }, onClick }
  if (shape.type === 'rect') return <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} {...common} />
  return <polygon points={shape.points} {...common} />
}

function centerOf(shape) {
  if (shape.type === 'rect') return { x: shape.x + shape.w / 2, y: shape.y + shape.h / 2 }
  const pts = shape.points.trim().split(' ').map((p) => p.split(',').map(Number))
  return {
    x: pts.reduce((a, p) => a + p[0], 0) / pts.length,
    y: pts.reduce((a, p) => a + p[1], 0) / pts.length,
  }
}

export default function CourtDiagram({ zoneStats, onZoneClick, selectedZone, height = 440 }) {
  return (
    <svg viewBox="0 0 500 480" width="100%" height={height} role="img" aria-label="Half court shot chart divided into seven zones">
      <title>Shot chart court diagram</title>
      {/* decorative court lines, drawn first so zone fills sit on top */}
      <line x1="20" y1="20" x2="480" y2="20" stroke="var(--border)" strokeWidth="2" />
      <circle cx="250" cy="260" r="50" fill="none" stroke="var(--border)" strokeWidth="1.5" />
      <circle cx="250" cy="70" r="8" fill="none" stroke="var(--border)" strokeWidth="2" />

      {/* mid-range drawn before paint so paint visually "cuts out" its middle */}
      <Shape
        shape={SHAPES.mid_range}
        fill={zoneStats ? colorFor(
          zoneStats.mid_range?.attempts ? zoneStats.mid_range.makes / zoneStats.mid_range.attempts : 0,
          zoneStats.mid_range?.attempts || 0
        ) : (selectedZone === 'mid_range' ? 'rgba(245,165,36,0.45)' : 'rgba(147,164,181,0.10)')}
        stroke="var(--border)"
        onClick={onZoneClick ? () => onZoneClick('mid_range') : undefined}
      />

      {ZONES.filter((z) => z.key !== 'mid_range').map((zone) => {
        const stat = zoneStats?.[zone.key]
        const attempts = stat?.attempts || 0
        const makes = stat?.makes || 0
        const pct = attempts ? makes / attempts : 0
        const fill = zoneStats
          ? colorFor(pct, attempts)
          : selectedZone === zone.key ? 'rgba(245,165,36,0.45)' : 'rgba(147,164,181,0.10)'
        return (
          <Shape
            key={zone.key}
            shape={SHAPES[zone.key]}
            fill={fill}
            stroke="var(--border)"
            onClick={onZoneClick ? () => onZoneClick(zone.key) : undefined}
          />
        )
      })}

      {ZONES.map((zone) => {
        const stat = zoneStats?.[zone.key]
        const { x: cx, y: cy } = centerOf(SHAPES[zone.key])
        return (
          <g key={zone.key + '-label'} style={{ pointerEvents: 'none' }}>
            <text x={cx} y={cy - 6} textAnchor="middle" fontSize="12" fill="var(--text)" fontWeight="600">
              {zone.label}
            </text>
            {stat && (
              <text x={cx} y={cy + 12} textAnchor="middle" fontSize="12" fill="var(--text)">
                {stat.makes}/{stat.attempts}{stat.attempts ? ` (${Math.round((stat.makes / stat.attempts) * 100)}%)` : ''}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
