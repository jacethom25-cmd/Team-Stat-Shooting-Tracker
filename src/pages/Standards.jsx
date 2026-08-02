import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { periodRange, todayISO, playerName } from '../lib/helpers'

// FT Ladder thresholds match FreeThrow.jsx / classifyFtSession (out of 20).
const FT_STANDARD = 16
const FT_GREAT = 19

function tierFor(value, standard, great) {
  if (value === null || value === undefined) return null
  if (great !== null && great !== undefined && value >= great) return 'great'
  if (standard !== null && standard !== undefined && value >= standard) return 'good'
  return 'below'
}

export default function Standards() {
  const [players, setPlayers] = useState([])
  const [includeGraduated, setIncludeGraduated] = useState(false)
  const [drills, setDrills] = useState([])
  const [attempts, setAttempts] = useState([])
  const [ftSessions, setFtSessions] = useState([])
  const [period, setPeriod] = useState('season')
  const [anchor, setAnchor] = useState(todayISO())
  const [seasonStart, setSeasonStart] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const { start, end } = useMemo(() => periodRange(period, anchor, seasonStart || null), [period, anchor, seasonStart])

  useEffect(() => {
    supabase.from('players').select('*').order('position').order('last_name').then(({ data, error }) => {
      if (error) setError(error.message)
      else setPlayers(data)
    })
    supabase.from('shooting_drills').select('*').eq('active', true).order('name').then(({ data, error }) => {
      if (error) setError(error.message)
      else setDrills(data)
    })
  }, [])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end])

  async function load() {
    setLoading(true)
    setError('')
    const [a, f] = await Promise.all([
      supabase.from('shooting_attempts').select('player_id, drill_id, makes').gte('attempt_date', start).lte('attempt_date', end),
      supabase.from('ft_sessions').select('player_id, makes').gte('session_date', start).lte('session_date', end),
    ])
    if (a.error) setError(a.error.message); else setAttempts(a.data || [])
    if (f.error) setError(f.error.message); else setFtSessions(f.data || [])
    setLoading(false)
  }

  const bestByPlayerDrill = useMemo(() => {
    const map = {}
    attempts.forEach((a) => {
      const key = `${a.player_id}_${a.drill_id}`
      if (!(key in map) || Number(a.makes) > map[key]) map[key] = Number(a.makes)
    })
    return map
  }, [attempts])

  const bestFtByPlayer = useMemo(() => {
    const map = {}
    ftSessions.forEach((s) => {
      if (!(s.player_id in map) || Number(s.makes) > map[s.player_id]) map[s.player_id] = Number(s.makes)
    })
    return map
  }, [ftSessions])

  const rows = useMemo(
    () => players.filter((p) => includeGraduated || p.active),
    [players, includeGraduated]
  )

  function DrillCell({ player, drill }) {
    const isRecordHolder = drill.record_holder_id === player.id
    const key = `${player.id}_${drill.id}`
    const val = bestByPlayerDrill[key]
    if (val === undefined && !isRecordHolder) return <span className="muted">—</span>
    const display = val !== undefined ? val : drill.program_high
    const tier = val !== undefined ? tierFor(val, drill.standard, drill.great) : null
    const pillClass = isRecordHolder ? 'pr' : tier === 'great' ? 'great' : tier === 'good' ? 'good' : null
    return pillClass ? (
      <span className={`pill ${pillClass}`}>{display}{isRecordHolder ? ' ★' : ''}</span>
    ) : (
      <span>{display}</span>
    )
  }

  function FtCell({ player }) {
    const val = bestFtByPlayer[player.id]
    if (val === undefined) return <span className="muted">—</span>
    const tier = tierFor(val, FT_STANDARD, FT_GREAT)
    const pillClass = tier === 'great' ? 'great' : tier === 'good' ? 'good' : null
    return pillClass ? <span className={`pill ${pillClass}`}>{val}/20</span> : <span>{val}/20</span>
  }

  return (
    <div>
      <div className="card">
        <h2>Standards grid</h2>
        <p className="small muted">
          Each player's best result per drill in the selected window. Green = meets standard,
          orange = great, pink ★ = current program record holder for that drill (shown regardless
          of window, since that's an all-time title).
        </p>
        <div className="row">
          <div className="period-toggle" style={{ minWidth: 220 }}>
            {['day', 'week', 'season'].map((p) => (
              <button key={p} className={period === p ? 'primary' : 'secondary'} onClick={() => setPeriod(p)}>
                {p[0].toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          {period !== 'season' ? (
            <div>
              <label>Anchor date</label>
              <input type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} />
            </div>
          ) : (
            <div>
              <label>Season start (optional)</label>
              <input type="date" value={seasonStart} onChange={(e) => setSeasonStart(e.target.value)} />
            </div>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 0, alignSelf: 'flex-end' }}>
            <input
              type="checkbox"
              style={{ width: 16, height: 16 }}
              checked={includeGraduated}
              onChange={(e) => setIncludeGraduated(e.target.checked)}
            />
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Include graduated</span>
          </label>
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>{start} → {end}</p>
        {error && <div className="error-text">{error}</div>}
      </div>

      <div className="card">
        {loading ? <p className="muted">Loading…</p> : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th className="name-cell">Player</th>
                  <th>FT Ladder</th>
                  {drills.map((d) => <th key={d.id}>{d.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td className="name-cell">{playerName(p)}{!p.active ? ' (grad)' : ''}</td>
                    <td><FtCell player={p} /></td>
                    {drills.map((d) => (
                      <td key={d.id}><DrillCell player={p} drill={d} /></td>
                    ))}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={drills.length + 2} className="muted">No players to show.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
