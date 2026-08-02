import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { playerName, todayISO } from '../lib/helpers'

function academicYearLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const y = d.getFullYear()
  const m = d.getMonth() + 1 // Jan=1
  // Assume season "starts" in fall: Aug-Dec => YYYY-(YYYY+1), Jan-Jul => (YYYY-1)-YYYY
  return m >= 8 ? `${y}-${String(y + 1).slice(2)}` : `${y - 1}-${String(y).slice(2)}`
}

export default function Conditioning() {
  const [players, setPlayers] = useState([])
  const [results, setResults] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [date, setDate] = useState(todayISO())
  const [entries, setEntries] = useState({}) // player_id -> {three,two,one}

  async function loadAll() {
    setLoading(true)
    setError('')
    const [{ data: p, error: pErr }, { data: r, error: rErr }] = await Promise.all([
      supabase.from('players').select('*').eq('active', true).order('last_name'),
      supabase.from('conditioning_results').select('*, players(last_name,first_name)').order('test_date', { ascending: false }),
    ])
    if (pErr) setError(pErr.message)
    else setPlayers(p)
    if (rErr) setError(rErr.message)
    else setResults(r)
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  function setField(playerId, field, value) {
    setEntries((prev) => ({ ...prev, [playerId]: { ...prev[playerId], [field]: value } }))
  }

  async function saveAll(e) {
    e.preventDefault()
    const season = academicYearLabel(date)
    const rows = players
      .filter((p) => entries[p.id])
      .map((p) => ({
        player_id: p.id,
        test_date: date,
        season_label: season,
        three_min: Number(entries[p.id]?.three || 0),
        two_min: Number(entries[p.id]?.two || 0),
        one_min: Number(entries[p.id]?.one || 0),
      }))
    if (rows.length === 0) return
    const { error } = await supabase.from('conditioning_results').insert(rows)
    if (error) setError(error.message)
    else {
      setEntries({})
      loadAll()
    }
  }

  const totals = (r) => (Number(r.three_min) || 0) + (Number(r.two_min) || 0) + (Number(r.one_min) || 0)

  // program highs (all-time, across every season)
  let programHigh = null
  results.forEach((r) => {
    const t = totals(r)
    if (!programHigh || t > totals(programHigh)) programHigh = r
  })

  // best total per player, grouped, for the season-progression view
  const byPlayer = {}
  results.forEach((r) => {
    if (!byPlayer[r.player_id]) byPlayer[r.player_id] = []
    byPlayer[r.player_id].push(r)
  })

  return (
    <div>
      <div className="card">
        <h2>Log conditioning test</h2>
        <p className="muted small">Season label auto-detected from the date ({academicYearLabel(date)}) so multi-year progress stays organized.</p>
        <label>Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ maxWidth: 200 }} />
        <form onSubmit={saveAll}>
          <div className="table-scroll" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr><th className="name-cell">Player</th><th>3 min</th><th>2 min</th><th>1 min</th><th>Total</th></tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  const e3 = entries[p.id] || {}
                  const total = (Number(e3.three) || 0) + (Number(e3.two) || 0) + (Number(e3.one) || 0)
                  return (
                    <tr key={p.id}>
                      <td className="name-cell">{playerName(p)}</td>
                      <td><input className="stat-input" type="number" value={e3.three || ''} onChange={(ev) => setField(p.id, 'three', ev.target.value)} /></td>
                      <td><input className="stat-input" type="number" value={e3.two || ''} onChange={(ev) => setField(p.id, 'two', ev.target.value)} /></td>
                      <td><input className="stat-input" type="number" value={e3.one || ''} onChange={(ev) => setField(p.id, 'one', ev.target.value)} /></td>
                      <td><strong>{total || '—'}</strong></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <button className="primary" type="submit" style={{ marginTop: 12 }}>Save results</button>
        </form>
        {error && <div className="error-text">{error}</div>}
      </div>

      <div className="card">
        <h2>Program high</h2>
        {programHigh ? (
          <p>
            <strong>{totals(programHigh)}</strong> total by {playerName(programHigh.players)} on {programHigh.test_date} ({programHigh.season_label})
          </p>
        ) : (
          <p className="muted">No results logged yet.</p>
        )}
      </div>

      <div className="card">
        <h2>Player progression across years</h2>
        {loading ? <p className="muted">Loading…</p> : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th className="name-cell">Player</th><th>Season</th><th>Date</th><th>3 min</th><th>2 min</th><th>1 min</th><th>Total</th><th>Rank (that day)</th></tr>
              </thead>
              <tbody>
                {results.map((r) => {
                  const dayResults = results.filter((x) => x.test_date === r.test_date)
                  const rank = [...dayResults].sort((a, b) => totals(b) - totals(a)).findIndex((x) => x.id === r.id) + 1
                  return (
                    <tr key={r.id}>
                      <td className="name-cell">{playerName(r.players)}</td>
                      <td>{r.season_label}</td>
                      <td>{r.test_date}</td>
                      <td>{r.three_min}</td>
                      <td>{r.two_min}</td>
                      <td>{r.one_min}</td>
                      <td><strong>{totals(r)}</strong></td>
                      <td>{rank}</td>
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
