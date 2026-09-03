import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useNotify } from '../../context/NotificationContext.jsx'
import { todayIsoLocal } from '../../lib/utils.js'
import { useWindows } from '../../context/WindowsContext.jsx'

const PRIO_RANK = { high: 0, medium: 1, low: 2 }
const PRIO_MARK = { high: '●', medium: '◐', low: '○' }
const STATUSES = [
  { status: 'todo', label: 'Todo' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'completed', label: 'Completed' }
]
const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.status, s.label]))
const NO_WORK = 'No work'
function dueRank(t) { return t.due_date ? new Date(t.due_date).getTime() : Infinity }
function byPriorityAndDeadline(a, b) {
  return PRIO_RANK[a.priority] - PRIO_RANK[b.priority] ||
    dueRank(a) - dueRank(b) ||
    new Date(a.created_at) - new Date(b.created_at)
}

export default function TasksPanel() {
  const { session } = useAuth()
  const { notify, confirmDialog } = useNotify()
  const { zMap, tasksVersion } = useWindows()
  const [tasks, setTasks] = useState([])
  const [text, setText] = useState('')
  const [work, setWork] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [priority, setPriority] = useState('medium')
  const [tagFilter, setTagFilter] = useState(null)

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (zMap.tasks) load() }, [zMap.tasks]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (tasksVersion) load() }, [tasksVersion]) // eslint-disable-line react-hooks/exhaustive-deps
  async function load() {
    const { data, error } = await supabase.from('tasks').select('*').eq('user_id', session.user.id).order('created_at')
    if (error) { notify('Couldn’t load tasks.'); return }
    setTasks(data)
  }

  async function addTask() {
    const t = text.trim()
    const w = work.trim()
    const tags = tagsInput.split(',').map((s) => s.trim()).filter(Boolean)
    if (!t) return
    setText(''); setWork(''); setTagsInput('')
    const { data, error } = await supabase.from('tasks')
      .insert({ user_id: session.user.id, text: t, project: w, tags, priority, status: 'todo', done: false })
      .select().single()
    if (error) { notify('Couldn’t save that task.'); return }
    setTasks((ts) => [...ts, data])
  }

  async function updateTask(id, fields) {
    setTasks((ts) => ts.map((x) => x.id === id ? { ...x, ...fields } : x))
    await supabase.from('tasks').update(fields).eq('id', id)
  }

  async function moveTask(task, newStatus) {
    const fields = { status: newStatus, done: newStatus === 'completed' }
    await updateTask(task.id, fields)
    if (newStatus === 'completed') notify('Nice, task complete! ✧')
  }

  async function deleteTask(id) {
    const ok = await confirmDialog('Delete this task?')
    if (!ok) return
    setTasks((ts) => ts.filter((x) => x.id !== id))
    await supabase.from('tasks').delete().eq('id', id)
  }

  function addTagFromChip(tag) {
    const current = tagsInput.split(',').map((s) => s.trim()).filter(Boolean)
    if (current.some((c) => c.toLowerCase() === tag.toLowerCase())) return
    setTagsInput([...current, tag].join(', '))
  }

  // Case-insensitive dedupe — keeps the casing of whichever spelling was
  // used first, so "Work" and "work" reuse the same entry instead of
  // silently forking into two.
  function dedupeCI(values) {
    const seen = new Map()
    values.forEach((v) => { const key = v.toLowerCase(); if (!seen.has(key)) seen.set(key, v) })
    return [...seen.values()]
  }

  const allWorks = useMemo(
    () => dedupeCI(tasks.map((t) => (t.project || '').trim()).filter(Boolean)).sort(),
    [tasks]
  )
  const allTags = useMemo(
    () => dedupeCI(tasks.flatMap((t) => t.tags || [])).sort(),
    [tasks]
  )

  const visibleTasks = useMemo(() => {
    if (!tagFilter) return tasks
    return tasks.filter((t) => (t.tags || []).some((tg) => tg.toLowerCase() === tagFilter.toLowerCase()))
  }, [tasks, tagFilter])

  // Completed tasks move out of their Work group entirely and into one
  // trailing "Completed" section — a group's body only ever shows ongoing
  // work, though its progress stat still counts completed tasks too.
  const completedTasks = useMemo(
    () => visibleTasks.filter((t) => t.status === 'completed').sort(byPriorityAndDeadline),
    [visibleTasks]
  )

  const workGroups = useMemo(() => {
    const map = {} // lowercase key -> { name: display casing, allItems, ongoingItems }
    visibleTasks.forEach((t) => {
      const raw = (t.project || '').trim()
      const key = raw ? raw.toLowerCase() : NO_WORK
      if (!map[key]) map[key] = { name: raw || NO_WORK, allItems: [], ongoingItems: [] }
      map[key].allItems.push(t)
      if (t.status !== 'completed') map[key].ongoingItems.push(t)
    })
    Object.values(map).forEach((g) => { g.ongoingItems.sort(byPriorityAndDeadline) })
    return map
  }, [visibleTasks])

  const workKeys = useMemo(() => {
    return Object.keys(workGroups)
      .filter((key) => workGroups[key].ongoingItems.length > 0)
      .sort((a, b) => {
        if (a === NO_WORK) return 1
        if (b === NO_WORK) return -1
        return workGroups[a].name.localeCompare(workGroups[b].name)
      })
  }, [workGroups])

  const todayIso = todayIsoLocal()

  function renderCard(t, { showWork = false } = {}) {
    const isOverdue = t.due_date && t.due_date < todayIso && t.status !== 'completed'

    return (
      <div key={t.id} className={'task-card' + (t.status === 'completed' ? ' done' : '')}>
        <div className="task-card-top">
          <div className="prio" title={t.priority + ' priority'}>{PRIO_MARK[t.priority] || PRIO_MARK.medium}</div>
          <EditableText value={t.text} onSave={(v) => updateTask(t.id, { text: v })} className={'txt' + (t.priority === 'high' ? ' high-priority' : '')} />
          {t.status === 'completed' && t.minutes_spent > 0 && <span className="done-time">⏱ {t.minutes_spent}m</span>}
          <button className="del" onClick={() => deleteTask(t.id)}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="meta">
          <span className={'statuspill ' + t.status}>{STATUS_LABEL[t.status]}</span>
          {showWork && <span className="tagpill">{(t.project || '').trim() || NO_WORK}</span>}
          {(t.tags || []).map((tag) => (
            <span className="tagpill" key={tag} onClick={() => setTagFilter(tag)} title={`Show all tasks tagged #${tag}`}>#{tag}</span>
          ))}
          {t.due_date && <span className={'duepill' + (isOverdue ? ' overdue' : '')}>{isOverdue ? 'OVERDUE · ' : ''}{t.due_date}</span>}
          {t.status !== 'completed' && t.minutes_spent > 0 && <span className="tagpill">⏱ {t.minutes_spent}m</span>}
        </div>

        <div className="task-card-controls">
          <input type="date" value={t.due_date || ''} onChange={(e) => updateTask(t.id, { due_date: e.target.value || null })} data-no-drag />
          <div className="col-move">
            {STATUSES.filter((c) => c.status !== t.status).map((c) => (
              <button key={c.status} className="chip" onClick={() => moveTask(t, c.status)}>→ {c.label}</button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <section id="panel-tasks">
      <div className="panel-head"><h2>Things you gotta do</h2></div>

      <div className="add-row">
        <input id="task-text" type="text" placeholder="Add a task…" value={text}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} />
        <input id="task-work" type="text" placeholder="Work" list="work-options" value={work}
          onChange={(e) => setWork(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} />
        <datalist id="work-options">
          {allWorks.map((w) => <option key={w} value={w} />)}
        </datalist>
        <input id="task-tags" type="text" placeholder="Tags, comma separated" value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} />
        <select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="high">High priority</option>
          <option value="medium">Medium priority</option>
          <option value="low">Low priority</option>
        </select>
        <button className="btn" onClick={addTask}>Add</button>
      </div>

      {allTags.length > 0 && (
        <div className="recent-tags-row">
          {allTags.map((tag) => <span key={tag} className="chip small" onClick={() => addTagFromChip(tag)}>#{tag}</span>)}
        </div>
      )}

      {tagFilter && (
        <div className="active-filter-row">
          Showing tasks tagged <strong>#{tagFilter}</strong>
          <span className="chip small" onClick={() => setTagFilter(null)}>Clear ✕</span>
        </div>
      )}

      <div className="work-groups">
        {workKeys.map((key) => {
          const { name, allItems, ongoingItems } = workGroups[key]
          const doneCount = allItems.filter((t) => t.status === 'completed').length
          const minutesTotal = allItems.reduce((sum, t) => sum + (t.minutes_spent || 0), 0)
          return (
            <div className="work-group" key={key}>
              <div className="work-group-head">
                <span className="name">{name}</span>
                <span className="progress">{doneCount}/{allItems.length} done · {minutesTotal}m tracked</span>
              </div>
              <div className="work-group-body">
                {ongoingItems.map((t) => renderCard(t))}
              </div>
            </div>
          )
        })}
        {workKeys.length === 0 && <div className="col-empty">Nothing ongoing — add a task above.</div>}

        {completedTasks.length > 0 && (
          <div className="work-group" id="completed-section">
            <div className="work-group-head">
              <span className="name">Completed</span>
              <span className="progress">{completedTasks.length} done</span>
            </div>
            <div className="work-group-body">
              {completedTasks.map((t) => renderCard(t, { showWork: true }))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function EditableText({ value, onSave, className }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (!editing) {
    return <div className={className} onClick={() => { setDraft(value); setEditing(true) }}>{value}</div>
  }
  return (
    <input
      className={className + ' editing'}
      data-no-drag
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { setEditing(false); if (draft.trim() && draft !== value) onSave(draft.trim()) }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }}
    />
  )
}
