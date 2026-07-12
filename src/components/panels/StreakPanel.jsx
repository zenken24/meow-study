import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useNotify } from '../../context/NotificationContext.jsx'
import { isoDate, todayIsoLocal } from '../../lib/utils.js'

const BADGES = [
  { id: 'streak_3', label: '3-Day Streak', check: (s) => s.streak >= 3 },
  { id: 'streak_7', label: '7-Day Streak', check: (s) => s.streak >= 7 },
  { id: 'streak_30', label: '30-Day Streak', check: (s) => s.streak >= 30 },
  { id: 'tasks_10', label: '10 Tasks Done', check: (s) => s.tasksDone >= 10 },
  { id: 'tasks_50', label: '50 Tasks Done', check: (s) => s.tasksDone >= 50 },
  { id: 'tasks_100', label: '100 Tasks Done', check: (s) => s.tasksDone >= 100 },
  { id: 'sessions_50', label: '50 Focus Sessions', check: (s) => s.sessions >= 50 }
]

export default function StreakPanel({ studyLog }) {
  const { session } = useAuth()
  const { notify } = useNotify()
  const [tasksDone, setTasksDone] = useState(0)
  const [sessionsCount, setSessionsCount] = useState(0)
  const [earnedBadges, setEarnedBadges] = useState([])

  const byDate = {}
  studyLog.forEach((r) => { byDate[r.date] = r.minutes })

  function computeStreak() {
    let streak = 0
    const cursor = new Date()
    const t = todayIsoLocal()
    if (!byDate[t] || byDate[t] <= 0) cursor.setDate(cursor.getDate() - 1)
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const iso = isoDate(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())
      if (byDate[iso] > 0) { streak++; cursor.setDate(cursor.getDate() - 1) } else break
    }
    return streak
  }
  const streak = computeStreak()
  const todayMin = byDate[todayIsoLocal()] || 0

  function sumLastNDays(n, offset = 0) {
    let total = 0
    const cursor = new Date()
    cursor.setDate(cursor.getDate() - offset)
    for (let i = 0; i < n; i++) {
      const iso = isoDate(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())
      total += byDate[iso] || 0
      cursor.setDate(cursor.getDate() - 1)
    }
    return total
  }
  const thisWeekMin = sumLastNDays(7, 0)
  const lastWeekMin = sumLastNDays(7, 7)
  const weekDelta = thisWeekMin - lastWeekMin

  useEffect(() => { loadStats() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadStats() {
    const { count: doneCount } = await supabase.from('tasks').select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id).eq('status', 'completed')
    const { count: sessCount } = await supabase.from('pomodoro_sessions').select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id).eq('mode', 'focus')
    const { data: badgeRows } = await supabase.from('badges').select('badge_id').eq('user_id', session.user.id)
    setTasksDone(doneCount || 0)
    setSessionsCount(sessCount || 0)
    setEarnedBadges((badgeRows || []).map((b) => b.badge_id))
  }

  useEffect(() => {
    checkBadges()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak, tasksDone, sessionsCount])

  async function checkBadges() {
    const stats = { streak, tasksDone, sessions: sessionsCount }
    for (const b of BADGES) {
      if (!earnedBadges.includes(b.id) && b.check(stats)) {
        await supabase.from('badges').upsert({ user_id: session.user.id, badge_id: b.id }, { onConflict: 'user_id,badge_id' })
        setEarnedBadges((e) => [...e, b.id])
        notify(`\u2727 Badge earned: ${b.label}!`, { duration: 4500 })
      }
    }
  }

  let motivateLine
  if (streak === 0) motivateLine = '⋆ let\u2019s start today!'
  else if (streak < 3) motivateLine = '⋆ nice, keep it up!'
  else if (streak < 7) motivateLine = '⋆ you\u2019re on a roll!'
  else if (streak < 14) motivateLine = '✧ look at you go!'
  else motivateLine = '✧ unstoppable! amazing streak!'

  const days = 70
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - (days - 1))
  start.setDate(start.getDate() - start.getDay())
  const cells = []
  const cursor = new Date(start)
  while (cursor <= end) {
    const iso = isoDate(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())
    const mins = byDate[iso] || 0
    let lvl = 0
    if (mins > 0) lvl = 1
    if (mins >= 25) lvl = 2
    if (mins >= 50) lvl = 3
    if (mins >= 90) lvl = 4
    cells.push({ iso, mins, lvl })
    cursor.setDate(cursor.getDate() + 1)
  }

  return (
    <section id="panel-streak">
      <div className="panel-head"><div className="eyebrow">06 — Momentum</div><h2>Streak</h2></div>

      <div className="streak-top">
        <svg id="streak-flame" viewBox="0 0 24 24" fill="none" strokeWidth="1.3"><path d="M12 2c1 3-3 4-3 8a3 3 0 0 0 6 0c1 1 2 2.5 2 4.5A5.5 5.5 0 0 1 11.5 20 6 6 0 0 1 6 14c0-4 3-6 3-9 1 1 2 2 3-3z" /></svg>
        <div>
          <div id="streak-number">{streak}</div>
          <div id="streak-label">day streak</div>
        </div>
        <div id="streak-today">{todayMin} min studied today</div>
      </div>
      <div id="streak-motivate">{motivateLine}</div>

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>This week</div>
        <div className="recap-line">
          You've studied <strong>{thisWeekMin} min</strong> this week
          {lastWeekMin > 0 && (
            weekDelta >= 0
              ? <> — up {weekDelta} min from last week ✧</>
              : <> — down {Math.abs(weekDelta)} min from last week</>
          )}.
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Badges</div>
        <div className="badge-grid">
          {BADGES.map((b) => (
            <div key={b.id} className={'badge-item' + (earnedBadges.includes(b.id) ? ' earned' : '')}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5"><path d="M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" /><path d="M8.5 13.5L7 22l5-3 5 3-1.5-8.5" /></svg>
              <span>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Last ten weeks</div>
        <div id="heatmap-wrap">
          <div id="heatmap">
            {cells.map((c) => (
              <div key={c.iso} className="heat-cell" data-lvl={c.lvl} title={c.iso + ' — ' + c.mins + ' min'} />
            ))}
          </div>
        </div>
        <div id="heatmap-legend">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((lvl) => <span key={lvl} className="heat-cell" data-lvl={lvl} />)}
          <span>More</span>
        </div>
      </div>
    </section>
  )
}
