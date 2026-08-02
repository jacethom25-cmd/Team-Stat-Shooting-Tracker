import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { todayISO, playerName } from '../lib/helpers'
import { ZONES, zoneByKey } from '../lib/zones'

const BLANK_ROW = {
  win: 0, loss: 0, fgm2: 0, fga2: 0, fgm3: 0, fga3: 0, ftm: 0, fta: 0,
  oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, fouls_taken: 0,
  turnovers: 0, missed_reb: 0, paint_allowed: 0, eye_ball: 0, dlapse: 0,
  crashes: 0, paint_touch: 0, force_missed: 0, screen_assist: 0, plus_minus: 0,
}

const BLANK_LINEUP = { team_color: null, on_floor: false, off_possessions: 0, def_possessions: 0 }

const FT_BUTTON = { label: 'FT', made: 'ftm', attempted: 'fta' }

const STAT_GROUPS = [
  {
    title: 'Power 5',
    color: 'good',
    fields: [
      ['oreb', 'OREB'], ['dreb', 'DREB'], ['ast', 'AST'],
      ['stl', 'STL'], ['blk', 'BLK'], ['fouls_taken', 'Fouls Taken'],
    ],
  },
  {
    title: 'Negative stats',
    color: 'bad',
    fields: [
      ['turnovers', 'Turnover'], ['missed_reb', 'Missed Reb'],
      ['paint_allowed', 'Paint Allowed'], ['eye_ball', 'Eye Ball'], ['dlapse', 'Dlapse'],
    ],
  },
  {
    title: 'Extras',
    color: 'great',
    fields: [
      ['crashes', 'Crashes'], ['paint_touch', 'Paint Touch'],
      ['force_missed', 'Force Missed'], ['screen_assist', 'Screen Assist'],
    ],
  },
]

export default function LiveTracker() {
  const [date, setDate] = useState(todayISO())
  const [sessionType, setSessionType] = useState('Practice')
  const [sessionId, setSessionId] = useState(null)
  const [players, setPlayers] = useState([])
  const [stats, setStats] = useState({}) // player_id -> full day-level stat row
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastSaved, setLastSaved] = useState(null)

  const [drills, setDrills] = useState([])
  const [currentDrillId, setCurrentDrillId] = useState(null)
  const [newDrillName, setNewDrillName] = useState('')
  const [lineups, setLineups] = useState({}) // player_id -> {team_color, on_floor, off_possessions, def_possessions}
  const [pendingZone, setPendingZone] = useState(null)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, sessionType])

  useEffect(() => {
    if (currentDrillId) loadLineups(currentDrillId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDrillId])

  useEffect(() => {
    setPendingZone(null)
  }, [selectedId, currentDrillId])

  async function load() {
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
    if (!selectedId && playerData.length) setSelectedId(playerData[0].id)

    // make sure today's session exists so every tap has somewhere to save to
    const { data: session, error: sessErr } = await supabase
      .from('practice_sessions')
      .upsert({ practice_date: date, session_type: sessionType }, { onConflict: 'practice_date,session_type' })
      .select()
      .single()
    if (sessErr) { setError(sessErr.message); setLoading(false); return }
    setSessionId(session.id)

    const initial = {}
    playerData.forEach((p) => { initial[p.id] = { ...BLANK_ROW } })
    const { data: statRows } = await supabase
      .from('practice_stats')
      .select('*')
      .eq('practice_session_id', session.id)
    statRows?.forEach((row) => {
      if (initial[row.player_id]) {
        const merged = { ...BLANK_ROW }
        Object.keys(BLANK_ROW).forEach((k) => { merged[k] = row[k] ?? 0 })
        initial[row.player_id] = merged
      }
    })
    setStats(initial)

    // load (or create the first) drill for this practice day
    const { data: drillRows, error: drillErr } = await supabase
      .from('practice_drills')
      .select('*')
      .eq('practice_session_id', session.id)
      .order('sequence')
    if (drillErr) { setError(drillErr.message); setLoading(false); return }

    if (drillRows.length === 0) {
      const { data: firstDrill, error: firstErr } = await supabase
        .from('practice_drills')
        .insert({ practice_session_id: session.id, name: 'Drill 1', sequence: 1 })
        .select()
        .single()
      if (firstErr) { setError(firstErr.message); setLoading(false); return }
      setDrills([firstDrill])
      setCurrentDrillId(firstDrill.id)
    } else {
      setDrills(drillRows)
      setCurrentDrillId((prev) => (drillRows.some((d) => d.id === prev) ? prev : drillRows[drillRows.length - 1].id))
    }
    setLoading(false)
  }

  async function loadLineups(drillId) {
    const blank = {}
    players.forEach((p) => { blank[p.id] = { ...BLANK_LINEUP } })
    const { data, error } = await supabase
      .from('drill_lineups')
      .select('*')
      .eq('practice_drill_id', drillId)
    if (error) { setError(error.message); return }
    data?.forEach((row) => {
      blank[row.player_id] = {
        team_color: row.team_color,
        on_floor: row.on_floor,
        off_possessions: row.off_possessions,
        def_possessions: row.def_possessions,
      }
    })
    setLineups(blank)
  }

  async function createDrill() {
    if (!newDrillName.trim() || !sessionId) return
    const nextSeq = (drills[drills.length - 1]?.sequence || 0) + 1
    const { data, error } = await supabase
      .from('practice_drills')
      .insert({ practice_session_id: sessionId, name: newDrillName.trim(), sequence: nextSeq })
      .select()
      .single()
    if (error) { setError(error.message); return }
    setDrills((prev) => [...prev, data])
    setCurrentDrillId(data.id)
    setNewDrillName('')
  }

  async function persist(playerId, row) {
    const { error } = await supabase
      .from('practice_stats')
      .upsert(
        { practice_session_id: sessionId, player_id: playerId, ...row },
        { onConflict: 'practice_session_id,player_id' }
      )
    if (error) setError(error.message)
    else setLastSaved(new Date().toLocaleTimeString())
  }

  function bump(playerId, deltas) {
    setStats((prev) => {
      const current = prev[playerId] || { ...BLANK_ROW }
      const updated = { ...current }
      Object.entries(deltas).forEach(([key, delta]) => {
        const floor = key === 'plus_minus' ? -999 : 0
        updated[key] = Math.max(floor, (updated[key] || 0) + delta)
      })
      persist(playerId, updated)
      return { ...prev, [playerId]: updated }
    })
  }

  async function persistLineupRow(playerId, row) {
    const { error } = await supabase
      .from('drill_lineups')
      .upsert(
        { practice_drill_id: currentDrillId, player_id: playerId, ...row },
        { onConflict: 'practice_drill_id,player_id' }
      )
    if (error) setError(error.message)
  }

  function setOnFloor(playerId, value) {
    setLineups((prev) => {
      const updated = { ...(prev[playerId] || BLANK_LINEUP), on_floor: value }
      persistLineupRow(playerId, updated)
      return { ...prev, [playerId]: updated }
    })
  }

  function setTeamColor(playerId, color) {
    setLineups((prev) => {
      const current = prev[playerId] || BLANK_LINEUP
      const nextColor = current.team_color === color ? null : color
      const updated = { ...current, team_color: nextColor }
      persistLineupRow(playerId, updated)
      return { ...prev, [playerId]: updated }
    })
  }

  // Only a made shot triggers possession credit on both sides — everything
  // else (misses, turnovers, steals, rebounds, etc.) is just a plain stat.
  // Also logs a possession_events row capturing exactly who was on the floor
  // for each side, so Dashboard can compute real Off/Def Rating later.
  function creditPossessions(shooterId, points) {
    const shooterTeam = lineups[shooterId]?.team_color
    if (!shooterTeam) return
    const updates = {}
    const offenseIds = []
    const defenseIds = []
    Object.entries(lineups).forEach(([pid, l]) => {
      if (!l.on_floor || !l.team_color) return
      if (l.team_color === shooterTeam) {
        updates[pid] = { ...l, off_possessions: (l.off_possessions || 0) + 1 }
        offenseIds.push(pid)
      } else {
        updates[pid] = { ...l, def_possessions: (l.def_possessions || 0) + 1 }
        defenseIds.push(pid)
      }
    })
    if (Object.keys(updates).length === 0) return
    setLineups((prev) => ({ ...prev, ...updates }))
    Object.entries(updates).forEach(([pid, row]) => persistLineupRow(pid, row))
    supabase.from('possession_events').insert({
      practice_session_id: sessionId,
      practice_drill_id: currentDrillId,
      shooter_id: shooterId,
      shooter_team: shooterTeam,
      points,
      offense_ids: offenseIds,
      defense_ids: defenseIds,
    }).then(({ error }) => { if (error) setError(error.message) })
  }

  function handleShot(btn, isMake) {
    if (!selectedId) return
    const deltas = { [btn.attempted]: 1 }
    if (isMake) deltas[btn.made] = 1
    bump(selectedId, deltas)
    if (isMake) creditPossessions(selectedId, 1)
  }

  async function logShotEvent(zone, made) {
    const { error } = await supabase.from('shot_events').insert({
      player_id: selectedId,
      practice_session_id: sessionId,
      practice_drill_id: currentDrillId,
      zone: zone.key,
      shot_type: zone.type,
      made,
    })
    if (error) setError(error.message)
  }

  function commitZoneShot(isMade) {
    if (!pendingZone || !selectedId) return
    const zone = zoneByKey(pendingZone)
    const madeField = zone.type === '3PT' ? 'fgm3' : 'fgm2'
    const attField = zone.type === '3PT' ? 'fga3' : 'fga2'
    const deltas = { [attField]: 1 }
    if (isMade) deltas[madeField] = 1
    bump(selectedId, deltas)
    if (isMade) creditPossessions(selectedId, zone.type === '3PT' ? 3 : 2)
    logShotEvent(zone, isMade)
    setPendingZone(null)
  }

  const half = Math.ceil(players.length / 2)
  const leftPlayers = players.slice(0, half)
  const rightPlayers = players.slice(half)
  const selected = players.find((p) => p.id === selectedId)
  const selectedStats = stats[selectedId] || BLANK_ROW

  // Compact stat button: tap the main face to +1, tap the small corner circle
  // to −1 (fixes a mis-tap) — avoids needing a whole separate row per stat.
  function StatChip({ label, value, color, onInc, onDec }) {
    return (
      <div className="stat-chip">
        <button className={`chip-main ${color}`} onClick={onInc}>
          {label}<strong>{value}</strong>
        </button>
        <button className="chip-minus" title={`Undo ${label}`} onClick={onDec}>−</button>
      </div>
    )
  }

  const rosterRow = (p) => {
    const l = lineups[p.id] || BLANK_LINEUP
    return (
      <div key={p.id}>
        <div className="roster-row">
          <input
            type="checkbox"
            title="On floor"
            style={{ width: 16, height: 16, flex: '0 0 auto' }}
            checked={l.on_floor}
            onChange={(e) => setOnFloor(p.id, e.target.checked)}
          />
          <button
            title="Assign Blue"
            className="team-btn"
            onClick={() => setTeamColor(p.id, 'Blue')}
            style={{
              border: l.team_color === 'Blue' ? '2px solid #3b82f6' : '1px solid var(--border)',
              background: l.team_color === 'Blue' ? '#3b82f6' : 'transparent', color: '#fff',
            }}
          >B</button>
          <button
            title="Assign White"
            className="team-btn"
            onClick={() => setTeamColor(p.id, 'White')}
            style={{
              border: l.team_color === 'White' ? '2px solid #e8eef4' : '1px solid var(--border)',
              background: l.team_color === 'White' ? '#e8eef4' : 'transparent',
              color: l.team_color === 'White' ? '#111' : '#e8eef4',
            }}
          >W</button>
          <button
            className={`name-btn ${p.id === selectedId ? 'primary' : 'secondary'}`}
            onClick={() => setSelectedId(p.id)}
          >
            {playerName(p)}
          </button>
        </div>
        {(l.off_possessions > 0 || l.def_possessions > 0) && (
          <div className="poss-line">OFF {l.off_possessions} · DEF {l.def_possessions}</div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="card" style={{ padding: 10, marginBottom: 10 }}>
        <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: '0 0 140px' }}>
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div style={{ flex: '0 0 110px' }}>
            <label>Type</label>
            <select value={sessionType} onChange={(e) => setSessionType(e.target.value)}>
              <option>Practice</option>
              <option>Game</option>
            </select>
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label>Current drill</label>
            <select value={currentDrillId || ''} onChange={(e) => setCurrentDrillId(e.target.value)}>
              {drills.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label>New drill name</label>
            <input
              value={newDrillName}
              placeholder="e.g. 3v3, 5v5"
              onChange={(e) => setNewDrillName(e.target.value)}
            />
          </div>
          <button className="primary" onClick={createDrill}>+ New drill</button>
          {lastSaved && <span className="small muted">Saved {lastSaved}</span>}
        </div>
        <p className="small muted" style={{ margin: '6px 0 0' }}>
          Check on-floor, tap B/W for team. Only a <strong>Made</strong> shot credits a possession to both sides.
        </p>
        {error && <div className="error-text">{error}</div>}
      </div>

      {loading ? (
        <p className="muted">Loading roster…</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 10 }} className="live-tracker-grid">
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Roster</h3>
            {leftPlayers.map(rosterRow)}
          </div>

          <div className="card">
            {selected ? (
              <>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                  <h2 style={{ margin: 0, fontSize: 18 }}>{playerName(selected)}</h2>
                  <span className="small muted">
                    2PT {selectedStats.fgm2}/{selectedStats.fga2} · 3PT {selectedStats.fgm3}/{selectedStats.fga3} · FT {selectedStats.ftm}/{selectedStats.fta}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, marginBottom: 4 }}>
                  {ZONES.filter((z) => z.type === '3PT').map((zone) => (
                    <button
                      key={zone.key}
                      className={pendingZone === zone.key ? 'primary' : 'secondary'}
                      style={{ fontSize: 11, padding: '7px 2px' }}
                      onClick={() => setPendingZone(zone.key)}
                    >
                      {zone.label}
                    </button>
                  ))}
                </div>
                <div className="row" style={{ gap: 4, marginBottom: 4, flexWrap: 'nowrap' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, flex: 1 }}>
                    {ZONES.filter((z) => z.type === '2PT').map((zone) => (
                      <button
                        key={zone.key}
                        className={pendingZone === zone.key ? 'primary' : 'secondary'}
                        style={{ fontSize: 11, padding: '7px 2px' }}
                        onClick={() => setPendingZone(zone.key)}
                      >
                        {zone.label}
                      </button>
                    ))}
                  </div>
                  <button className="secondary" style={{ flex: '0 0 auto', fontSize: 11, padding: '7px 10px' }} onClick={() => handleShot(FT_BUTTON, true)}>FT Make</button>
                  <button className="secondary" style={{ flex: '0 0 auto', fontSize: 11, padding: '7px 10px' }} onClick={() => handleShot(FT_BUTTON, false)}>FT Miss</button>
                </div>
                <div className="row" style={{ marginBottom: 8 }}>
                  <button
                    className="pill good"
                    disabled={!pendingZone}
                    style={{ flex: 1, border: 'none', padding: '9px 6px', cursor: pendingZone ? 'pointer' : 'not-allowed', opacity: pendingZone ? 1 : 0.5 }}
                    onClick={() => commitZoneShot(true)}
                  >
                    MAKE{pendingZone ? ` — ${zoneByKey(pendingZone).label}` : ''}
                  </button>
                  <button
                    className="pill bad"
                    disabled={!pendingZone}
                    style={{ flex: 1, border: 'none', padding: '9px 6px', cursor: pendingZone ? 'pointer' : 'not-allowed', opacity: pendingZone ? 1 : 0.5 }}
                    onClick={() => commitZoneShot(false)}
                  >
                    MISS{pendingZone ? ` — ${zoneByKey(pendingZone).label}` : ''}
                  </button>
                </div>

                <div className="stat-chip-grid">
                  {STAT_GROUPS.flatMap((group) =>
                    group.fields.map(([key, label]) => (
                      <StatChip
                        key={key}
                        label={label}
                        value={selectedStats[key]}
                        color={group.color}
                        onInc={() => bump(selectedId, { [key]: 1 })}
                        onDec={() => bump(selectedId, { [key]: -1 })}
                      />
                    ))
                  )}
                  <StatChip label="WIN" value={selectedStats.win} color="good" onInc={() => bump(selectedId, { win: 1 })} onDec={() => bump(selectedId, { win: -1 })} />
                  <StatChip label="LOSS" value={selectedStats.loss} color="bad" onInc={() => bump(selectedId, { loss: 1 })} onDec={() => bump(selectedId, { loss: -1 })} />
                  <StatChip label="+/-" value={selectedStats.plus_minus} color="great" onInc={() => bump(selectedId, { plus_minus: 1 })} onDec={() => bump(selectedId, { plus_minus: -1 })} />
                </div>
              </>
            ) : (
              <p className="muted">Select a player from either roster column.</p>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Roster</h3>
            {rightPlayers.map(rosterRow)}
          </div>
        </div>
      )}
    </div>
  )
}
