import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { periodRange, todayISO, sum, playerName } from '../lib/helpers'
import { toCSV, downloadCSV, safeFileSlug } from '../lib/csv'
import { getAllSeasons, getCurrentSeason } from '../lib/seasons'

export default function PlayerReport() {
  const [allPlayers, setAllPlayers] = useState([])
  const [playerId, setPlayerId] = useState('')
  const [period, setPeriod] = useState('season')
  const [anchor, setAnchor] = useState(todayISO())
  const [seasonStart, setSeasonStart] = useState('')
  const [seasons, setSeasons] = useState([])
  const [seasonFilter, setSeasonFilter] = useState('')

  const [practiceRows, setPracticeRows] = useState([])
  const [shootingRows, setShootingRows] = useState([])
  const [ftRows, setFtRows] = useState([])
  const [conditioningRows, setConditioningRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { start, end } = useMemo(() => periodRange(period, anchor, seasonStart || null), [period, anchor, seasonStart])

  useEffect(() => {
    supabase.from('players').select('*').order('last_name').then(({ data, error }) => {
      if (error) setError(error.message)
      else {
        setAllPlayers(data)
        if (!playerId && data.length) setPlayerId(data[0].id)
      }
    })
    getAllSeasons().then(setSeasons).catch((err) => setError(err.message))
    getCurrentSeason().then((s) => setSeasonFilter(s ? s.id : 'all')).catch((err) => setError(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!playerId || !seasonFilter) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, start, end, seasonFilter])

  async function load() {
    setLoading(true)
    setError('')
    let practiceQuery = supabase.from('v_practice_stats').select('*').eq('player_id', playerId).gte('practice_date', start).lte('practice_date', end).order('practice_date')
    if (seasonFilter !== 'all') practiceQuery = practiceQuery.eq('season_id', seasonFilter)
    const [pr, sh, ft, cond] = await Promise.all([
      practiceQuery,
      supabase.from('shooting_attempts').select('*, shooting_drills(name, standard, great)').eq('player_id', playerId).gte('attempt_date', start).lte('attempt_date', end).order('attempt_date'),
      supabase.from('ft_sessions').select('*').eq('player_id', playerId).gte('session_date', start).lte('session_date', end).order('session_date'),
      supabase.from('conditioning_results').select('*').eq('player_id', playerId).order('test_date'),
    ])
    if (pr.error) setError(pr.error.message); else setPracticeRows(pr.data)
    if (sh.error) setError(sh.error.message); else setShootingRows(sh.data)
    if (ft.error) setError(ft.error.message); else setFtRows(ft.data)
    if (cond.error) setError(cond.error.message); else setConditioningRows(cond.data)
    setLoading(false)
  }

  const player = allPlayers.find((p) => p.id === playerId)

  const totals = useMemo(() => ({
    games: practiceRows.length,
    pts: sum(practiceRows, 'pts'),
    reb: sum(practiceRows, 'reb'),
    ast: sum(practiceRows, 'ast'),
    stl: sum(practiceRows, 'stl'),
    blk: sum(practiceRows, 'blk'),
    power5: sum(practiceRows, 'power5'),
    turnovers: sum(practiceRows, 'turnovers'),
    plus_minus: sum(practiceRows, 'plus_minus'),
  }), [practiceRows])

  const ftBest = ftRows.reduce((best, r) => (!best || r.makes > best.makes ? r : best), null)

  function exportAll() {
    if (!player) return
    const slug = safeFileSlug(playerName(player))
    const suffix = `${slug}_${period}_${start}_to_${end}`

    downloadCSV(`${suffix}_practice_stats.csv`, toCSV(practiceRows, [
      { key: 'practice_date', label: 'Date' }, { key: 'session_type', label: 'Type' },
      { key: 'pts', label: 'PTS' }, { key: 'reb', label: 'REB' }, { key: 'ast', label: 'AST' },
      { key: 'stl', label: 'STL' }, { key: 'blk', label: 'BLK' }, { key: 'fouls_taken', label: 'Fouls Taken' },
      { key: 'power5', label: 'Power 5' }, { key: 'turnovers', label: 'TO' },
      { key: 'missed_reb', label: 'Missed Reb' }, { key: 'paint_allowed', label: 'Paint Allowed' },
      { key: 'eye_ball', label: 'Eye Ball' }, { key: 'dlapse', label: 'Dlapse' },
      { key: 'crashes', label: 'Crashes' }, { key: 'paint_touch', label: 'Paint Touch' },
      { key: 'force_missed', label: 'Force Missed' }, { key: 'screen_assist', label: 'Screen Assist' },
      { key: 'plus_minus', label: '+/-' }, { key: 'fg_pct', label: 'FG%' }, { key: 'three_pct', label: '3%' },
      { key: 'efg_pct', label: 'eFG%' }, { key: 'ft_pct', label: 'FT%' },
    ]))

    downloadCSV(`${suffix}_shooting_drills.csv`, toCSV(
      shootingRows.map((r) => ({ ...r, drill_name: r.shooting_drills?.name })),
      [
        { key: 'attempt_date', label: 'Date' }, { key: 'drill_name', label: 'Drill' },
        { key: 'session_number', label: 'Session' }, { key: 'makes', label: 'Makes' },
      ]
    ))

    downloadCSV(`${suffix}_ft_ladder.csv`, toCSV(ftRows, [
      { key: 'session_date', label: 'Date' }, { key: 'session_number', label: 'Session' },
      { key: 'makes', label: 'Makes (of 20)' },
    ]))

    downloadCSV(`${suffix}_conditioning.csv`, toCSV(conditioningRows, [
      { key: 'test_date', label: 'Date' }, { key: 'season_label', label: 'Season' },
      { key: 'three_min', label: '3 min' }, { key: 'two_min', label: '2 min' }, { key: 'one_min', label: '1 min' },
    ]))
  }

  return (
    <div>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>Player report</h2>
          <button className="primary" onClick={exportAll} disabled={!player || loading}>Export everything (CSV)</button>
        </div>
        <div className="row">
          <div style={{ flex: '1 1 200px' }}>
            <label>Player</label>
            <select value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
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
        <p className="small muted">{start} → {end} · practice/game stats scoped to program season above; shooting drills, FT ladder, and conditioning are always all-time.</p>
        {error && <div className="error-text">{error}</div>}
      </div>

      {loading ? <p className="muted">Loading…</p> : player && (
        <>
          <div className="grid-3">
            <div className="card">
              <h3>Practice / game totals</h3>
              <ul className="leader-list">
                <li><span>Games logged</span><strong>{totals.games}</strong></li>
                <li><span>Points</span><strong>{totals.pts}</strong></li>
                <li><span>Rebounds</span><strong>{totals.reb}</strong></li>
                <li><span>Assists</span><strong>{totals.ast}</strong></li>
                <li><span>Steals</span><strong>{totals.stl}</strong></li>
                <li><span>Blocks</span><strong>{totals.blk}</strong></li>
                <li><span>Power 5</span><strong>{totals.power5}</strong></li>
                <li><span>Turnovers</span><strong>{totals.turnovers}</strong></li>
                <li><span>+/-</span><strong>{totals.plus_minus}</strong></li>
              </ul>
            </div>
            <div className="card">
              <h3>Shooting drills logged</h3>
              {shootingRows.length === 0 ? <p className="muted small">None in this period.</p> : (
                <ul className="leader-list">
                  {shootingRows.slice(-8).reverse().map((r) => (
                    <li key={r.id}>
                      <span>{r.attempt_date} · {r.shooting_drills?.name}</span>
                      <strong>{r.makes}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="card">
              <h3>FT Ladder</h3>
              <ul className="leader-list">
                <li><span>Sessions logged</span><strong>{ftRows.length}</strong></li>
                <li><span>Best (of 20)</span><strong>{ftBest ? ftBest.makes : '—'}</strong></li>
              </ul>
            </div>
          </div>

          <div className="card">
            <h3>Conditioning history (all-time)</h3>
            {conditioningRows.length === 0 ? <p className="muted small">No conditioning results logged.</p> : (
              <div className="table-scroll">
                <table>
                  <thead><tr><th>Date</th><th>Season</th><th>3 min</th><th>2 min</th><th>1 min</th><th>Total</th></tr></thead>
                  <tbody>
                    {conditioningRows.map((r) => (
                      <tr key={r.id}>
                        <td>{r.test_date}</td><td>{r.season_label}</td>
                        <td>{r.three_min}</td><td>{r.two_min}</td><td>{r.one_min}</td>
                        <td><strong>{(r.three_min || 0) + (r.two_min || 0) + (r.one_min || 0)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
