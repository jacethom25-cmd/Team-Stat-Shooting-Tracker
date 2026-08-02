import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { classifyAttempt, playerName, todayISO } from '../lib/helpers'

export default function Shooting() {
  const [drills, setDrills] = useState([])
  const [players, setPlayers] = useState([])
  const [recent, setRecent] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // log attempt form
  const [drillId, setDrillId] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [attemptDate, setAttemptDate] = useState(todayISO())
  const [sessionNum, setSessionNum] = useState(1)
  const [makes, setMakes] = useState('')
  const [lastResult, setLastResult] = useState(null)

  // new drill form
  const [showNewDrill, setShowNewDrill] = useState(false)
  const [nd, setNd] = useState({ name: '', total_shots: '', time_limit: '', standard: '', great: '', description: '' })

  // --- team drills ---
  const [teamDrills, setTeamDrills] = useState([])
  const [teamRecent, setTeamRecent] = useState([])
  const [teamDrillId, setTeamDrillId] = useState('')
  const [teamAttemptDate, setTeamAttemptDate] = useState(todayISO())
  const [teamSessionNum, setTeamSessionNum] = useState(1)
  const [teamScore, setTeamScore] = useState('')
  const [teamLastResult, setTeamLastResult] = useState(null)
  const [showNewTeamDrill, setShowNewTeamDrill] = useState(false)
  const [ntd, setNtd] = useState({ name: '', total_shots: '', time_limit: '', standard: '', great: '', description: '' })

  // every player (active + graduated) for the record-holder dropdown
  const [allPlayers, setAllPlayers] = useState([])

  async function loadAll() {
    setLoading(true)
    setError('')
    const [
      { data: d, error: dErr },
      { data: p, error: pErr },
      { data: r, error: rErr },
      { data: td, error: tdErr },
      { data: tr, error: trErr },
      { data: ap, error: apErr },
    ] = await Promise.all([
      supabase.from('shooting_drills').select('*, record_holder:players!shooting_drills_record_holder_id_fkey(last_name,first_name)').eq('active', true).order('name'),
      supabase.from('players').select('*').eq('active', true).order('last_name'),
      supabase.from('shooting_attempts').select('*, players(last_name,first_name), shooting_drills(name)').order('created_at', { ascending: false }).limit(25),
      supabase.from('team_drills').select('*').eq('active', true).order('name'),
      supabase.from('team_drill_attempts').select('*, team_drills(name)').order('created_at', { ascending: false }).limit(25),
      supabase.from('players').select('id,first_name,last_name,active').order('last_name'),
    ])
    if (dErr) setError(dErr.message)
    else setDrills(d)
    if (pErr) setError(pErr.message)
    else setPlayers(p)
    if (rErr) setError(rErr.message)
    else setRecent(r)
    if (tdErr) setError(tdErr.message)
    else setTeamDrills(td)
    if (trErr) setError(trErr.message)
    else setTeamRecent(tr)
    if (apErr) setError(apErr.message)
    else setAllPlayers(ap)
    setLoading(false)
  }

  function editDrillCell(id, field, value) {
    setDrills((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)))
  }

  async function saveDrillField(id, field, value) {
    const { error } = await supabase.from('shooting_drills').update({ [field]: value }).eq('id', id)
    if (error) setError(error.message)
  }

  function editTeamDrillCell(id, field, value) {
    setTeamDrills((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)))
  }

  async function saveTeamDrillField(id, field, value) {
    const { error } = await supabase.from('team_drills').update({ [field]: value }).eq('id', id)
    if (error) setError(error.message)
  }

  useEffect(() => { loadAll() }, [])

  async function logAttempt(e) {
    e.preventDefault()
    if (!drillId || !playerId || makes === '') return
    const drill = drills.find((d) => d.id === drillId)
    const { error } = await supabase.from('shooting_attempts').insert({
      drill_id: drillId,
      player_id: playerId,
      attempt_date: attemptDate,
      session_number: sessionNum,
      makes: Number(makes),
    })
    if (error) { setError(error.message); return }
    const flags = classifyAttempt(Number(makes), drill)
    setLastResult({ flags, makes: Number(makes), drillName: drill.name })
    setMakes('')
    loadAll()
  }

  async function addDrill(e) {
    e.preventDefault()
    if (!nd.name.trim()) return
    const { error } = await supabase.from('shooting_drills').insert({
      name: nd.name.trim(),
      total_shots: nd.total_shots || null,
      time_limit: nd.time_limit || null,
      standard: nd.standard === '' ? null : Number(nd.standard),
      great: nd.great === '' ? null : Number(nd.great),
      description: nd.description || null,
    })
    if (error) setError(error.message)
    else {
      setNd({ name: '', total_shots: '', time_limit: '', standard: '', great: '', description: '' })
      setShowNewDrill(false)
      loadAll()
    }
  }

  async function logTeamAttempt(e) {
    e.preventDefault()
    if (!teamDrillId || teamScore === '') return
    const drill = teamDrills.find((d) => d.id === teamDrillId)
    const { error } = await supabase.from('team_drill_attempts').insert({
      drill_id: teamDrillId,
      attempt_date: teamAttemptDate,
      session_number: teamSessionNum,
      score: Number(teamScore),
    })
    if (error) { setError(error.message); return }
    const flags = classifyAttempt(Number(teamScore), { standard: drill.standard, great: drill.great, program_high: drill.team_high })
    setTeamLastResult({ flags, score: Number(teamScore), drillName: drill.name })
    setTeamScore('')
    loadAll()
  }

  async function addTeamDrill(e) {
    e.preventDefault()
    if (!ntd.name.trim()) return
    const { error } = await supabase.from('team_drills').insert({
      name: ntd.name.trim(),
      total_shots: ntd.total_shots || null,
      time_limit: ntd.time_limit || null,
      standard: ntd.standard === '' ? null : Number(ntd.standard),
      great: ntd.great === '' ? null : Number(ntd.great),
      description: ntd.description || null,
    })
    if (error) setError(error.message)
    else {
      setNtd({ name: '', total_shots: '', time_limit: '', standard: '', great: '', description: '' })
      setShowNewTeamDrill(false)
      loadAll()
    }
  }

  return (
    <div>
      <h2 style={{ marginBottom: 4 }}>Individual player drills</h2>
      <p className="muted small" style={{ marginTop: 0 }}>Logged per player — tracks personal bests and program records for each drill.</p>
      <div className="card">
        <h2>Log a shooting attempt</h2>
        <form onSubmit={logAttempt} className="row">
          <div style={{ flex: '1 1 220px' }}>
            <label>Drill</label>
            <select value={drillId} onChange={(e) => setDrillId(e.target.value)} required>
              <option value="">Select a drill…</option>
              {drills.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label>Player</label>
            <select value={playerId} onChange={(e) => setPlayerId(e.target.value)} required>
              <option value="">Select…</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{playerName(p)}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Date</label>
            <input type="date" value={attemptDate} onChange={(e) => setAttemptDate(e.target.value)} />
          </div>
          <div style={{ width: 90 }}>
            <label>Session #</label>
            <input type="number" min="1" value={sessionNum} onChange={(e) => setSessionNum(Number(e.target.value))} />
          </div>
          <div style={{ width: 90 }}>
            <label>Makes</label>
            <input type="number" min="0" value={makes} onChange={(e) => setMakes(e.target.value)} required />
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button className="primary" type="submit">Log attempt</button>
          </div>
        </form>
        {lastResult && (
          <p style={{ marginTop: 10 }}>
            Logged {lastResult.makes} on {lastResult.drillName}:{' '}
            {lastResult.flags.length === 0 && <span className="pill muted">Logged</span>}
            {lastResult.flags.includes('good') && <span className="pill good">GOOD</span>}{' '}
            {lastResult.flags.includes('great') && <span className="pill great">GREAT</span>}{' '}
            {lastResult.flags.includes('pr') && <span className="pill pr">NEW PR 🎉</span>}
          </p>
        )}
        {error && <div className="error-text">{error}</div>}
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>Drill catalog</h2>
          <button className="secondary" onClick={() => setShowNewDrill((s) => !s)}>
            {showNewDrill ? 'Cancel' : '+ New drill'}
          </button>
        </div>
        {showNewDrill && (
          <form onSubmit={addDrill} className="row" style={{ marginBottom: 14 }}>
            <div style={{ flex: '1 1 180px' }}>
              <label>Drill name</label>
              <input value={nd.name} onChange={(e) => setNd({ ...nd, name: e.target.value })} required />
            </div>
            <div style={{ width: 100 }}>
              <label>Total shots</label>
              <input value={nd.total_shots} onChange={(e) => setNd({ ...nd, total_shots: e.target.value })} />
            </div>
            <div style={{ width: 110 }}>
              <label>Time limit</label>
              <input value={nd.time_limit} onChange={(e) => setNd({ ...nd, time_limit: e.target.value })} />
            </div>
            <div style={{ width: 100 }}>
              <label>Standard ("Good")</label>
              <input type="number" value={nd.standard} onChange={(e) => setNd({ ...nd, standard: e.target.value })} />
            </div>
            <div style={{ width: 100 }}>
              <label>Great</label>
              <input type="number" value={nd.great} onChange={(e) => setNd({ ...nd, great: e.target.value })} />
            </div>
            <div style={{ flex: '1 1 240px' }}>
              <label>Description</label>
              <input value={nd.description} onChange={(e) => setNd({ ...nd, description: e.target.value })} />
            </div>
            <div style={{ alignSelf: 'flex-end' }}>
              <button className="primary" type="submit">Save drill</button>
            </div>
          </form>
        )}
        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <div className="table-scroll">
            <p className="small muted">Click any field to edit — saves automatically when you click away.</p>
            <table>
              <thead>
                <tr>
                  <th className="name-cell">Drill</th>
                  <th>Total</th>
                  <th>Time</th>
                  <th>Standard (Good)</th>
                  <th>Great</th>
                  <th>Program High</th>
                  <th>Record Holder</th>
                </tr>
              </thead>
              <tbody>
                {drills.map((d) => (
                  <tr key={d.id}>
                    <td className="name-cell">
                      <input
                        style={{ width: 170 }}
                        value={d.name || ''}
                        onChange={(e) => editDrillCell(d.id, 'name', e.target.value)}
                        onBlur={(e) => saveDrillField(d.id, 'name', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="stat-input"
                        value={d.total_shots || ''}
                        onChange={(e) => editDrillCell(d.id, 'total_shots', e.target.value)}
                        onBlur={(e) => saveDrillField(d.id, 'total_shots', e.target.value || null)}
                      />
                    </td>
                    <td>
                      <input
                        style={{ width: 90 }}
                        value={d.time_limit || ''}
                        onChange={(e) => editDrillCell(d.id, 'time_limit', e.target.value)}
                        onBlur={(e) => saveDrillField(d.id, 'time_limit', e.target.value || null)}
                      />
                    </td>
                    <td>
                      <input
                        className="stat-input"
                        type="number"
                        value={d.standard ?? ''}
                        onChange={(e) => editDrillCell(d.id, 'standard', e.target.value)}
                        onBlur={(e) => saveDrillField(d.id, 'standard', e.target.value === '' ? null : Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        className="stat-input"
                        type="number"
                        value={d.great ?? ''}
                        onChange={(e) => editDrillCell(d.id, 'great', e.target.value)}
                        onBlur={(e) => saveDrillField(d.id, 'great', e.target.value === '' ? null : Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        className="stat-input"
                        type="number"
                        style={{ fontWeight: 700 }}
                        value={d.program_high ?? ''}
                        onChange={(e) => editDrillCell(d.id, 'program_high', e.target.value)}
                        onBlur={(e) => saveDrillField(d.id, 'program_high', e.target.value === '' ? null : Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <select
                        style={{ width: 150 }}
                        value={d.record_holder_id || ''}
                        onChange={(e) => {
                          const v = e.target.value || null
                          editDrillCell(d.id, 'record_holder_id', v)
                          saveDrillField(d.id, 'record_holder_id', v)
                        }}
                      >
                        <option value="">—</option>
                        {allPlayers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {playerName(p)}{!p.active ? ' (grad)' : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Recent attempts</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Date</th><th>Drill</th><th>Player</th><th>Sess.</th><th>Makes</th></tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id}>
                  <td>{r.attempt_date}</td>
                  <td>{r.shooting_drills?.name}</td>
                  <td>{playerName(r.players)}</td>
                  <td>{r.session_number}</td>
                  <td>{r.makes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <h2 style={{ marginBottom: 4, marginTop: 28 }}>Team drills</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        Logged as one team-wide score per attempt (no individual player) — tracks the team's
        all-time high so you know the goal to chase in future practices.
      </p>
      <div className="card">
        <h2>Log a team attempt</h2>
        <form onSubmit={logTeamAttempt} className="row">
          <div style={{ flex: '1 1 220px' }}>
            <label>Drill</label>
            <select value={teamDrillId} onChange={(e) => setTeamDrillId(e.target.value)} required>
              <option value="">Select a drill…</option>
              {teamDrills.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Date</label>
            <input type="date" value={teamAttemptDate} onChange={(e) => setTeamAttemptDate(e.target.value)} />
          </div>
          <div style={{ width: 90 }}>
            <label>Session #</label>
            <input type="number" min="1" value={teamSessionNum} onChange={(e) => setTeamSessionNum(Number(e.target.value))} />
          </div>
          <div style={{ width: 100 }}>
            <label>Team score</label>
            <input type="number" min="0" value={teamScore} onChange={(e) => setTeamScore(e.target.value)} required />
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button className="primary" type="submit">Log team attempt</button>
          </div>
        </form>
        {teamLastResult && (
          <p style={{ marginTop: 10 }}>
            Logged {teamLastResult.score} on {teamLastResult.drillName}:{' '}
            {teamLastResult.flags.length === 0 && <span className="pill muted">Logged</span>}
            {teamLastResult.flags.includes('good') && <span className="pill good">GOOD</span>}{' '}
            {teamLastResult.flags.includes('great') && <span className="pill great">GREAT</span>}{' '}
            {teamLastResult.flags.includes('pr') && <span className="pill pr">NEW TEAM HIGH 🎉</span>}
          </p>
        )}
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>Team drill catalog</h2>
          <button className="secondary" onClick={() => setShowNewTeamDrill((s) => !s)}>
            {showNewTeamDrill ? 'Cancel' : '+ New team drill'}
          </button>
        </div>
        {showNewTeamDrill && (
          <form onSubmit={addTeamDrill} className="row" style={{ marginBottom: 14 }}>
            <div style={{ flex: '1 1 180px' }}>
              <label>Drill name</label>
              <input value={ntd.name} onChange={(e) => setNtd({ ...ntd, name: e.target.value })} required />
            </div>
            <div style={{ width: 100 }}>
              <label>Total shots</label>
              <input value={ntd.total_shots} onChange={(e) => setNtd({ ...ntd, total_shots: e.target.value })} />
            </div>
            <div style={{ width: 110 }}>
              <label>Time limit</label>
              <input value={ntd.time_limit} onChange={(e) => setNtd({ ...ntd, time_limit: e.target.value })} />
            </div>
            <div style={{ width: 100 }}>
              <label>Standard ("Good")</label>
              <input type="number" value={ntd.standard} onChange={(e) => setNtd({ ...ntd, standard: e.target.value })} />
            </div>
            <div style={{ width: 100 }}>
              <label>Great</label>
              <input type="number" value={ntd.great} onChange={(e) => setNtd({ ...ntd, great: e.target.value })} />
            </div>
            <div style={{ flex: '1 1 240px' }}>
              <label>Description</label>
              <input value={ntd.description} onChange={(e) => setNtd({ ...ntd, description: e.target.value })} />
            </div>
            <div style={{ alignSelf: 'flex-end' }}>
              <button className="primary" type="submit">Save team drill</button>
            </div>
          </form>
        )}
        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <div className="table-scroll">
            <p className="small muted">Click any field to edit — saves automatically when you click away.</p>
            <table>
              <thead>
                <tr>
                  <th className="name-cell">Drill</th>
                  <th>Total</th>
                  <th>Time</th>
                  <th>Standard (Good)</th>
                  <th>Great</th>
                  <th>Team High</th>
                </tr>
              </thead>
              <tbody>
                {teamDrills.map((d) => (
                  <tr key={d.id}>
                    <td className="name-cell">
                      <input
                        style={{ width: 170 }}
                        value={d.name || ''}
                        onChange={(e) => editTeamDrillCell(d.id, 'name', e.target.value)}
                        onBlur={(e) => saveTeamDrillField(d.id, 'name', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="stat-input"
                        value={d.total_shots || ''}
                        onChange={(e) => editTeamDrillCell(d.id, 'total_shots', e.target.value)}
                        onBlur={(e) => saveTeamDrillField(d.id, 'total_shots', e.target.value || null)}
                      />
                    </td>
                    <td>
                      <input
                        style={{ width: 90 }}
                        value={d.time_limit || ''}
                        onChange={(e) => editTeamDrillCell(d.id, 'time_limit', e.target.value)}
                        onBlur={(e) => saveTeamDrillField(d.id, 'time_limit', e.target.value || null)}
                      />
                    </td>
                    <td>
                      <input
                        className="stat-input"
                        type="number"
                        value={d.standard ?? ''}
                        onChange={(e) => editTeamDrillCell(d.id, 'standard', e.target.value)}
                        onBlur={(e) => saveTeamDrillField(d.id, 'standard', e.target.value === '' ? null : Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        className="stat-input"
                        type="number"
                        value={d.great ?? ''}
                        onChange={(e) => editTeamDrillCell(d.id, 'great', e.target.value)}
                        onBlur={(e) => saveTeamDrillField(d.id, 'great', e.target.value === '' ? null : Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        className="stat-input"
                        type="number"
                        style={{ fontWeight: 700 }}
                        value={d.team_high ?? ''}
                        onChange={(e) => editTeamDrillCell(d.id, 'team_high', e.target.value)}
                        onBlur={(e) => saveTeamDrillField(d.id, 'team_high', e.target.value === '' ? null : Number(e.target.value))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Recent team attempts</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Date</th><th>Drill</th><th>Sess.</th><th>Score</th></tr>
            </thead>
            <tbody>
              {teamRecent.map((r) => (
                <tr key={r.id}>
                  <td>{r.attempt_date}</td>
                  <td>{r.team_drills?.name}</td>
                  <td>{r.session_number}</td>
                  <td>{r.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
