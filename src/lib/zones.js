// Shared zone definitions for the shot chart — used by both the Live Tracker
// (to log a shot's location) and the Shot Chart page (to display it).
export const ZONES = [
  { key: 'left_corner_3', label: 'L Corner 3', type: '3PT' },
  { key: 'left_wing_3', label: 'L Wing 3', type: '3PT' },
  { key: 'top_key_3', label: 'Top Key 3', type: '3PT' },
  { key: 'right_wing_3', label: 'R Wing 3', type: '3PT' },
  { key: 'right_corner_3', label: 'R Corner 3', type: '3PT' },
  { key: 'paint', label: 'Paint', type: '2PT' },
  { key: 'mid_range', label: 'Mid-Range', type: '2PT' },
]

export function zoneByKey(key) {
  return ZONES.find((z) => z.key === key)
}
