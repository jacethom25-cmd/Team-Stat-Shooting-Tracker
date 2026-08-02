import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { classifyFtSession, playerName, todayISO } from '../lib/helpers'

export default function FreeThrow() {
  const [players, setPlayers] = useState([]) // active only — used for the entry form
  const [allPlayers, setAllPlayers] = useState([]) // active + graduated/archived — used for personal bests
  const [sessions, setSessions] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [date, setDate] = useState(todayISO())
  const [sessionNum, setSessionNum] = useState(1)
  const [entries, setEntries] = useState({}) // player_id -> makes string

  async function loadAll() {
    setLoading(true)
    setError('')
    const [{ data: p, error: pErr }, { data: ap, error: apErr }, { data: s, error: sErr }] = await Promise.all([
      supabase.from('players').select('*').eq('active', true).order('last_name'),
      supabase.from('players').select('*').order('last_name'),
      supabase.from('ft_sessions').select('*, players(last_name,first_name)').order('session_date', { ascending: false }).limit(500),
    ])
    if (pErr) setError(pErr.message)
    else setPlayers(p)
    if (apErr) setError(apErr.message)
    else setAllPlayers(ap)
    if (sErr) setError(sErr.message)
    else setSessions(s)
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  function setEntry(playerId, value) {
    setEntries((prev) => ({ ...prev, [playerId]: value }))
  }

  async function saveSession(e) {
    e.preventDefault()
    const rowsToSave = players
      .filter((p) => entries[p.id] !== undefined && entries[p.id] !== '')
      .map((p) => ({
        player_id: p.id,
        session_date: date,
        session_number: sessionNum,
        makes: Number(entries[p.id]),
      }))
    if (rowsToSave.length === 0) return
    const { error } = await supabase
      .from('ft_sessions')
      .upsert(rowsToSave, { onConflict: 'player_id,session_date,session_number' })
    if (error) setError(error.message)
    else {
      setEntries({})
      loadAll()
    }
  }

  // Personal bests across all logged sessions
  const personalBests = {}
  sessions.forEach((s) => {
    if (!personalBests[s.player_id] || s.makes > personalBests[s.player_id].makes) {
      personalBests[s.player_id] = s
    }
  })

  return (
    <div>
      <div className="card">
        <h2>FT Ladder — log a session (out of 20)</h2>
        <p className="muted small">
          Standard = 16+, Great = 19-20. Run the ladder multiple times in one practice by
          bumping the session number — each session is tracked separately and your all-time
          best is kept automatically.
        </p>
        <div className="row">
          <div>
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div style={{ width: 110 }}>
            <label>Session #</label>
            <input type="number" min="1" value={sessionNum} onChange={(e) => setSessionNum(Number(e.target.value))} />
          </div>
        </div>
        <form onSubmit={saveSession}>
          <div className="table-scroll" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr><th className="name-cell">Player</th><th>Makes (of 20)</th><th>Result</th></tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  const val = entries[p.id] ?? ''
                  const flags = val !== '' ? classifyFtSession(Number(val)) : []
                  return (
                    <tr key={p.id}>
                      <td className="name-cell">{playerName(p)}</td>
                      <td>
                        <input
                          className="stat-input"
                          type="number"
                          min="0"
                          max="20"
                          value={val}
                          onChange={(e) => setEntry(p.id, e.target.value)}
                        />
                      </td>
                      <td>
                        {flags.includes('great') && <span className="pill great">GREAT</span>}
                        {flags.includes('good') && <span className="pill good">GOOD</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <button className="primary" type="submit" style={{ marginTop: 12 }}>Save session</button>
        </form>
        {error && <div className="error-text">{error}</div>}
      </div>

      <div className="card">
        <h2>Personal bests</h2>
        <p className="muted small">
          Includes graduated/archived players who still hold a personal best — deactivating
          someone on the Roster tab never erases their record.
        </p>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th className="name-cell">Player</th><th>Best (of 20)</th><th>Date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {allPlayers
                  .filter((p) => p.active || personalBests[p.id])
                  .sort((a, b) => (personalBests[b.id]?.makes || -1) - (personalBests[a.id]?.makes || -1))
                  .map((p) => {
                    const pb = personalBests[p.id]
                    return (
                      <tr key={p.id}>
                        <td className="name-cell">{playerName(p)}</td>
                        <td><strong>{pb ? pb.makes : '—'}</strong></td>
                        <td>{pb ? pb.session_date : '—'}</td>
                        <td>{p.active ? <span className="pill good">ACTIVE</span> : <span className="pill muted">GRADUATED</span>}</td>
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
