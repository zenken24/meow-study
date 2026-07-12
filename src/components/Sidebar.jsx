import { useWindows } from '../context/WindowsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useNotify } from '../context/NotificationContext.jsx'
import { supabase } from '../supabaseClient.js'

const TABS = [
  { id: 'sounds', label: 'Sounds', icon: <path d="M4 9v6h4l5 5V4L8 9H4z M17 8a5 5 0 0 1 0 8 M19.5 5.5a9 9 0 0 1 0 13" /> },
  { id: 'media', label: 'Media', icon: <><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></> },
  { id: 'tasks', label: 'Tasks', icon: <path d="M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /> },
  { id: 'notes', label: 'Notes', icon: <path d="M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /> },
  { id: 'streak', label: 'Streak', icon: <path d="M12 2c1 3-3 4-3 8a3 3 0 0 0 6 0c1 1 2 2.5 2 4.5A5.5 5.5 0 0 1 11.5 20 6 6 0 0 1 6 14c0-4 3-6 3-9 1 1 2 2 3-3z" /> },
  { id: 'settings', label: 'Settings', icon: <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z" /> }
]

export default function Sidebar({ streakCount }) {
  const { openMap, openWindow } = useWindows()
  const { session, signOut } = useAuth()
  const { notify, confirmDialog } = useNotify()

  async function handleReset() {
    const ok = await confirmDialog('Delete all your tasks, notes, calendar events, study log and settings from the database? This cannot be undone.')
    if (!ok) return
    const u = session.user.id
    await Promise.all([
      supabase.from('tasks').delete().eq('user_id', u),
      supabase.from('notes').delete().eq('user_id', u),
      supabase.from('calendar_events').delete().eq('user_id', u),
      supabase.from('settings').delete().eq('user_id', u),
      supabase.from('study_log').delete().eq('user_id', u)
    ])
    notify('All clean! Starting fresh \u2727')
    setTimeout(() => window.location.reload(), 700)
  }

  return (
    <nav id="tabstrip">
      <div className="brand">
        <div className="mark">meowstudy</div>
      </div>

      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={'tab' + (openMap[tab.id] ? ' active' : '')}
          onClick={() => openWindow(tab.id)}
        >
          <span className="icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6">{tab.icon}</svg>
          </span>
          <span className="label">{tab.label}</span>
        </button>
      ))}

      <div className="spacer" />
      <div id="streak-mini">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6"><path d="M12 2c1 3-3 4-3 8a3 3 0 0 0 6 0c1 1 2 2.5 2 4.5A5.5 5.5 0 0 1 11.5 20 6 6 0 0 1 6 14c0-4 3-6 3-9 1 1 2 2 3-3z" /></svg>
        <span className="n">{streakCount} day streak</span>
      </div>
      <button className="tab" onClick={handleReset}>
        <span className="icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6"><path d="M3 6h18 M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
        </span>
        <span className="label">Reset data</span>
      </button>
      <button className="tab" onClick={signOut}>
        <span className="icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" /></svg>
        </span>
        <span className="label">Sign out</span>
      </button>
    </nav>
  )
}
