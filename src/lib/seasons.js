// Shared helpers for the season toggle. Seasons only scope practice/live
// tracking data (practice_sessions and everything that hangs off it) --
// shooting drills, FT ladder, and conditioning stay all-time on purpose.
import { supabase } from '../supabaseClient'

export async function getAllSeasons() {
  const { data, error } = await supabase.from('seasons').select('*').order('start_date', { ascending: false, nullsFirst: false }).order('label', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getCurrentSeason() {
  const { data, error } = await supabase.from('seasons').select('*').eq('is_current', true).maybeSingle()
  if (error) throw error
  return data || null
}

export async function createSeason(label, startDate) {
  const { data, error } = await supabase
    .from('seasons')
    .insert({ label, start_date: startDate || null })
    .select()
    .single()
  if (error) throw error
  return data
}

// Not atomic across two statements, but fine for a single-coach tool -- the
// partial unique index on seasons(is_current) still guarantees the DB never
// ends up with two current seasons even if this races.
export async function setCurrentSeason(seasonId) {
  const { error: clearErr } = await supabase.from('seasons').update({ is_current: false }).eq('is_current', true)
  if (clearErr) throw clearErr
  const { error: setErr } = await supabase.from('seasons').update({ is_current: true }).eq('id', seasonId)
  if (setErr) throw setErr
}

// Finds (or creates) the practice_sessions row for a date+type. Deliberately
// does NOT upsert-overwrite season_id on an existing row -- only a brand new
// row gets tagged with the given season, so revisiting/editing an old date
// never silently reassigns it to whatever season happens to be current now.
export async function ensurePracticeSession(date, sessionType, seasonId) {
  const { data: existing, error: selErr } = await supabase
    .from('practice_sessions')
    .select('*')
    .eq('practice_date', date)
    .eq('session_type', sessionType)
    .maybeSingle()
  if (selErr) throw selErr
  if (existing) return existing

  const { data: created, error: insErr } = await supabase
    .from('practice_sessions')
    .insert({ practice_date: date, session_type: sessionType, season_id: seasonId })
    .select()
    .single()
  if (insErr) throw insErr
  return created
}
