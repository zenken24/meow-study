import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useNotify } from '../../context/NotificationContext.jsx'
import { isoDate } from '../../lib/utils.js'
import { createGoogleCalendarEvent, listGoogleCalendarEvents } from '../../lib/googleCalendar.js'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DOW = ['S','M','T','W','T','F','S']
const CATEGORY_COLORS = {
  '': '#FF1493', 'Class': '#FF69B4', 'Work': '#C2185B', 'Personal': '#FF8DC7', 'Deadline': '#FFB6D9'
}

export default function CalendarPanel() {
  const { session, getGoogleToken, signInWithGoogle } = useAuth()
  const { notify } = useNotify()
  const [events, setEvents] = useState([])
  const [googleEvents, setGoogleEvents] = useState([])
  const [googleStatus, setGoogleStatus] = useState('checking')
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(isoDate(today.getFullYear(), today.getMonth(), today.getDate()))
  const [evTitle, setEvTitle] = useState('')
  const [evTime, setEvTime] = useState('09:00')
  const [evCategory, setEvCategory] = useState('')

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadGoogleEvents() }, [viewYear, viewMonth]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    const { data, error } = await supabase.from('calendar_events').select('*').eq('user_id', session.user.id)
    if (error) { notify('Couldn\u2019t load calendar events.'); return }
    setEvents(data)
  }

  async function loadGoogleEvents() {
    const token = getGoogleToken()
    if (!token) { setGoogleStatus('off'); setGoogleEvents([]); return }
    const monthStart = new Date(viewYear, viewMonth, 1)
    const monthEnd = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59)
    const { events: gEvents, expired } = await listGoogleCalendarEvents(token, monthStart.toISOString(), monthEnd.toISOString())
    if (expired) { setGoogleStatus('expired'); setGoogleEvents([]); return }
    setGoogleStatus('connected')
    setGoogleEvents(gEvents)
  }

  async function connectGoogle() {
    await signInWithGoogle()
  }

  async function addEvent() {
    const t = evTitle.trim()
    if (!t) return
    setEvTitle('')
    const color = CATEGORY_COLORS[evCategory] || CATEGORY_COLORS['']
    const { data, error } = await supabase.from('calendar_events')
      .insert({ user_id: session.user.id, date: selectedDate, title: t, time: evTime, category: evCategory, color })
      .select().single()
    if (error) { notify('Couldn\u2019t save that event.'); return }
    setEvents((es) => [...es, data])

    const token = getGoogleToken()
    if (token) {
      const result = await createGoogleCalendarEvent(token, { title: t, date: selectedDate, time: evTime, category: evCategory })
      if (result.id) {
        await supabase.from('calendar_events').update({ google_event_id: result.id }).eq('id', data.id)
        notify('Added \u2014 synced to Google Calendar too \u2727')
        loadGoogleEvents()
      } else if (result.error) {
        notify('Saved here, but Google Calendar sync failed \u2014 try reconnecting Google.')
      }
    } else {
      notify('Saved here. Connect Google Calendar above to also sync new events there.')
    }
  }

  async function deleteEvent(id) {
    setEvents((es) => es.filter((e) => e.id !== id))
    await supabase.from('calendar_events').delete().eq('id', id)
  }

  const todayIso = isoDate(today.getFullYear(), today.getMonth(), today.getDate())
  const firstDow = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate()

  const cells = []
  for (let i = firstDow - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, muted: true, y: viewMonth === 0 ? viewYear - 1 : viewYear, m: viewMonth === 0 ? 11 : viewMonth - 1 })
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, muted: false, y: viewYear, m: viewMonth })
  let next = 1
  while (cells.length % 7 !== 0) {
    cells.push({ day: next++, muted: true, y: viewMonth === 11 ? viewYear + 1 : viewYear, m: viewMonth === 11 ? 0 : viewMonth + 1 })
  }

  function goPrev() { let m = viewMonth - 1, y = viewYear; if (m < 0) { m = 11; y-- } setViewMonth(m); setViewYear(y) }
  function goNext() { let m = viewMonth + 1, y = viewYear; if (m > 11) { m = 0; y++ } setViewMonth(m); setViewYear(y) }
  function goToday() { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelectedDate(todayIso) }

  const allEventsForDate = (iso) => [
    ...events.filter((e) => e.date === iso),
    ...googleEvents.filter((e) => e.date === iso)
  ]
  const dayEvents = allEventsForDate(selectedDate).sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  const selectedDateObj = new Date(selectedDate + 'T00:00:00')

  const statusLine = {
    checking: 'Checking Google Calendar connection\u2026',
    connected: '\u2727 Synced with Google Calendar',
    expired: 'Google Calendar connection expired',
    off: 'Not connected to Google Calendar'
  }[googleStatus]

  return (
    <section id="panel-calendar">
      <div className="panel-head">
        <h2>Your Calendar</h2>
        <div className="google-sync-row">
          <div className="google-sync-badge">{statusLine}</div>
          {(googleStatus === 'off' || googleStatus === 'expired') && (
            <button className="chip small" onClick={connectGoogle}>
              {googleStatus === 'expired' ? 'Reconnect Google' : 'Connect Google Calendar'}
            </button>
          )}
        </div>
      </div>

      <div id="cal-toolbar">
        <div id="cal-month">{MONTH_NAMES[viewMonth]} {viewYear}</div>
        <div id="cal-nav">
          <button className="nav-btn" onClick={goPrev}><svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg></button>
          <button className="btn ghost" style={{ padding: '6px 14px' }} onClick={goToday}>Today</button>
          <button className="nav-btn" onClick={goNext}><svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg></button>
        </div>
      </div>

      <div id="cal-grid">
        {DOW.map((d, i) => <div className="cal-dow" key={i}>{d}</div>)}
        {cells.map((c, i) => {
          const iso = isoDate(c.y, c.m, c.day)
          const dayEvts = allEventsForDate(iso)
          return (
            <div
              key={i}
              className={'cal-cell' + (c.muted ? ' muted' : '') + (iso === todayIso ? ' today' : '') + (iso === selectedDate ? ' selected' : '')}
              onClick={() => setSelectedDate(iso)}
            >
              <div className="daynum">{c.day}</div>
              <div className="dots">
                {dayEvts.slice(0, 4).map((e, j) => (
                  <span key={j} className={e.source === 'google' ? 'dot-google' : ''} style={{ background: e.color || 'var(--pink)' }} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="card" id="cal-day-panel">
        <div id="cal-day-title">{selectedDateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        <div className="event-add-row">
          <input type="text" placeholder="Event title…" value={evTitle}
            onChange={(e) => setEvTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addEvent()} />
          <input type="time" value={evTime} onChange={(e) => setEvTime(e.target.value)} />
          <select value={evCategory} onChange={(e) => setEvCategory(e.target.value)}>
            {Object.keys(CATEGORY_COLORS).map((c) => <option key={c} value={c}>{c || 'No category'}</option>)}
          </select>
          <button className="btn" onClick={addEvent}>Add</button>
        </div>
        <div id="event-list">
          {dayEvents.map((e) => (
            <div className="event-item" key={e.id}>
              <span className="event-color-dot" style={{ background: e.color || 'var(--pink)' }} />
              <div className="time">{e.time || ''}</div>
              <div className="title">{e.title}{e.category && <span className="event-cat"> \u00b7 {e.category}</span>}</div>
              {(e.google_event_id || e.source === 'google') && <span className="event-synced" title="From Google Calendar">G</span>}
              {e.source !== 'google' && (
                <button className="del" onClick={() => deleteEvent(e.id)}>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>
        {dayEvents.length === 0 && <div id="cal-day-empty">Nothing planned ⋆ add something above!</div>}
      </div>
    </section>
  )
}