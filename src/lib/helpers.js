// Shared date + math helpers used across pages.

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function startOfWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay() // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1 // treat Monday as start of week
  d.setDate(d.getDate() - diff)
  return d.toISOString().slice(0, 10)
}

export function endOfWeek(dateStr) {
  const start = new Date(startOfWeek(dateStr) + 'T00:00:00')
  start.setDate(start.getDate() + 6)
  return start.toISOString().slice(0, 10)
}

// Given a "period" (day | week | season) and an anchor date, return {start, end}
// to filter rows by practice_date / attempt_date / session_date / test_date.
export function periodRange(period, anchorDate, seasonStart) {
  if (period === 'day') return { start: anchorDate, end: anchorDate }
  if (period === 'week') return { start: startOfWeek(anchorDate), end: endOfWeek(anchorDate) }
  // season = from season start through today (or beyond, for future-dated entries)
  return { start: seasonStart || '2000-01-01', end: '2999-12-31' }
}

export function fmtPct(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return (n * 100).toFixed(1) + '%'
}

export function round1(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return 0
  return Math.round(n * 10) / 10
}

export function sum(arr, key) {
  return arr.reduce((acc, row) => acc + (Number(row[key]) || 0), 0)
}

export function avg(arr, key) {
  if (!arr.length) return 0
  return sum(arr, key) / arr.length
}

// Shooting drill Good/Great/PR classification for a single attempt.
export function classifyAttempt(makes, drill) {
  const flags = []
  if (drill.program_high !== null && drill.program_high !== undefined) {
    if (Number(makes) > Number(drill.program_high)) flags.push('pr')
  }
  if (drill.great !== null && drill.great !== undefined && Number(makes) >= Number(drill.great)) {
    flags.push('great')
  } else if (drill.standard !== null && drill.standard !== undefined && Number(makes) >= Number(drill.standard)) {
    flags.push('good')
  }
  return flags
}

// FT Ladder: standard = 16/20, great = 19 or 20 (>18)
export function classifyFtSession(makes) {
  const flags = []
  if (makes >= 19) flags.push('great')
  else if (makes >= 16) flags.push('good')
  return flags
}

export function positionGroups(players) {
  const groups = { PG: [], Wing: [], BIG: [] }
  players.forEach((p) => {
    if (!groups[p.position]) groups[p.position] = []
    groups[p.position].push(p)
  })
  return groups
}

export function playerName(p) {
  if (!p) return '—'
  return p.first_name ? `${p.first_name} ${p.last_name}` : p.last_name
}
