import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useNotify } from '../../context/NotificationContext.jsx'
import { todayIsoLocal } from '../../lib/utils.js'

const PRIO_RANK = { high: 0, medium: 1, low: 2 }
const PRIO_MARK = { high: '\u25CF', medium: '\u25D0', low: '\u25CB' }
const COLUMNS = [
  { status: 'todo', label: 'Todo' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'completed', label: 'Completed' }
]

export default function TasksPanel() {
  const { session } = useAuth()
  const { notify, confirmDialog } = useNotify()
  const [tasks, setTasks] = useState([])
  const [text, setText] = useState('')
  const [project, setProject] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [priority, setPriority] = useState('medium')
  const [expanded, setExpanded] = useState({}) // taskId -> bool (subtasks open)

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    const { data, error } = await supabase.from('tasks').select('*').eq('user_id', session.user.id).order('created_at')
    if (error) { notify('Couldn\u2019t load tasks.'); return }
    setTasks(data)
  }

  async function addTask() {
    const t = text.trim()
    const proj = project.trim()
    const tags = tagsInput.split(',').map((s) => s.trim()).filter(Boolean)
    if (!t) return
    setText(''); setProject(''); setTagsInput('')
    const { data, error } = await supabase.from('tasks')
      .insert({ user_id: session.user.id, text: t, project: proj, tags, priority, status: 'todo', done: false })
      .select().single()
    if (error) { notify('Couldn\u2019t save that task.'); return }
    setTasks((ts) => [...ts, data])
  }

  async function updateTask(id, fields) {
    setTasks((ts) => ts.map((x) => x.id === id ? { ...x, ...fields } : x))
    await supabase.from('tasks').update(fields).eq('id', id)
  }

  async function moveTask(task, newStatus) {
    const fields = { status: newStatus, done: newStatus === 'completed' }
    await updateTask(task.id, fields)
    if (newStatus === 'completed') notify('Nice, task complete! \u2727')
  }

  async function deleteTask(id) {
    const ok = await confirmDialog('Delete this task?')
    if (!ok) return
    setTasks((ts) => ts.filter((x) => x.id !== id))
    await supabase.from('tasks').delete().eq('id', id)
  }

  function toggleExpand(id) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }))
  }

  async function addSubtask(task, subtaskText) {
    const t = subtaskText.trim()
    if (!t) return
    const next = [...(task.subtasks || []), { text: t, done: false }]
    await updateTask(task.id, { subtasks: next })
  }

  async function toggleSubtask(task, idx) {
    const next = (task.subtasks || []).map((s, i) => i === idx ? { ...s, done: !s.done } : s)
    await updateTask(task.id, { subtasks: next })
  }

  async function deleteSubtask(task, idx) {
    const next = (task.subtasks || []).filter((_, i) => i !== idx)
    await updateTask(task.id, { subtasks: next })
  }

  const todayIso = todayIsoLocal()

  function renderCard(t) {
    const isOverdue = t.due_date && t.due_date < todayIso && t.status !== 'completed'
    const subtasks = t.subtasks || []
    const doneCount = subtasks.filter((s) => s.done).length

    return (
      <div key={t.id} className={'task-card' + (t.status === 'completed' ? ' done' : '')}>
        <div className="task-card-top">
          <div className="prio" title={t.priority + ' priority'}>{PRIO_MARK[t.priority] || PRIO_MARK.medium}</div>
          <EditableText value={t.text} onSave={(v) => updateTask(t.id, { text: v })} className="txt" />
          <button className="del" onClick={() => deleteTask(t.id)}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="meta">
          {t.project && <span className="proj">{t.project}</span>}
          {(t.tags || []).map((tag) => <span className="tagpill" key={tag}>#{tag}</span>)}
          {t.due_date && <span className={'duepill' + (isOverdue ? ' overdue' : '')}>{isOverdue ? 'OVERDUE \u00b7 ' : ''}{t.due_date}</span>}
          {t.status === 'completed' && t.minutes_spent > 0 && <span className="tagpill">⏱ {t.minutes_spent}m</span>}
        </div>

        <div className="task-card-controls">
          <input type="date" value={t.due_date || ''} onChange={(e) => updateTask(t.id, { due_date: e.target.value || null })} data-no-drag />
          <button className="chip" onClick={() => toggleExpand(t.id)}>
            Subtasks {subtasks.length ? `(${doneCount}/${subtasks.length})` : ''}
          </button>
          <div className="col-move">
            {COLUMNS.filter((c) => c.status !== t.status).map((c) => (
              <button key={c.status} className="chip" onClick={() => moveTask(t, c.status)}>→ {c.label}</button>
            ))}
          </div>
        </div>

        {expanded[t.id] && (
          <div className="subtasks-box">
            {subtasks.map((s, i) => (
              <div className="subtask-row" key={i}>
                <button className="check small" onClick={() => toggleSubtask(t, i)}>
                  {s.done && <svg viewBox="0 0 24 24" fill="none" strokeWidth="3"><path d="M4 12l5 5L20 6" /></svg>}
                </button>
                <span className={s.done ? 'sub-done' : ''}>{s.text}</span>
                <button className="del" onClick={() => deleteSubtask(t, i)}>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
            <SubtaskAdd onAdd={(v) => addSubtask(t, v)} />
          </div>
        )}
      </div>
    )
  }

  return (
    <section id="panel-tasks">
      <div className="panel-head"><h2>Tasks</h2></div>

      <div className="add-row">
        <input id="task-text" type="text" placeholder="Add a task…" value={text}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} />
        <input id="task-project" type="text" placeholder="Project" value={project}
          onChange={(e) => setProject(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} />
        <input id="task-tags" type="text" placeholder="Tags, comma separated" value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} />
        <select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="high">High priority</option>
          <option value="medium">Medium priority</option>
          <option value="low">Low priority</option>
        </select>
        <button className="btn" onClick={addTask}>Add</button>
      </div>

      <div className="task-columns">
        {COLUMNS.map((col) => {
          const items = tasks
            .filter((t) => t.status === col.status)
            .sort((a, b) => PRIO_RANK[a.priority] - PRIO_RANK[b.priority] || new Date(b.created_at) - new Date(a.created_at))
          return (
            <div className="task-column" key={col.status}>
              <div className="task-column-head">{col.label} <span>{items.length}</span></div>
              <div className="task-column-body">
                {items.map(renderCard)}
                {items.length === 0 && <div className="col-empty">—</div>}
              </div>
            </div>
          )
        })}
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

function SubtaskAdd({ onAdd }) {
  const [v, setV] = useState('')
  return (
    <div className="subtask-add">
      <input
        type="text" placeholder="Add subtask…" value={v} data-no-drag
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && v.trim()) { onAdd(v); setV('') } }}
      />
    </div>
  )
}
