import { useEffect, useState } from 'react'
import { getAllSeasons, createSeason, setCurrentSeason } from '../lib/seasons'

const NEW_SEASON_VALUE = '__new__'

// Header control for the active season -- the one write target for new Live
// Tracker / Film Review entries. Switching seasons doesn't touch any data,
// it just changes which season new practice_sessions rows get tagged with;
// last season's stats stay in the database and are still viewable/exportable
// via the season filters on Dashboard, History, Shot Chart, and Player Report.
export default function SeasonSwitcher({ onChanged }) {
  const [seasons, setSeasons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      setSeasons(await getAllSeasons())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const current = seasons.find((s) => s.is_current)

  async function handleChange(e) {
    const value = e.target.value
    if (value === NEW_SEASON_VALUE) {
      const label = window.prompt('New season label (e.g. 2026-2027):')
      if (!label || !label.trim()) return
      const startDate = window.prompt('Start date for this season? (YYYY-MM-DD, optional -- cancel to skip)') || null
      try {
        const created = await createSeason(label.trim(), startDate)
        const ok = window.confirm(
          `Make "${created.label}" the active season now? New Live Tracker / Film Review entries will be logged under it. ` +
          `${current ? `"${current.label}" stays in the database and is still viewable from the Season filter on Dashboard, History, Shot Chart, and Player Report.` : ''}`
        )
        if (ok) await setCurrentSeason(created.id)
        await load()
        onChanged?.()
      } catch (err) {
        setError(err.message)
      }
      return
    }
    if (value === current?.id) return
    const target = seasons.find((s) => s.id === value)
    const ok = window.confirm(
      `Make "${target.label}" the active season? New Live Tracker / Film Review entries will be logged under it. ` +
      `${current ? `"${current.label}" stays in the database and is still viewable from the Season filter on Dashboard, History, Shot Chart, and Player Report.` : ''}`
    )
    if (!ok) return
    try {
      await setCurrentSeason(value)
      await load()
      onChanged?.()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <select
        value={current?.id || ''}
        onChange={handleChange}
        style={{ width: 'auto', padding: '6px 10px', fontSize: 13 }}
        title="Active season -- controls where new Live Tracker / Film Review stats are logged"
      >
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>{s.is_current ? `★ ${s.label}` : s.label}</option>
        ))}
        <option value={NEW_SEASON_VALUE}>+ New season…</option>
      </select>
      {error && <span className="error-text" style={{ fontSize: 11 }}>{error}</span>}
    </div>
  )
}
