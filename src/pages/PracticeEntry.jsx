import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { todayISO, playerName } from '../lib/helpers'
import { getCurrentSeason, ensurePracticeSession } from '../lib/seasons'

const EDITABLE_FIELDS = [
  ['win', 'W'], ['loss', 'L'],
  ['fgm2', '2FGM'], ['fga2', '2FGA'],
  ['fgm3', '3PM'], ['fga3', '3PA'],
  ['ftm', 'FTM'], ['fta', 'FTA'],
  ['oreb', 'OREB'], ['dreb', 'DREB'],
  ['ast', 'AST'], ['stl', 'STL'], ['blk', 'BLK'],
  ['fouls_taken', 'Fouls Tkn'],
  ['turnovers', 'TO'], ['missed_reb', 'Msd Reb'],
  ['paint_allowed', 'Paint Alwd'], ['eye_ball', 'Eye Ball'],
  ['dlapse', 'Dlapse'],
  ['crashes', 'Crashes'], ['paint_touch', 'Paint Tch'],
  ['force_missed', 'Force Msd'], ['screen_assist', 'Scrn Ast'],
  ['plus_minus', '+/-'],
]

const BLANK_ROW = EDITABLE_FIELDS.reduce((acc, [key]) => ({ ...acc, [key]: 0 }), {})

export default function PracticeEntry({ initialDate, initialType }) {
  const [date, setDate] = useState(initialDate || todayISO())
  const [sessionType, setSessionType] = useState(initialType || 'Practice')
  const [players, setPlayers] = useState([])
  const [rows, setRows] = useState({}) // player_id -> stat fields
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, sessionType])

  async function loadAll() {
    setLoading(true)
    setError('')
    const { data: playerData, error: pErr } = await supabase
      .from('players')
      .select('*')
      .eq('active', true)
      .order('position')
      .order('last_name')
    if (pErr) { setError(pErr.message); setLoading(false); return }
    setPlayers(playerData)

    const initial = {}
    playerData.forEach((p) => { initial[p.id] = { ...BLANK_ROW } })

    const { data: session } = await supabase
      .from('practice_sessions')
      .select('id')
      .eq('practice_date', date)
      .eq('session_type', sessionType)
      .maybeSingle()

    if (session) {
      const { data: statRows } = await supabase
        .from('practice_stats')
        .select('*')
        .eq('practice_session_id', session.id)
      statRows?.forEach((row) => {
        if (initial[row.player_id]) {
          const merged = { ...BLANK_ROW }
          EDITABLE_FIELDS.forEach(([key]) => { merged[key] = row[key] ?? 0 })
          initial[row.player_id] = merged
        }
      })
    }
    setRows(initial)
    setLoading(false)
  }

  function updateCell(playerId, field, value) {
    setRows((prev) => ({
      ...prev,
      [playerId]: { ...prev[playerId], [field]: value === '' ? 0 : Number(value) },
    }))
  }

  const computed = useMemo(() => {
    const out = {}
    players.forEach((p) => {
      const r = rows[p.id] || BLANK_ROW
      const fga = (r.fga2 || 0) + (r.fga3 || 0)
      const fgm = (r.fgm2 || 0) + (r.fgm3 || 0)
      const fgPct = fga ? fgm / fga : 0
      const threePct = r.fga3 ? r.fgm3 / r.fga3 : 0
      const efgPct = fga ? (fgm + 0.5 * (r.fgm3 || 0)) / fga : 0
      const ftPct = r.fta ? r.ftm / r.fta : 0
      const pts = (r.fgm2 || 0) * 2 + (r.fgm3 || 0) * 3 + (r.ftm || 0)
      const reb = (r.oreb || 0) + (r.dreb || 0)
      const power5 = reb + (r.ast || 0) + (r.stl || 0) + (r.blk || 0) + (r.fouls_taken || 0)
      out[p.id] = { fga, fgm, fgPct, threePct, efgPct, ftPct, pts, reb, power5 }
    })
    return out
  }, [players, rows])

  async function saveAll() {
    setSaving(true)
    setError('')
    try {
      const currentSeason = await getCurrentSeason()
      if (!currentSeason) throw new Error('No active season set. Use the season selector in the header to create one.')
      const session = await ensurePracticeSession(date, sessionType, currentSeason.id)

      const payload = players.map((p) => ({
        practice_session_id: session.id,
        player_id: p.id,
        ...rows[p.id],
      }))

      const { error: statErr } = await supabase
        .from('practice_stats')
        .upsert(payload, { onConflict: 'practice_session_id,player_id' })
      if (statErr) throw statErr

      setSavedAt(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="card">
        <div className="row">
          <div>
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label>Type</label>
            <select value={sessionType} onChange={(e) => setSessionType(e.target.value)}>
              <option>Practice</option>
              <option>Game</option>
            </select>
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button className="primary" onClick={saveAll} disabled={saving || loading}>
              {saving ? 'Saving…' : 'Save practice stats'}
            </button>
          </div>
          {savedAt && <span className="small muted" style={{ alignSelf: 'center' }}>Saved {savedAt}</span>}
        </div>
        {error && <div className="error-text">{error}</div>}
      </div>

      <div className="card">
        <h2>{sessionType} — {date}</h2>
        <p className="muted small">
          Enter live or after the fact from film. Percentages, points, rebounds, and Power 5
          calculate automatically. Saving is safe to repeat — it updates today's rows rather
          than creating duplicates.
        </p>
        {loading ? (
          <p className="muted">Loading roster…</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th className="name-cell">Player</th>
                  <th>Pos</th>
                  {EDITABLE_FIELDS.map(([key, label]) => (
                    <th key={key}>{label}</th>
                  ))}
                  <th>FG%</th>
                  <th>3%</th>
                  <th>eFG%</th>
                  <th>FT%</th>
                  <th>PTS</th>
                  <th>REB</th>
                  <th>Power 5</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  const c = computed[p.id] || {}
                  return (
                    <tr key={p.id}>
                      <td className="name-cell">{playerName(p)}</td>
                      <td>{p.position}</td>
                      {EDITABLE_FIELDS.map(([key]) => (
                        <td key={key}>
                          <input
                            className="stat-input"
                            type="number"
                            min="0"
                            value={rows[p.id]?.[key] ?? 0}
                            onChange={(e) => updateCell(p.id, key, e.target.value)}
                          />
                        </td>
                      ))}
                      <td>{(c.fgPct * 100).toFixed(0)}%</td>
                      <td>{(c.threePct * 100).toFixed(0)}%</td>
                      <td>{(c.efgPct * 100).toFixed(0)}%</td>
                      <td>{(c.ftPct * 100).toFixed(0)}%</td>
                      <td>{c.pts}</td>
                      <td>{c.reb}</td>
                      <td><strong>{c.power5}</strong></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
