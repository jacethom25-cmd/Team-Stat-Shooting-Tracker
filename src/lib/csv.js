// Minimal CSV helpers — no dependency needed for something this simple.

function csvEscape(val) {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

// columns: [{ key, label }]; rows: array of objects
export function toCSV(rows, columns) {
  const header = columns.map((c) => csvEscape(c.label)).join(',')
  const body = rows.map((r) => columns.map((c) => csvEscape(r[c.key])).join(','))
  return [header, ...body].join('\n')
}

export function downloadCSV(filename, csvString) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function safeFileSlug(s) {
  return String(s).trim().replace(/[^a-z0-9]+/gi, '_')
}
