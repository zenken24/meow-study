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

export function timeAgo(isoTs) {
  const s = Math.floor((Date.now() - new Date(isoTs).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return m + 'm ago'
  const h = Math.floor(m / 60); if (h < 24) return h + 'h ago'
  const d = Math.floor(h / 24); return d + 'd ago'
}
