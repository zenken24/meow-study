/* Creates events on the signed-in user's real Google Calendar.
   Uses the OAuth access token Supabase returns after Google sign-in
   (session.provider_token). Google only issues this token at the moment
   of sign-in, so this only works for as long as that token is valid in
   the current session -- if it stops working, signing out and back in
   with Google refreshes it. */

export async function createGoogleCalendarEvent(accessToken, { title, date, time, category }) {
  if (!accessToken) return { skipped: true }

  const startDateTime = time ? `${date}T${time}:00` : undefined
  const body = startDateTime
    ? {
        summary: title,
        description: category ? `Category: ${category}` : undefined,
        start: { dateTime: startDateTime },
        end: { dateTime: addOneHour(startDateTime) }
      }
    : {
        summary: title,
        description: category ? `Category: ${category}` : undefined,
        start: { date },
        end: { date }
      }

  const res = await fetch('https://www.googleapis.com/calendar/v3/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return { error: err?.error?.message || 'Google Calendar sync failed' }
  }
  const data = await res.json()
  return { id: data.id }
}

function addOneHour(isoLocal) {
  const d = new Date(isoLocal)
  d.setHours(d.getHours() + 1)
  return d.toISOString().slice(0, 19)
}
