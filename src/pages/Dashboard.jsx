import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { periodRange, todayISO, sum, playerName } from '../lib/helpers'
import { toCSV, downloadCSV } from '../lib/csv'
import { getAllSeasons, getCurrentSeason } from '../lib/seasons'

const LEADERBOARDS = [
  { key: 'power5', label: 'Sum of Power 5' },
  { key: 'reb', label: 'Sum of Reb' },
  { key: 'efg_pct', label: 'Sum of eFG%', pct: true },
  { key: 'plus_minus', label: 'Sum of +/-' },
  { key: 'three_pct', label: 'Sum of 3%', pct: true },
]

export default function Dashboard() {
  const [period, setPeriod] = useState('week')
  const [anchor, setAnchor] = useState(todayISO())
  const [seasonStart, setSeasonStart] = useState('')
  const [sessionFilter, setSessionFilter] = useState('All')
  const [seasons, setSeasons] = useState([])
  const [seasonFilter, setSeasonFilter] = useState('') // '' = not loaded yet, 'all' = every season
  const [rows, setRows] = useState([])
  const [allPlayers, setAllPlayers] = useState([])
  const [possessionEvents, setPossessionEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const { start, end } = useMemo(() => periodRange(period, anchor, seasonStart || null), [period, anchor, seasonStart])

  useEffect(() => {
    supabase.from('players').select('*').order('last_name').then(({ data, error }) => {
      if (error) setError(error.message)
      else setAllPlayers(data)
    })
    getAllSeasons().then((data) => setSeasons(data)).catch((err) => setError(err.message))
    getCurrentSeason().then((s) => setSeasonFilter(s ? s.id : 'all')).catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!seasonFilter) return // seasons still loading
    load()
    loadPossessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, sessionFilter, seasonFilter])

  async function load() {
    setLoading(true)
    setError('')
    let query = supabase
      .from('v_practice_stats')
      .select('*')
      .gte('practice_date', start)
      .lte('practice_date', end)
    if (sessionFilter !== 'All') query = query.eq('session_type', sessionFilter)
    if (seasonFilter !== 'all') query = query.eq('season_id', seasonFilter)
    const { data, error } = await query
    if (error) setError(error.message)
    else setRows(data)
    setLoading(false)
  }

  async function loadPossessions() {
    let query = supabase
      .from('possession_events')
      .select('*, practice_sessions!inner(practice_date, session_type, season_id)')
      .gte('practice_sessions.practice_date', start)
      .lte('practice_sessions.practice_date', end)
    if (sessionFilter !== 'All') query = query.eq('practice_sessions.session_type', sessionFilter)
    if (seasonFilter !== 'all') query = query.eq('practice_sessions.season_id', seasonFilter)
    const { data, error } = await query
    if (error) setError(error.message)
    else setPossessionEvents(data || [])
  }

  const byPlayer = useMemo(() => {
    const map = {}
    rows.forEach((r) => {
      if (!map[r.player_id]) {
        map[r.player_id] = {
          player_id: r.player_id,
          last_name: r.last_name,
          position: r.position,
          games: 0,
          power5: 0, reb: 0, ast: 0, stl: 0, blk: 0, fouls_taken: 0,
          turnovers: 0, missed_reb: 0, paint_allowed: 0, eye_ball: 0, dlapse: 0,
          crashes: 0, paint_touch: 0, force_missed: 0, screen_assist: 0,
          pts: 0, plus_minus: 0, efg_pct: 0, three_pct: 0,
        }
      }
      const m = map[r.player_id]
      m.games += 1
      ;['power5', 'reb', 'ast', 'stl', 'blk', 'fouls_taken', 'turnovers', 'missed_reb',
        'paint_allowed', 'eye_ball', 'dlapse', 'crashes', 'paint_touch', 'force_missed',
        'screen_assist', 'pts', 'plus_minus', 'efg_pct', 'three_pct'].forEach((k) => {
        m[k] += Number(r[k]) || 0
      })
    })
    return Object.values(map)
  }, [rows])

  const teamTotals = useMemo(() => {
    const t = { power5: 0, reb: 0, turnovers: 0, pts: 0, ast: 0, stl: 0, blk: 0 }
    byPlayer.forEach((p) => {
      t.power5 += p.power5; t.reb += p.reb; t.turnovers += p.turnovers
      t.pts += p.pts; t.ast += p.ast; t.stl += p.stl; t.blk += p.blk
    })
    return t
  }, [byPlayer])

  const positionTotals = useMemo(() => {
    const groups = {}
    byPlayer.forEach((p) => {
      if (!groups[p.position]) groups[p.position] = { power5: 0, reb: 0, ast: 0, stl: 0, blk: 0, turnovers: 0, players: 0 }
      const g = groups[p.position]
      g.power5 += p.power5; g.reb += p.reb; g.ast += p.ast; g.stl += p.stl
      g.blk += p.blk; g.turnovers += p.turnovers; g.players += 1
    })
    return groups
  }, [byPlayer])

  // Team-level Off/Def Rating from live-tracked possession events. Since
  // every possession credited to Blue is simultaneously a defensive
  // possession for White (and vice versa), White's defensive rating is just
  // Blue's offensive rating, and Blue's defensive rating is White's.
  const teamRatings = useMemo(() => {
    const t = { Blue: { poss: 0, pts: 0 }, White: { poss: 0, pts: 0 } }
    possessionEvents.forEach((e) => {
      if (!t[e.shooter_team]) return
      t[e.shooter_team].poss += 1
      t[e.shooter_team].pts += e.points
    })
    const rtg = (team) => (t[team].poss ? (t[team].pts / t[team].poss) * 100 : null)
    return {
      Blue: { off: rtg('Blue'), def: rtg('White'), poss: t.Blue.poss },
      White: { off: rtg('White'), def: rtg('Blue'), poss: t.White.poss },
    }
  }, [possessionEvents])

  // Per-player Off/Def Rating: team points scored per 100 possessions while
  // this player was on the floor for offense/defense, using the on-floor
  // snapshot captured at the moment of each made shot.
  const playerRatings = useMemo(() => {
    const map = {}
    const ensure = (id) => (map[id] ||= { offPoss: 0, offPts: 0, defPoss: 0, defPts: 0 })
    possessionEvents.forEach((e) => {
      ;(e.offense_ids || []).forEach((pid) => {
        const m = ensure(pid)
        m.offPoss += 1
        m.offPts += e.points
      })
      ;(e.defense_ids || []).forEach((pid) => {
        const m = ensure(pid)
        m.defPoss += 1
        m.defPts += e.points
      })
    })
    return Object.entries(map)
      .map(([pid, m]) => {
        const player = allPlayers.find((p) => p.id === pid)
        const offRtg = m.offPoss ? (m.offPts / m.offPoss) * 100 : null
        const defRtg = m.defPoss ? (m.defPts / m.defPoss) * 100 : null
        return {
          player_id: pid,
          name: player ? playerName(player) : 'Unknown',
          offPoss: m.offPoss,
          offRtg,
          defPoss: m.defPoss,
          defRtg,
          netRtg: offRtg !== null && defRtg !== null ? offRtg - defRtg : null,
        }
      })
      .sort((a, b) => (b.offPoss + b.defPoss) - (a.offPoss + a.defPoss))
  }, [possessionEvents, allPlayers])

  function topN(key, n = 8) {
    return [...byPlayer].sort((a, b) => b[key] - a[key]).slice(0, n)
  }

  function exportTeamCSV() {
    const columns = [
      { key: 'last_name', label: 'Player' },
      { key: 'position', label: 'Position' },
      { key: 'games', label: 'GP' },
      { key: 'pts', label: 'PTS' },
      { key: 'reb', label: 'REB' },
      { key: 'ast', label: 'AST' },
      { key: 'stl', label: 'STL' },
      { key: 'blk', label: 'BLK' },
      { key: 'fouls_taken', label: 'Fouls Taken' },
      { key: 'power5', label: 'Power 5' },
      { key: 'turnovers', label: 'TO' },
      { key: 'missed_reb', label: 'Missed Reb' },
      { key: 'paint_allowed', label: 'Paint Allowed' },
      { key: 'eye_ball', label: 'Eye Ball' },
      { key: 'dlapse', label: 'Dlapse' },
      { key: 'crashes', label: 'Crashes' },
      { key: 'paint_touch', label: 'Paint Touch' },
      { key: 'force_missed', label: 'Force Missed' },
      { key: 'screen_assist', label: 'Screen Assist' },
      { key: 'plus_minus', label: '+/-' },
    ]
    const csv = toCSV(byPlayer, columns)
    downloadCSV(`team_stats_${period}_${start}_to_${end}.csv`, csv)
  }

  return (
    <div>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>Filters</h2>
          <button className="secondary" onClick={exportTeamCSV} disabled={byPlayer.length === 0}>
            Export team CSV
          </button>
        </div>
        <div className="row">
          <div className="period-toggle" style={{ minWidth: 220 }}>
            {['day', 'week', 'season'].map((p) => (
              <button
                key={p}
                className={period === p ? 'primary' : 'secondary'}
                onClick={() => setPeriod(p)}
              >
                {p[0].toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          {period !== 'season' && (
            <div>
              <label>Anchor date</label>
              <input type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} />
            </div>
          )}
          {period === 'season' && (
            <div>
              <label>Season start (optional)</label>
              <input type="date" value={seasonStart} onChange={(e) => setSeasonStart(e.target.value)} />
            </div>
          )}
          <div>
            <label>Session type</label>
            <select value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)}>
              <option>All</option>
              <option>Practice</option>
              <option>Game</option>
            </select>
          </div>
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
          Showing {start} → {end} · {rows.length} player-rows across {new Set(rows.map((r) => r.practice_session_id)).size} session(s)
        </p>
        {error && <div className="error-text">{error}</div>}
      </div>

      <div className="grid-3">
        <div className="card">
          <h3>Team totals</h3>
          {loading ? <p className="muted">Loading…</p> : (
            <ul className="leader-list">
              <li><span>Points</span><strong>{teamTotals.pts}</strong></li>
              <li><span>Power 5</span><strong>{teamTotals.power5}</strong></li>
              <li><span>Rebounds</span><strong>{teamTotals.reb}</strong></li>
              <li><span>Assists</span><strong>{teamTotals.ast}</strong></li>
              <li><span>Steals</span><strong>{teamTotals.stl}</strong></li>
              <li><span>Blocks</span><strong>{teamTotals.blk}</strong></li>
              <li><span>Turnovers</span><strong>{teamTotals.turnovers}</strong></li>
            </ul>
          )}
        </div>
        {Object.entries(positionTotals).map(([pos, g]) => (
          <div className="card" key={pos}>
            <h3>{pos} group ({g.players})</h3>
            <ul className="leader-list">
              <li><span>Power 5</span><strong>{g.power5}</strong></li>
              <li><span>Rebounds</span><strong>{g.reb}</strong></li>
              <li><span>Assists</span><strong>{g.ast}</strong></li>
              <li><span>Steals</span><strong>{g.stl}</strong></li>
              <li><span>Blocks</span><strong>{g.blk}</strong></li>
              <li><span>Turnovers</span><strong>{g.turnovers}</strong></li>
            </ul>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Off / Def Rating</h2>
        <p className="small muted">
          Points per 100 possessions, from Live Tracker's Blue/White lineups. Only counts drills
          where players were checked on-floor and assigned a team color.
        </p>
        {possessionEvents.length === 0 ? (
          <p className="muted small">No possessions logged in this period yet. Use the on-floor + Blue/White
            assignment in Live Tracker to start tracking this.</p>
        ) : (
          <>
            <div className="grid-2">
              {['Blue', 'White'].map((team) => (
                <div key={team}>
                  <h3>{team} team ({teamRatings[team].poss} poss)</h3>
                  <ul className="leader-list">
                    <li><span>Off Rating</span><strong>{teamRatings[team].off === null ? '—' : teamRatings[team].off.toFixed(1)}</strong></li>
                    <li><span>Def Rating</span><strong>{teamRatings[team].def === null ? '—' : teamRatings[team].def.toFixed(1)}</strong></li>
                    <li>
                      <span>Net Rating</span>
                      <strong>
                        {teamRatings[team].off === null || teamRatings[team].def === null
                          ? '—'
                          : (teamRatings[team].off - teamRatings[team].def).toFixed(1)}
                      </strong>
                    </li>
                  </ul>
                </div>
              ))}
            </div>
            <div className="table-scroll" style={{ marginTop: 12 }}>
              <table>
                <thead>
                  <tr>
                    <th className="name-cell">Player</th>
                    <th>Off Poss</th><th>Off Rtg</th>
                    <th>Def Poss</th><th>Def Rtg</th><th>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {playerRatings.map((p) => (
                    <tr key={p.player_id}>
                      <td className="name-cell">{p.name}</td>
                      <td>{p.offPoss}</td>
                      <td>{p.offRtg === null ? '—' : p.offRtg.toFixed(1)}</td>
                      <td>{p.defPoss}</td>
                      <td>{p.defRtg === null ? '—' : p.defRtg.toFixed(1)}</td>
                      <td>{p.netRtg === null ? '—' : p.netRtg.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2>Top 8 leaderboards</h2>
        <div className="grid-3">
          {LEADERBOARDS.map((lb) => (
            <div key={lb.key}>
              <h3>{lb.label}</h3>
              <ul className="leader-list">
                {topN(lb.key).map((p, i) => (
                  <li key={p.player_id}>
                    <span><span className="rank">{i + 1}.</span>{p.last_name}</span>
                    <strong>{lb.pct ? (p[lb.key] * 100).toFixed(1) + '%' : p[lb.key]}</strong>
                  </li>
                ))}
                {topN(lb.key).length === 0 && <li className="muted">No data yet</li>}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Full player breakdown (Power 5 + negatives + extras)</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th className="name-cell">Player</th><th>Pos</th><th>GP</th>
                <th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>Fls Tkn</th><th>Power 5</th>
                <th>TO</th><th>Msd Reb</th><th>Paint Alwd</th><th>Eye Ball</th><th>Dlapse</th>
                <th>Crashes</th><th>Paint Tch</th><th>Force Msd</th><th>Scrn Ast</th><th>+/-</th>
              </tr>
            </thead>
            <tbody>
              {byPlayer
                .sort((a, b) => b.power5 - a.power5)
                .map((p) => (
                  <tr key={p.player_id}>
                    <td className="name-cell">{p.last_name}</td>
                    <td>{p.position}</td>
                    <td>{p.games}</td>
                    <td>{p.pts}</td>
                    <td>{p.reb}</td>
                    <td>{p.ast}</td>
                    <td>{p.stl}</td>
                    <td>{p.blk}</td>
                    <td>{p.fouls_taken}</td>
                    <td><strong>{p.power5}</strong></td>
                    <td>{p.turnovers}</td>
                    <td>{p.missed_reb}</td>
                    <td>{p.paint_allowed}</td>
                    <td>{p.eye_ball}</td>
                    <td>{p.dlapse}</td>
                    <td>{p.crashes}</td>
                    <td>{p.paint_touch}</td>
                    <td>{p.force_missed}</td>
                    <td>{p.screen_assist}</td>
                    <td>{p.plus_minus}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
