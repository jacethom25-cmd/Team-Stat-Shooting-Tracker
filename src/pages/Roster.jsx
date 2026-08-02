import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const POSITIONS = ['PG', 'Wing', 'BIG']

export default function Roster() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newFirst, setNewFirst] = useState('')
  const [newLast, setNewLast] = useState('')
  const [newPos, setNewPos] = useState('Wing')
  const [showInactive, setShowInactive] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('last_name', { ascending: true })
    if (error) setError(error.message)
    else setPlayers(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function addPlayer(e) {
    e.preventDefault()
    if (!newLast.trim()) return
    const { error } = await supabase
      .from('players')
      .insert({ first_name: newFirst.trim() || null, last_name: newLast.trim(), position: newPos })
    if (error) setError(error.message)
    else {
      setNewFirst('')
      setNewLast('')
      setNewPos('Wing')
      load()
    }
  }

  async function updatePlayer(id, patch) {
    const { error } = await supabase.from('players').update(patch).eq('id', id)
    if (error) setError(error.message)
    else load()
  }

  async function removePlayer(id) {
    if (!confirm('Remove this player from the roster? Their historical stats stay in the database.')) return
    const { error } = await supabase.from('players').update({ active: false }).eq('id', id)
    if (error) setError(error.message)
    else load()
  }

  const visible = players.filter((p) => showInactive || p.active)

  return (
    <div>
      <div className="card">
        <h2>Add a player</h2>
        <form onSubmit={addPlayer} className="row">
          <div style={{ flex: '1 1 140px' }}>
            <label>First name</label>
            <input value={newFirst} onChange={(e) => setNewFirst(e.target.value)} />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label>Last name</label>
            <input value={newLast} onChange={(e) => setNewLast(e.target.value)} required />
          </div>
          <div style={{ flex: '1 1 120px' }}>
            <label>Position</label>
            <select value={newPos} onChange={(e) => setNewPos(e.target.value)}>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button className="primary" type="submit">Add to roster</button>
          </div>
        </form>
        {error && <div className="error-text">{error}</div>}
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>Roster ({visible.length})</h2>
          <label className="row small" style={{ gap: 6 }}>
            <input
              type="checkbox"
              style={{ width: 'auto' }}
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show inactive
          </label>
        </div>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th className="name-cell">Name</th>
                  <th>Position</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id}>
                    <td className="name-cell">
                      {p.first_name ? `${p.first_name} ${p.last_name}` : p.last_name}
                    </td>
                    <td>
                      <select
                        value={p.position}
                        onChange={(e) => updatePlayer(p.id, { position: e.target.value })}
                      >
                        {POSITIONS.map((pos) => (
                          <option key={pos} value={pos}>{pos}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {p.active ? (
                        <span className="pill good">ACTIVE</span>
                      ) : (
                        <span className="pill muted">INACTIVE</span>
                      )}
                    </td>
                    <td>
                      {p.active ? (
                        <button className="danger" onClick={() => removePlayer(p.id)}>Deactivate</button>
                      ) : (
                        <button className="secondary" onClick={() => updatePlayer(p.id, { active: true })}>Reactivate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
