export function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

export function isoDate(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

export function todayIsoLocal() {
  const d = new Date()
  return isoDate(d.getFullYear(), d.getMonth(), d.getDate())
}

// Converts a UTC ISO timestamp to the "YYYY-MM-DDTHH:MM" shape a
// <input type="datetime-local"> expects, in the browser's local time —
// plain .slice(0, 16) on the ISO string leaves it in UTC and drifts by
// the timezone offset every time it's redisplayed.
export function toDatetimeLocalValue(isoTs) {
  if (!isoTs) return ''
  const d = new Date(isoTs)
  return `${isoDate(d.getFullYear(), d.getMonth(), d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function timeAgo(isoTs) {
  const s = Math.floor((Date.now() - new Date(isoTs).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return m + 'm ago'
  const h = Math.floor(m / 60); if (h < 24) return h + 'h ago'
  const d = Math.floor(h / 24); return d + 'd ago'
}
