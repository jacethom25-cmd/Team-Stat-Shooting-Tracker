import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { sum } from '../lib/helpers'
import { getAllSeasons, getCurrentSeason } from '../lib/seasons'

export default function PracticeHistory({ onOpenSession }) {
  const [sessions, setSessions] = useState([])
  const [seasons, setSeasons] = useState([])
  const [seasonFilter, setSeasonFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getAllSeasons().then(setSeasons).catch((err) => setError(err.message))
    getCurrentSeason().then((s) => setSeasonFilter(s ? s.id : 'all')).catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!seasonFilter) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonFilter])

  async function load() {
    setLoading(true)
    setError('')
    let sessionQuery = supabase
      .from('practice_sessions')
      .select('*')
      .order('practice_date', { ascending: false })
      .limit(60)
    if (seasonFilter !== 'all') sessionQuery = sessionQuery.eq('season_id', seasonFilter)
    const { data: sessionData, error: sErr } = await sessionQuery
    if (sErr) { setError(sErr.message); setLoading(false); return }

    const { data: statRows, error: vErr } = await supabase
      .from('v_practice_stats')
      .select('*')
    if (vErr) { setError(vErr.message); setLoading(false); return }

    const withTotals = sessionData.map((s) => {
      const rows = statRows.filter((r) => r.practice_session_id === s.id)
      return {
        ...s,
        players: rows.length,
        pts: sum(rows, 'pts'),
        power5: sum(rows, 'power5'),
        turnovers: sum(rows, 'turnovers'),
      }
    })
    setSessions(withTotals)
    setLoading(false)
  }

  async function deleteSession(id) {
    if (!confirm('Delete this entire practice/game record? This cannot be undone.')) return
    const { error } = await supabase.from('practice_sessions').delete().eq('id', id)
    if (error) setError(error.message)
    else load()
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>Practice / game history</h2>
        <div style={{ minWidth: 180 }}>
          <label>Program season</label>
          <select value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)}>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>{s.is_current ? `★ ${s.label}` : s.label}</option>
            ))}
            <option value="all">All seasons</option>
          </select>
        </div>
      </div>
      {error && <div className="error-text">{error}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : sessions.length === 0 ? (
        <p className="muted">No sessions logged yet.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th># Players</th>
                <th>Team PTS</th>
                <th>Team Power 5</th>
                <th>Team TO</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.practice_date}</td>
                  <td>{s.session_type}</td>
                  <td>{s.players}</td>
                  <td>{s.pts}</td>
                  <td>{s.power5}</td>
                  <td>{s.turnovers}</td>
                  <td>
                    <div className="row">
                      <button className="secondary" onClick={() => onOpenSession(s.practice_date, s.session_type)}>
                        Open / edit
                      </button>
                      <button className="danger" onClick={() => deleteSession(s.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
