import { useCallback, useEffect, useRef, useState } from 'react'
import { useDraggable } from '../hooks/useDraggable.js'
import { useWindows } from '../context/WindowsContext.jsx'
import { useNotify } from '../context/NotificationContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../supabaseClient.js'
import * as Sound from '../lib/soundFiles.js'
import { pad } from '../lib/utils.js'

const RING_R = 58
const RING_C = 2 * Math.PI * RING_R

export default function TimerFloat({ config, onConfigChange, onFocusSessionComplete, todayMinutes }) {
  const elRef = useRef(null)
  const headRef = useRef(null)
  const { bringToFront } = useWindows()
  const { notify, confirmDialog } = useNotify()
  const { session } = useAuth()
  const focusThis = useCallback(() => bringToFront('timer'), [bringToFront])
  useDraggable(elRef, headRef, focusThis)

  const [mode, setMode] = useState('focus')
  const [remaining, setRemaining] = useState(config.focus * 60)
  const [running, setRunning] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const intervalRef = useRef(null)

  const [openTasks, setOpenTasks] = useState([])
  const [selectedTaskId, setSelectedTaskId] = useState('')

  useEffect(() => { loadOpenTasks() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadOpenTasks() {
    const { data } = await supabase.from('tasks').select('id,text,status')
      .eq('user_id', session.user.id).neq('status', 'completed').order('created_at')
    setOpenTasks(data || [])
  }

  async function pickTask(id) {
    setSelectedTaskId(id)
    if (!id) return
    await supabase.from('tasks').update({ status: 'in_progress' }).eq('id', id)
    setOpenTasks((ts) => ts.map((t) => t.id === id ? { ...t, status: 'in_progress' } : t))
  }

  async function markTaskDone() {
    if (!selectedTaskId) return
    await supabase.from('tasks').update({ status: 'completed', done: true }).eq('id', selectedTaskId)
    notify('Nice, task complete! \u2727 filed away in your Completed column.')
    setSelectedTaskId('')
    loadOpenTasks()
  }

  function modeMinutes(m) {
    return m === 'focus' ? config.focus : m === 'short' ? config.short : config.long
  }

  function switchMode(next, { resetRunning = true, autoBegin = false } = {}) {
    setMode(next)
    setRemaining(modeMinutes(next) * 60)
    if (resetRunning) {
      setRunning(autoBegin)
      clearInterval(intervalRef.current)
    }
    if (autoBegin) Sound.playSfx(next === 'focus' ? 'start' : 'breakStart')
  }

  useEffect(() => {
    if (!running) setRemaining(modeMinutes(mode) * 60)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config])

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(intervalRef.current)
          setRunning(false)
          handleComplete()
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  async function handleComplete() {
    Sound.playSfx('complete')
    const currentTask = openTasks.find((t) => t.id === selectedTaskId)

    if (mode === 'focus') {
      const nextSessions = config.sessions + 1
      onConfigChange({ ...config, sessions: nextSessions })
      onFocusSessionComplete(config.focus)
      logSession('focus', config.focus, currentTask)
      if (selectedTaskId) {
        supabase.from('tasks').select('minutes_spent').eq('id', selectedTaskId).single().then(({ data }) => {
          const spent = (data?.minutes_spent || 0) + config.focus
          supabase.from('tasks').update({ minutes_spent: spent }).eq('id', selectedTaskId)
        })
      }
      notify('Yay, session done! \u2727 go take a well-earned break.')

      if (config.autoStart) {
        const nextMode = nextSessions % config.every === 0 ? 'long' : 'short'
        switchMode(nextMode, { autoBegin: true })
        return
      }
      const wantsBreak = await confirmDialog('Focus session done! Ready for a break? (Choose No to go again with another focus session instead.)')
      const nextMode = wantsBreak ? (nextSessions % config.every === 0 ? 'long' : 'short') : 'focus'
      switchMode(nextMode)
    } else {
      logSession(mode, modeMinutes(mode), null)
      notify('Break\u2019s over \u22c6 let\u2019s keep going!')
      if (config.autoStart) {
        switchMode('focus', { autoBegin: true })
      } else {
        switchMode('focus')
      }
    }
  }

  function logSession(sessionMode, minutes, task) {
    supabase.from('pomodoro_sessions').insert({
      user_id: session.user.id,
      task_id: task ? task.id : null,
      task_text: task ? task.text : '',
      mode: sessionMode,
      minutes
    })
  }

  function handleStart() {
    const next = !running
    setRunning(next)
    if (next) Sound.playSfx(mode === 'focus' ? 'start' : 'breakStart')
  }

  const total = modeMinutes(mode) * 60
  const frac = total > 0 ? remaining / total : 0
  const mm = Math.floor(remaining / 60), ss = remaining % 60
  const filledDots = config.sessions % config.every
  const goalPct = config.dailyGoalMin ? Math.min(100, Math.round((todayMinutes / config.dailyGoalMin) * 100)) : 0

  function saveCfg(field, val) {
    if (field === 'autoStart') {
      onConfigChange({ ...config, autoStart: val })
      return
    }
    const max = field === 'every' ? 12 : field === 'short' ? 60 : field === 'long' ? 90 : field === 'dailyGoalMin' ? 600 : 180
    const v = Math.min(max, Math.max(1, parseInt(val, 10) || 1))
    onConfigChange({ ...config, [field]: v })
  }

  return (
    <div
      ref={elRef}
      id="timer-float"
      className={collapsed ? 'collapsed' : ''}
      style={{ zIndex: 90 }}
      onPointerDown={() => bringToFront('timer')}
    >
      <div id="timer-drag" ref={headRef}>
        <div id="timer-grip"><span /><span /><span /></div>
        <div id="timer-modes">
          <button className={'mode-btn' + (mode === 'focus' ? ' active' : '')} data-no-drag onClick={() => switchMode('focus')}>Focus</button>
          <button className={'mode-btn' + (mode === 'short' ? ' active' : '')} data-no-drag onClick={() => switchMode('short')}>Short</button>
          <button className={'mode-btn' + (mode === 'long' ? ' active' : '')} data-no-drag onClick={() => switchMode('long')}>Long</button>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <button className="timer-icon-btn" data-no-drag title="Settings" onClick={() => setSettingsOpen((o) => !o)}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z" /></svg>
          </button>
          <button className="timer-icon-btn" data-no-drag title="Collapse" onClick={() => setCollapsed((c) => !c)}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }}><path d="M6 9l6 6 6-6" /></svg>
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="timer-body">
          <div id="ring-wrap">
            <svg viewBox="0 0 132 132">
              <circle id="ring-track" cx="66" cy="66" r={RING_R} />
              <circle id="ring-progress" cx="66" cy="66" r={RING_R} style={{ strokeDasharray: RING_C, strokeDashoffset: RING_C * (1 - frac) }} />
            </svg>
            <div id="ring-time">{pad(mm)}:{pad(ss)}</div>
          </div>

          <select data-no-drag className="task-picker" value={selectedTaskId} onChange={(e) => pickTask(e.target.value)} onFocus={loadOpenTasks}>
            <option value="">Working on…</option>
            {openTasks.map((t) => <option key={t.id} value={t.id}>{t.text}</option>)}
          </select>
          {selectedTaskId && (
            <button className="btn ghost" data-no-drag style={{ fontSize: 11.5, padding: '5px 12px', marginBottom: 10 }} onClick={markTaskDone}>
              Mark task complete
            </button>
          )}

          <div className="timer-controls">
            <button className="btn" data-no-drag onClick={handleStart}>{running ? 'Pause' : 'Start'}</button>
            <button className="btn ghost" data-no-drag onClick={() => switchMode(mode)}>Reset</button>
          </div>
          <div id="session-dots">
            {Array.from({ length: config.every }).map((_, i) => (
              <span key={i} className={i < filledDots ? 'filled' : ''} />
            ))}
          </div>

          {config.dailyGoalMin > 0 && (
            <div className="goal-bar-wrap" data-no-drag title={`${todayMinutes} / ${config.dailyGoalMin} min today`}>
              <div className="goal-bar-track"><div className="goal-bar-fill" style={{ width: goalPct + '%' }} /></div>
              <div className="goal-bar-label">{todayMinutes} / {config.dailyGoalMin} min today</div>
            </div>
          )}
        </div>
      )}

      {settingsOpen && (
        <div id="timer-settings" className="open">
          <div className="setting-row">Focus (min) <input type="number" defaultValue={config.focus} onBlur={(e) => saveCfg('focus', e.target.value)} /></div>
          <div className="setting-row">Short break <input type="number" defaultValue={config.short} onBlur={(e) => saveCfg('short', e.target.value)} /></div>
          <div className="setting-row">Long break <input type="number" defaultValue={config.long} onBlur={(e) => saveCfg('long', e.target.value)} /></div>
          <div className="setting-row">Sessions / long break <input type="number" defaultValue={config.every} onBlur={(e) => saveCfg('every', e.target.value)} /></div>
          <div className="setting-row">Daily goal (min) <input type="number" defaultValue={config.dailyGoalMin || 120} onBlur={(e) => saveCfg('dailyGoalMin', e.target.value)} /></div>
          <div className="setting-row">
            Auto-start next session
            <input type="checkbox" checked={!!config.autoStart} onChange={(e) => saveCfg('autoStart', e.target.checked)} />
          </div>
        </div>
      )}
    </div>
  )
}
