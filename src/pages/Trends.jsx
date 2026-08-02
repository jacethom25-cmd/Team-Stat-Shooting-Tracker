import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { todayISO, playerName } from '../lib/helpers'
import LineChart from '../components/LineChart'
import { getAllSeasons, getCurrentSeason } from '../lib/seasons'

const PRACTICE_STATS = [
  { key: 'pts', label: 'Points', pct: false },
  { key: 'reb', label: 'Rebounds', pct: false },
  { key: 'ast', label: 'Assists', pct: false },
  { key: 'stl', label: 'Steals', pct: false },
  { key: 'blk', label: 'Blocks', pct: false },
  { key: 'turnovers', label: 'Turnovers', pct: false },
  { key: 'power5', label: 'Power 5', pct: false },
  { key: 'plus_minus', label: '+/-', pct: false },
  { key: 'efg_pct', label: 'eFG%', pct: true },
  { key: 'three_pct', label: '3PT%', pct: true },
  { key: 'ft_pct', label: 'FT%', pct: true },
]

const FT_STANDARD = 16
const FT_GREAT = 19

function daysAgoISO(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export default function Trends() {
  const [metricType, setMetricType] = useState('practice')
  const [allPlayers, setAllPlayers] = useState([])
  const [playerId, setPlayerId] = useState('team')
  const [practiceStatKey, setPracticeStatKey] = useState('pts')
  const [drills, setDrills] = useState([])
  const [drillId, setDrillId] = useState('')
  const [fromDate, setFromDate] = useState(daysAgoISO(90))
  const [toDate, setToDate] = useState(todayISO())
  const [seasons, setSeasons] = useState([])
  const [seasonFilter, setSeasonFilter] = useState('')

  const [practiceRows, setPracticeRows] = useState([])
  const [shootingRows, setShootingRows] = useState([])
  const [ftRows, setFtRows] = useState([])
  const [conditioningRows, setConditioningRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('players').select('*').order('last_name').then(({ data, error }) => {
      if (error) setError(error.message)
      else setAllPlayers(data)
    })
    supabase.from('shooting_drills').select('*').eq('active', true).order('name').then(({ data, error }) => {
      if (error) setError(error.message)
      else {
        setDrills(data)
        if (data.length) setDrillId((prev) => prev || data[0].id)
      }
    })
    getAllSeasons().then(setSeasons).catch((err) => setError(err.message))
    getCurrentSeason().then((s) => setSeasonFilter(s ? s.id : 'all')).catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (metricType === 'practice' && !seasonFilter) return // seasons still loading
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricType, playerId, drillId, fromDate, toDate, seasonFilter])

  async function load() {
    setLoading(true)
    setError('')
    if (metricType === 'practice') {
      let q = supabase.from('v_practice_stats').select('*').gte('practice_date', fromDate).lte('practice_date', toDate)
      if (playerId !== 'team') q = q.eq('player_id', playerId)
      if (seasonFilter !== 'all') q = q.eq('season_id', seasonFilter)
      const { data, error } = await q.order('practice_date')
      if (error) setError(error.message); else setPracticeRows(data || [])
    } else if (metricType === 'shooting') {
      if (!drillId) { setShootingRows([]); setLoading(false); return }
      let q = supabase.from('shooting_attempts').select('*').eq('drill_id', drillId).gte('attempt_date', fromDate).lte('attempt_date', toDate)
      if (playerId !== 'team') q = q.eq('player_id', playerId)
      const { data, error } = await q.order('attempt_date')
      if (error) setError(error.message); else setShootingRows(data || [])
    } else if (metricType === 'ft') {
      let q = supabase.from('ft_sessions').select('*').gte('session_date', fromDate).lte('session_date', toDate)
      if (playerId !== 'team') q = q.eq('player_id', playerId)
      const { data, error } = await q.order('session_date')
      if (error) setError(error.message); else setFtRows(data || [])
    } else if (metricType === 'conditioning') {
      let q = supabase.from('conditioning_results').select('*').gte('test_date', fromDate).lte('test_date', toDate)
      if (playerId !== 'team') q = q.eq('player_id', playerId)
      const { data, error } = await q.order('test_date')
      if (error) setError(error.message); else setConditioningRows(data || [])
    }
    setLoading(false)
  }

  const practiceStat = PRACTICE_STATS.find((s) => s.key === practiceStatKey)

  const practiceSeries = useMemo(() => {
    if (metricType !== 'practice') return []
    const byDate = {}
    practiceRows.forEach((r) => {
      if (!byDate[r.practice_date]) byDate[r.practice_date] = []
      byDate[r.practice_date].push(Number(r[practiceStatKey]) || 0)
    })
    const points = Object.entries(byDate)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, vals]) => ({
        date,
        // v_practice_stats stores pct columns as 0-1 decimals; scale to 0-100 for display.
        value: practiceStat.pct
          ? (vals.reduce((a, b) => a + b, 0) / vals.length) * 100
          : vals.reduce((a, b) => a + b, 0),
      }))
    return [{ name: playerId === 'team' ? 'Whole team' : playerName(allPlayers.find((p) => p.id === playerId)), points }]
  }, [metricType, practiceRows, practiceStatKey, playerId, allPlayers, practiceStat])

  const shootingSeries = useMemo(() => {
    if (metricType !== 'shooting') return []
    const byDate = {}
    shootingRows.forEach((r) => {
      if (!byDate[r.attempt_date]) byDate[r.attempt_date] = []
      byDate[r.attempt_date].push(Number(r.makes))
    })
    const points = Object.entries(byDate)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, vals]) => ({ date, value: vals.reduce((a, b) => a + b, 0) / vals.length }))
    return [{ name: playerId === 'team' ? 'Team average' : playerName(allPlayers.find((p) => p.id === playerId)), points }]
  }, [metricType, shootingRows, playerId, allPlayers])

  const ftSeries = useMemo(() => {
    if (metricType !== 'ft') return []
    const byDate = {}
    ftRows.forEach((r) => {
      if (!byDate[r.session_date]) byDate[r.session_date] = []
      byDate[r.session_date].push(Number(r.makes))
    })
    const points = Object.entries(byDate)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, vals]) => ({ date, value: vals.reduce((a, b) => a + b, 0) / vals.length }))
    return [{ name: playerId === 'team' ? 'Team average' : playerName(allPlayers.find((p) => p.id === playerId)), points }]
  }, [metricType, ftRows, playerId, allPlayers])

  const conditioningSeries = useMemo(() => {
    if (metricType !== 'conditioning') return []
    const fields = [
      { key: 'three_min', label: '3 min', color: '#3b82f6' },
      { key: 'two_min', label: '2 min', color: '#f5a524' },
      { key: 'one_min', label: '1 min', color: '#2ecc71' },
    ]
    return fields.map((f) => {
      const byDate = {}
      conditioningRows.forEach((r) => {
        if (!byDate[r.test_date]) byDate[r.test_date] = []
        byDate[r.test_date].push(Number(r[f.key]) || 0)
      })
      const points = Object.entries(byDate)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, vals]) => ({ date, value: vals.reduce((a, b) => a + b, 0) / vals.length }))
      return { name: f.label, color: f.color, points }
    })
  }, [metricType, conditioningRows])

  const drill = drills.find((d) => d.id === drillId)

  return (
    <div>
      <div className="card">
        <h2>Trends</h2>
        <p className="small muted">Track progress over time — pick a player (or the whole team) and a metric.</p>
        <div className="row">
          <div style={{ flex: '1 1 160px' }}>
            <label>Player</label>
            <select value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
              <option value="team">Whole team</option>
              {allPlayers.map((p) => (
                <option key={p.id} value={p.id}>{playerName(p)}{!p.active ? ' (graduated)' : ''}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label>Category</label>
            <select value={metricType} onChange={(e) => setMetricType(e.target.value)}>
              <option value="practice">Practice / Game stat</option>
              <option value="shooting">Shooting drill</option>
              <option value="ft">FT Ladder</option>
              <option value="conditioning">Conditioning</option>
            </select>
          </div>
          {metricType === 'practice' && (
            <div style={{ flex: '1 1 160px' }}>
              <label>Stat</label>
              <select value={practiceStatKey} onChange={(e) => setPracticeStatKey(e.target.value)}>
                {PRACTICE_STATS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          )}
          {metricType === 'practice' && (
            <div style={{ flex: '1 1 160px' }}>
              <label>Program season</label>
              <select value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)}>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>{s.is_current ? `★ ${s.label}` : s.label}</option>
                ))}
                <option value="all">All seasons</option>
              </select>
            </div>
          )}
          {metricType === 'shooting' && (
            <div style={{ flex: '1 1 200px' }}>
              <label>Drill</label>
              <select value={drillId} onChange={(e) => setDrillId(e.target.value)}>
                {drills.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label>From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label>To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>
        {error && <div className="error-text">{error}</div>}
      </div>

      <div className="card">
        {loading ? <p className="muted">Loading…</p> : (
          <>
            {metricType === 'practice' && (
              <LineChart series={practiceSeries} valueSuffix={practiceStat.pct ? '%' : ''} />
            )}
            {metricType === 'shooting' && (
              <LineChart
                series={shootingSeries}
                refLines={[
                  ...(drill?.standard != null ? [{ value: Number(drill.standard), label: 'Standard', color: 'var(--good)' }] : []),
                  ...(drill?.great != null ? [{ value: Number(drill.great), label: 'Great', color: 'var(--great)' }] : []),
                ]}
              />
            )}
            {metricType === 'ft' && (
              <LineChart
                series={ftSeries}
                refLines={[
                  { value: FT_STANDARD, label: 'Standard', color: 'var(--good)' },
                  { value: FT_GREAT, label: 'Great', color: 'var(--great)' },
                ]}
                valueSuffix="/20"
              />
            )}
            {metricType === 'conditioning' && <LineChart series={conditioningSeries} />}
          </>
        )}
      </div>
    </div>
  )
}
