import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { periodRange, todayISO, playerName } from '../lib/helpers'
import { ZONES } from '../lib/zones'
import CourtDiagram from '../components/CourtDiagram'
import { getAllSeasons, getCurrentSeason } from '../lib/seasons'

export default function ShotChart() {
  const [allPlayers, setAllPlayers] = useState([])
  const [playerId, setPlayerId] = useState('team') // 'team' = whole-team aggregate
  const [period, setPeriod] = useState('week')
  const [anchor, setAnchor] = useState(todayISO())
  const [seasonStart, setSeasonStart] = useState('')
  const [seasons, setSeasons] = useState([])
  const [seasonFilter, setSeasonFilter] = useState('')
  const [shots, setShots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const { start, end } = useMemo(() => periodRange(period, anchor, seasonStart || null), [period, anchor, seasonStart])

  useEffect(() => {
    supabase.from('players').select('*').order('last_name').then(({ data, error }) => {
      if (error) setError(error.message)
      else setAllPlayers(data)
    })
    getAllSeasons().then(setSeasons).catch((err) => setError(err.message))
    getCurrentSeason().then((s) => setSeasonFilter(s ? s.id : 'all')).catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!seasonFilter) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, start, end, seasonFilter])

  async function load() {
    setLoading(true)
    setError('')
    let query = supabase
      .from('shot_events')
      .select('*, practice_sessions!inner(practice_date, session_type, season_id)')
      .gte('practice_sessions.practice_date', start)
      .lte('practice_sessions.practice_date', end)
    if (playerId !== 'team') query = query.eq('player_id', playerId)
    if (seasonFilter !== 'all') query = query.eq('practice_sessions.season_id', seasonFilter)
    const { data, error } = await query
    if (error) setError(error.message)
    else setShots(data)
    setLoading(false)
  }

  const zoneStats = useMemo(() => {
    const stats = {}
    ZONES.forEach((z) => { stats[z.key] = { makes: 0, attempts: 0 } })
    shots.forEach((s) => {
      if (!stats[s.zone]) return
      stats[s.zone].attempts += 1
      if (s.made) stats[s.zone].makes += 1
    })
    return stats
  }, [shots])

  const overall = useMemo(() => {
    const t = { makes: 0, attempts: 0, makes3: 0, attempts3: 0 }
    shots.forEach((s) => {
      t.attempts += 1
      if (s.made) t.makes += 1
      if (s.shot_type === '3PT') {
        t.attempts3 += 1
        if (s.made) t.makes3 += 1
      }
    })
    return t
  }, [shots])

  const zoneRows = useMemo(() => {
    return ZONES.map((z) => {
      const st = zoneStats[z.key]
      return {
        ...z,
        makes: st.makes,
        attempts: st.attempts,
        pct: st.attempts ? st.makes / st.attempts : null,
      }
    }).sort((a, b) => b.attempts - a.attempts)
  }, [zoneStats])

  const player = playerId === 'team' ? null : allPlayers.find((p) => p.id === playerId)

  return (
    <div>
      <div className="card">
        <h2>Shot chart</h2>
        <p className="small muted">
          Live Tracker shots only, by zone. Shooting drill and team drill attempts aren't included here since
          those are already tracked with their own program/team highs.
        </p>
        <div className="row">
          <div style={{ flex: '1 1 200px' }}>
            <label>Player</label>
            <select value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
              <option value="team">Whole team</option>
              {allPlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {playerName(p)}{!p.active ? ' (graduated)' : ''}
                </option>
              ))}
            </select>
          </div>
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
          <div>
            <label>Program season</label>
            <select value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)}>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.is_current ? `★ ${s.label}` : s.label}</option>
              ))}
              <option value="all">All seasons</option>
            </select>
          </div>
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>
          {start} → {end} · {overall.attempts} shot{overall.attempts === 1 ? '' : 's'} logged
          {player ? ` for ${playerName(player)}` : ' (whole team)'}
        </p>
        {error && <div className="error-text">{error}</div>}
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Court</h3>
          {loading ? <p className="muted">Loading…</p> : (
            <CourtDiagram zoneStats={zoneStats} />
          )}
          <p className="small muted" style={{ marginTop: 8 }}>
            Green = 50%+, orange = 35-49%, red = under 35%. Grey = no attempts logged in this window.
          </p>
        </div>

        <div className="card">
          <h3>Overall</h3>
          <ul className="leader-list">
            <li><span>FG</span><strong>{overall.makes}/{overall.attempts}{overall.attempts ? ` (${Math.round((overall.makes / overall.attempts) * 100)}%)` : ''}</strong></li>
            <li><span>3PT</span><strong>{overall.makes3}/{overall.attempts3}{overall.attempts3 ? ` (${Math.round((overall.makes3 / overall.attempts3) * 100)}%)` : ''}</strong></li>
          </ul>
          <h3 style={{ marginTop: 16 }}>By zone</h3>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Zone</th><th>Makes</th><th>Att</th><th>%</th></tr></thead>
              <tbody>
                {zoneRows.map((z) => (
                  <tr key={z.key}>
                    <td>{z.label}</td>
                    <td>{z.makes}</td>
                    <td>{z.attempts}</td>
                    <td>{z.pct === null ? '—' : `${Math.round(z.pct * 100)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
