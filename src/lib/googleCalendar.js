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

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
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

export async function listGoogleCalendarEvents(accessToken, timeMinISO, timeMaxISO) {
  if (!accessToken) return { events: [] }

  const params = new URLSearchParams({
    timeMin: timeMinISO,
    timeMax: timeMaxISO,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250'
  })

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  if (!res.ok) {
    if (res.status === 401) return { events: [], expired: true }
    return { events: [], error: true }
  }

  const data = await res.json()
  const events = (data.items || []).map((ev) => {
    const start = ev.start?.dateTime || ev.start?.date
    const isAllDay = !ev.start?.dateTime
    return {
      id: ev.id,
      title: ev.summary || '(untitled)',
      date: isAllDay ? start : start.slice(0, 10),
      time: isAllDay ? '' : start.slice(11, 16),
      source: 'google'
    }
  })
  return { events }
}