import { useEffect, useRef, useState } from 'react'
import { useAuth } from './context/AuthContext.jsx'
import { useTheme } from './context/ThemeContext.jsx'
import { useNotify } from './context/NotificationContext.jsx'
import { supabase, CONFIGURED } from './supabaseClient.js'
import { todayIsoLocal } from './lib/utils.js'

import IntroSplash from './components/IntroSplash.jsx'
import AuthGate from './components/AuthGate.jsx'
import Sidebar from './components/Sidebar.jsx'
import QuoteBar from './components/QuoteBar.jsx'
import FloatingWindow from './components/FloatingWindow.jsx'
import TimerFloat from './components/TimerFloat.jsx'
import SoundsPanel from './components/panels/SoundsPanel.jsx'
import MediaPanel from './components/panels/MediaPanel.jsx'
import TasksPanel from './components/panels/TasksPanel.jsx'
import NotesPanel from './components/panels/NotesPanel.jsx'
import CalendarPanel from './components/panels/CalendarPanel.jsx'
import StreakPanel from './components/panels/StreakPanel.jsx'
import SettingsPanel from './components/panels/SettingsPanel.jsx'
import { useWindows } from './context/WindowsContext.jsx'

const DEFAULT_TIMER_CONFIG = { focus: 25, short: 5, long: 15, every: 4, sessions: 0, autoStart: false, dailyGoalMin: 120 }

export default function App() {
  const { session, ready } = useAuth()
  const { backgroundImage } = useTheme()

  return (
    <>
      <IntroSplash />
      {!CONFIGURED ? (
        <AuthGate />
      ) : !ready ? (
        <div className="boot-screen">Loading…</div>
      ) : !session ? (
        <AuthGate />
      ) : (
        <>
          {backgroundImage && (
            <div
              className="app-bg"
              style={{ backgroundImage: `url(${backgroundImage})` }}
              onError={() => {}}
            />
          )}
          <Workspace />
        </>
      )}
    </>
  )
}
function Workspace() {
  const { session } = useAuth()
  const { notify } = useNotify()
  const { openWindow } = useWindows()

  const [settingsRow, setSettingsRow] = useState(null)
  const [studyLog, setStudyLog] = useState([])
  const [profileUsername, setProfileUsername] = useState('')
  const greeted = useRef(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const u = session.user.id

      // settings row (timer config / sound levels / media state)
      let { data: settings } = await supabase.from('settings').select('*').eq('user_id', u).maybeSingle()
      if (!settings) {
        const defaults = { user_id: u, timer_config: DEFAULT_TIMER_CONFIG, sound_levels: {}, sound_mixes: [], media_state: {} }
        const { data: inserted } = await supabase.from('settings').insert(defaults).select().single()
        settings = inserted || defaults
      }
      if (cancelled) return
      setSettingsRow(settings)

      // profile (for greeting)
      const { data: profile } = await supabase.from('profiles').select('username').eq('user_id', u).maybeSingle()
      if (cancelled) return
      const uname = profile?.username || session.user.email?.split('@')[0] || 'friend'
      setProfileUsername(uname)
      if (!greeted.current) {
        greeted.current = true
        notify(`Hello @${uname}! Welcome back!`, { duration: 4200 })
      }

      // study log
      const { data: log } = await supabase.from('study_log').select('date,minutes').eq('user_id', u).order('date', { ascending: false }).limit(400)
      if (cancelled) return
      setStudyLog(log || [])
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.user.id])

  async function saveSettingsField(field, value) {
    setSettingsRow((row) => row ? { ...row, [field]: value } : row)
    await supabase.from('settings').update({ [field]: value, updated_at: new Date().toISOString() }).eq('user_id', session.user.id)
  }

  async function logStudyMinutes(minutes) {
    const today = todayIsoLocal()
    setStudyLog((log) => {
      const existing = log.find((r) => r.date === today)
      const newMinutes = (existing ? existing.minutes : 0) + minutes
      const next = existing
        ? log.map((r) => r.date === today ? { ...r, minutes: newMinutes } : r)
        : [{ date: today, minutes: newMinutes }, ...log]
      supabase.from('study_log').upsert(
        { user_id: session.user.id, date: today, minutes: newMinutes },
        { onConflict: 'user_id,date' }
      )
      return next
    })
  }

  if (!settingsRow) return <div className="boot-screen">Loading your workspace…</div>

  const streakCount = computeStreakCount(studyLog)

  return (
    <div id="app">
      <Sidebar streakCount={streakCount} />

      <main id="page">
        <QuoteBar />

        <FloatingWindow panel="sounds" title="Soundboard" defaultWidth={440} defaultHeight={520}>
          <SoundsPanel
            savedLevels={settingsRow.sound_levels}
            onLevelsChange={(levels) => saveSettingsField('sound_levels', levels)}
            savedMixes={settingsRow.sound_mixes}
            onMixesChange={(mixes) => saveSettingsField('sound_mixes', mixes)}
          />
        </FloatingWindow>

        <FloatingWindow panel="media" title="Media" defaultWidth={480} defaultHeight={520}>
          <MediaPanel
            savedState={settingsRow.media_state}
            onStateChange={(state) => saveSettingsField('media_state', state)}
          />
        </FloatingWindow>

        <FloatingWindow panel="tasks" title="Tasks" defaultWidth={760} defaultHeight={560}>
          <TasksPanel />
        </FloatingWindow>

        <FloatingWindow panel="notes" title="Notes" defaultWidth={860} defaultHeight={600}>
          <NotesPanel />
        </FloatingWindow>

        <FloatingWindow panel="calendar" title="Calendar" defaultWidth={460} defaultHeight={560}>
          <CalendarPanel />
        </FloatingWindow>

        <FloatingWindow panel="streak" title="Streak" defaultWidth={500} defaultHeight={440}>
          <StreakPanel studyLog={studyLog} />
        </FloatingWindow>

        <FloatingWindow panel="settings" title="Settings" defaultWidth={460} defaultHeight={540}>
          <SettingsPanel />
        </FloatingWindow>
      </main>

      <TimerFloat
        config={settingsRow.timer_config}
        onConfigChange={(cfg) => saveSettingsField('timer_config', cfg)}
        onFocusSessionComplete={logStudyMinutes}
        todayMinutes={studyLog.find((r) => r.date === todayIsoLocal())?.minutes || 0}
      />
    </div>
  )
}

function computeStreakCount(studyLog) {
  const byDate = {}
  studyLog.forEach((r) => { byDate[r.date] = r.minutes })
  let streak = 0
  const cursor = new Date()
  const t = todayIsoLocal()
  if (!byDate[t] || byDate[t] <= 0) cursor.setDate(cursor.getDate() - 1)
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const y = cursor.getFullYear(), m = cursor.getMonth(), d = cursor.getDate()
    const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    if (byDate[iso] > 0) { streak++; cursor.setDate(cursor.getDate() - 1) } else break
  }
  return streak
}
