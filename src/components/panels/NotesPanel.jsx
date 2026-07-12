import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../supabaseClient.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useNotify } from '../../context/NotificationContext.jsx'
import { timeAgo } from '../../lib/utils.js'
import DrawingCanvas from '../notes/DrawingCanvas.jsx'
import VoiceRecorder from '../notes/VoiceRecorder.jsx'

const NOTE_COLORS = ['', '#FF1493', '#FF69B4', '#C2185B', '#FF8DC7', '#FFB6D9']
const TEMPLATES = {
  'Daily Journal': '# Daily Journal\n\nHow today went:\n\nWhat I\u2019m grateful for:\n\nTomorrow I want to:\n',
  'Meeting Notes': '# Meeting Notes\n\nAttendees:\n\nAgenda:\n\nAction items:\n',
  'Study Summary': '# Study Summary\n\nTopic:\n\nKey points:\n\nQuestions I still have:\n'
}

export default function NotesPanel() {
  const { session } = useAuth()
  const { notify, confirmDialog } = useNotify()
  const [notes, setNotes] = useState([])
  const [folders, setFolders] = useState([])
  const [currentId, setCurrentId] = useState(null)
  const [saveState, setSaveState] = useState('')
  const [query, setQuery] = useState('')
  const [activeFolder, setActiveFolder] = useState('all') // 'all' | 'archive' | folder id
  const [labelFilter, setLabelFilter] = useState(null)
  const [newFolderName, setNewFolderName] = useState('')
  const saveTimer = useRef(null)
  const bodyRef = useRef(null)

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // reminder checker — runs continuously since this component stays mounted
  useEffect(() => {
    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    const t = setInterval(checkReminders, 30000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes])

  async function checkReminders() {
    const now = new Date()
    for (const n of notes) {
      if (!n.reminder_at) continue
      const due = new Date(n.reminder_at)
      if (due <= now) {
        notify(`\u23F0 Reminder: ${n.title || 'Untitled note'}`, { duration: 6000 })
        if (window.Notification && Notification.permission === 'granted') {
          new Notification(n.title || 'meow-study reminder')
        }
        let nextAt = null
        if (n.reminder_recurrence === 'daily') { const d = new Date(due); d.setDate(d.getDate() + 1); nextAt = d.toISOString() }
        else if (n.reminder_recurrence === 'weekly') { const d = new Date(due); d.setDate(d.getDate() + 7); nextAt = d.toISOString() }
        await supabase.from('notes').update({ reminder_at: nextAt }).eq('id', n.id)
        setNotes((ns) => ns.map((x) => x.id === n.id ? { ...x, reminder_at: nextAt } : x))
      }
    }
  }

  async function load() {
    const { data: n, error } = await supabase.from('notes').select('*').eq('user_id', session.user.id).order('updated_at', { ascending: false })
    if (error) { notify('Couldn\u2019t load notes.'); return }
    setNotes(n)
    const { data: f } = await supabase.from('folders').select('*').eq('user_id', session.user.id).order('created_at')
    setFolders(f || [])
    if (n.length) select(n[0].id)
  }

  const current = notes.find((n) => n.id === currentId) || null

  function select(id) {
    setCurrentId(id)
    setTimeout(() => {
      if (bodyRef.current) bodyRef.current.innerHTML = notes.find((n) => n.id === id)?.html_body || ''
    }, 0)
  }

  async function createNote(type = 'text', templateBody = '') {
    const { data, error } = await supabase.from('notes')
      .insert({ user_id: session.user.id, title: '', body: templateBody, html_body: '', type, folder_id: activeFolder !== 'all' && activeFolder !== 'archive' ? activeFolder : null })
      .select().single()
    if (error) { notify('Couldn\u2019t create a note.'); return }
    setNotes((ns) => [data, ...ns])
    select(data.id)
  }

  async function updateNote(id, fields) {
    setNotes((ns) => ns.map((n) => n.id === id ? { ...n, ...fields } : n))
    await supabase.from('notes').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id)
  }

  async function deleteNote(id) {
    const ok = await confirmDialog('Delete this note permanently?')
    if (!ok) return
    setNotes((ns) => ns.filter((n) => n.id !== id))
    if (currentId === id) setCurrentId(null)
    await supabase.from('notes').delete().eq('id', id)
  }

  function scheduleSave(fields) {
    setSaveState('Saving\u2026')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await updateNote(currentId, fields)
      setSaveState('Saved')
      setTimeout(() => setSaveState(''), 1200)
    }, 500)
  }

  function onTitleChange(v) {
    setNotes((ns) => ns.map((n) => n.id === currentId ? { ...n, title: v } : n))
    scheduleSave({ title: v })
  }

  function onRichInput() {
    const html = bodyRef.current.innerHTML
    const text = bodyRef.current.innerText
    scheduleSave({ html_body: html, body: text })
  }

  function exec(cmd, value = null) {
    document.execCommand(cmd, false, value)
    bodyRef.current.focus()
    onRichInput()
  }

  async function createFolder() {
    const name = newFolderName.trim()
    if (!name) return
    const { data, error } = await supabase.from('folders').insert({ user_id: session.user.id, name }).select().single()
    if (error) { notify('Couldn\u2019t create folder.'); return }
    setFolders((f) => [...f, data])
    setNewFolderName('')
  }

  async function deleteFolder(id) {
    const ok = await confirmDialog('Delete this folder? Notes inside will move to All Notes.')
    if (!ok) return
    setFolders((f) => f.filter((x) => x.id !== id))
    setNotes((ns) => ns.map((n) => n.folder_id === id ? { ...n, folder_id: null } : n))
    await supabase.from('folders').delete().eq('id', id)
    if (activeFolder === id) setActiveFolder('all')
  }

  function exportNote(fmt) {
    if (!current) return
    const content = fmt === 'md' ? `# ${current.title || 'Untitled'}\n\n${current.body || ''}` : `${current.title || 'Untitled'}\n\n${current.body || ''}`
    const blob = new Blob([content], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${(current.title || 'note').replace(/[^a-z0-9]+/gi, '-')}.${fmt}`
    a.click()
  }

  function shareByEmail() {
    if (!current) return
    const subject = encodeURIComponent(current.title || 'A note from meow-study')
    const body = encodeURIComponent(current.body || '')
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  async function uploadNoteMedia(file, subfolder) {
    const path = `${session.user.id}/${subfolder}-${Date.now()}.${file.name?.split('.').pop() || 'bin'}`
    const { error } = await supabase.storage.from('notes-media').upload(path, file, { upsert: true })
    if (error) { notify('Upload failed.'); return null }
    const { data: pub } = supabase.storage.from('notes-media').getPublicUrl(path)
    return pub.publicUrl
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadNoteMedia(file, 'image')
    if (url) updateNote(currentId, { image_url: url })
  }

  async function runOcr() {
    if (!current?.image_url) return
    notify('Reading text from image\u2026')
    const Tesseract = await import('tesseract.js')
    const { data } = await Tesseract.recognize(current.image_url, 'eng')
    updateNote(currentId, { body: data.text })
    notify('Text extracted \u2727')
  }

  async function saveDrawing(blob) {
    const url = await uploadNoteMedia(blob, 'drawing')
    if (url) updateNote(currentId, { drawing_url: url })
  }

  async function saveVoice(blob, transcript) {
    const url = await uploadNoteMedia(blob, 'voice')
    if (url) updateNote(currentId, { audio_url: url, body: transcript || current.body })
  }

  function toggleLabel(labelName) {
    if (!current) return
    const has = (current.labels || []).includes(labelName)
    const next = has ? current.labels.filter((l) => l !== labelName) : [...(current.labels || []), labelName]
    updateNote(currentId, { labels: next })
  }

  function addLabelPrompt() {
    const name = window.prompt('New label name:')
    if (name && name.trim()) toggleLabel(name.trim())
  }

  function goToBacklink(title) {
    const target = notes.find((n) => (n.title || '').toLowerCase() === title.toLowerCase())
    if (target) select(target.id)
    else notify(`No note titled "${title}" yet.`)
  }

  const allLabels = useMemo(() => {
    const s = new Set()
    notes.forEach((n) => (n.labels || []).forEach((l) => s.add(l)))
    return [...s]
  }, [notes])

  const visibleNotes = useMemo(() => {
    let list = notes
    if (activeFolder === 'archive') list = list.filter((n) => n.archived)
    else {
      list = list.filter((n) => !n.archived)
      if (activeFolder !== 'all') list = list.filter((n) => n.folder_id === activeFolder)
    }
    if (labelFilter) list = list.filter((n) => (n.labels || []).includes(labelFilter))
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter((n) =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.body || '').toLowerCase().includes(q) ||
        (n.labels || []).some((l) => l.toLowerCase().includes(q)) ||
        n.type.includes(q)
      )
    }
    return [...list].sort((a, b) => (b.pinned - a.pinned) || (new Date(b.updated_at) - new Date(a.updated_at)))
  }, [notes, activeFolder, labelFilter, query])

  return (
    <section id="panel-notes">
      <div className="panel-head"><h2>Write it down</h2></div>

      <div className="notes-shell">
        <div className="notes-rail">
          <input className="notes-search" type="text" placeholder="Search notes…" value={query} onChange={(e) => setQuery(e.target.value)} />

          <div className="rail-section-label">Folders</div>
          <div className={'rail-item' + (activeFolder === 'all' ? ' active' : '')} onClick={() => setActiveFolder('all')}>All Notes</div>
          {folders.map((f) => (
            <div key={f.id} className={'rail-item' + (activeFolder === f.id ? ' active' : '')} onClick={() => setActiveFolder(f.id)}>
              {f.name}
              <span className="rail-del" onClick={(e) => { e.stopPropagation(); deleteFolder(f.id) }}>×</span>
            </div>
          ))}
          <div className="rail-add-row">
            <input type="text" placeholder="+ New folder" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createFolder()} />
          </div>
          <div className={'rail-item' + (activeFolder === 'archive' ? ' active' : '')} onClick={() => setActiveFolder('archive')}>Archive</div>

          {allLabels.length > 0 && (
            <>
              <div className="rail-section-label">Labels</div>
              <div className="rail-labels">
                {allLabels.map((l) => (
                  <span key={l} className={'chip small' + (labelFilter === l ? ' active' : '')} onClick={() => setLabelFilter(labelFilter === l ? null : l)}>#{l}</span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="notes-list-col">
          <div className="new-note-row">
            <button className="btn ghost" onClick={() => createNote('text')}>+ Text</button>
            <button className="btn ghost" onClick={() => createNote('list')}>+ List</button>
            <button className="btn ghost" onClick={() => createNote('voice')}>+ Voice</button>
            <button className="btn ghost" onClick={() => createNote('image')}>+ Image</button>
            <button className="btn ghost" onClick={() => createNote('drawing')}>+ Drawing</button>
          </div>
          <div className="templates-row">
            {Object.keys(TEMPLATES).map((name) => (
              <span key={name} className="chip small" onClick={() => createNote('text', TEMPLATES[name])}>{name}</span>
            ))}
          </div>
          <div id="notes-list">
            {visibleNotes.map((n) => (
              <div
                key={n.id}
                className={'note-card' + (n.id === currentId ? ' active' : '')}
                style={n.color ? { borderColor: n.color } : undefined}
                onClick={() => select(n.id)}
              >
                <div className="t">{n.pinned ? '\u{1F4CC} ' : ''}{n.title || 'Untitled'}</div>
                <div className="p">{(n.body || '').slice(0, 80) || `[${n.type} note]`}</div>
                <div className="d">{timeAgo(n.updated_at)}</div>
              </div>
            ))}
            {visibleNotes.length === 0 && <div style={{ color: 'var(--text-faint)', fontSize: 12.5, fontStyle: 'italic', padding: 12 }}>Nothing here.</div>}
          </div>
        </div>

        <div id="notes-editor" className="card">
          {!current ? (
            <div id="notes-editor-empty">
              <div>No note selected ⋆ pick one or start fresh!</div>
              <button className="btn ghost" onClick={() => createNote('text')}>Start one</button>
            </div>
          ) : (
            <>
              <div className="note-toolbar-top">
                <input id="note-title" type="text" placeholder="Untitled" value={current.title} onChange={(e) => onTitleChange(e.target.value)} />
                <div className="note-actions">
                  <button title="Pin" className={'icon-btn' + (current.pinned ? ' active' : '')} onClick={() => updateNote(currentId, { pinned: !current.pinned })}>Pin</button>
                  <button title="Archive" className="icon-btn" onClick={() => updateNote(currentId, { archived: !current.archived })}>{current.archived ? 'Unarchive' : 'Archive'}</button>
                  <button title="Delete" className="icon-btn" onClick={() => deleteNote(currentId)}>Delete</button>
                </div>
              </div>

              <div className="note-meta-row">
                <div className="color-row">
                  {NOTE_COLORS.map((c) => (
                    <span key={c || 'none'} className={'color-dot' + (current.color === c ? ' active' : '')}
                      style={{ background: c || 'transparent', borderStyle: c ? 'solid' : 'dashed' }}
                      onClick={() => updateNote(currentId, { color: c })} />
                  ))}
                </div>
                <select value={current.folder_id || ''} onChange={(e) => updateNote(currentId, { folder_id: e.target.value || null })}>
                  <option value="">No folder</option>
                  {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>

              <div className="labels-row">
                {(current.labels || []).map((l) => (
                  <span key={l} className="chip small active" onClick={() => toggleLabel(l)}>#{l} ×</span>
                ))}
                <span className="chip small" onClick={addLabelPrompt}>+ label</span>
              </div>

              <div className="reminder-row">
                <label>Reminder</label>
                <input type="datetime-local" value={current.reminder_at ? current.reminder_at.slice(0, 16) : ''}
                  onChange={(e) => updateNote(currentId, { reminder_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                <select value={current.reminder_recurrence || 'none'} onChange={(e) => updateNote(currentId, { reminder_recurrence: e.target.value })}>
                  <option value="none">Once</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              {current.type === 'text' && (
                <>
                  <div className="rich-toolbar">
                    <button onClick={() => exec('bold')}><b>B</b></button>
                    <button onClick={() => exec('italic')}><i>I</i></button>
                    <button onClick={() => exec('underline')}><u>U</u></button>
                    <button onClick={() => exec('justifyLeft')}>L</button>
                    <button onClick={() => exec('justifyCenter')}>C</button>
                    <button onClick={() => exec('justifyRight')}>R</button>
                    <select onChange={(e) => exec('fontName', e.target.value)} defaultValue="">
                      <option value="" disabled>Font</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Arial">Arial</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Comic Sans MS">Comic Sans</option>
                    </select>
                    <select onChange={(e) => exec('fontSize', e.target.value)} defaultValue="">
                      <option value="" disabled>Size</option>
                      <option value="2">Small</option>
                      <option value="4">Normal</option>
                      <option value="6">Large</option>
                      <option value="7">Huge</option>
                    </select>
                  </div>
                  <div
                    id="note-body" ref={bodyRef} contentEditable suppressContentEditableWarning
                    onInput={onRichInput} data-placeholder="Write here… use [[Note Title]] to link other notes"
                  />
                  {(current.body.match(/\[\[([^\]]+)\]\]/g) || []).length > 0 && (
                    <div className="backlinks-row">
                      {[...new Set((current.body.match(/\[\[([^\]]+)\]\]/g) || []).map((m) => m.slice(2, -2)))].map((title) => (
                        <span key={title} className="chip small" onClick={() => goToBacklink(title)}>\u2192 {title}</span>
                      ))}
                    </div>
                  )}
                  <div className="word-count">{current.body ? current.body.trim().split(/\s+/).filter(Boolean).length : 0} words {current.body.length} chars</div>
                </>
              )}

              {current.type === 'list' && (
                <ListNoteBody note={current} onChange={(items) => updateNote(currentId, { list_items: items })} />
              )}

              {current.type === 'voice' && (
                <VoiceRecorder existingUrl={current.audio_url} existingTranscript={current.body} onSave={saveVoice} />
              )}

              {current.type === 'image' && (
                <div className="image-note-wrap">
                  {current.image_url
                    ? <img src={current.image_url} alt={current.title} className="image-note-preview" />
                    : <input type="file" accept="image/*" onChange={handleImageUpload} />}
                  {current.image_url && (
                    <div className="drawing-actions">
                      <button className="btn ghost" onClick={runOcr}>Extract text (OCR)</button>
                    </div>
                  )}
                  {current.body && <div className="ocr-result">{current.body}</div>}
                </div>
              )}

              {current.type === 'drawing' && (
                <DrawingCanvas existingUrl={current.drawing_url} onSave={saveDrawing} />
              )}

              <div className="note-footer-row">
                <div id="note-save-state">{saveState}</div>
                <div className="note-footer-actions">
                  <button className="chip small" onClick={() => exportNote('txt')}>Export .txt</button>
                  <button className="chip small" onClick={() => exportNote('md')}>Export .md</button>
                  <button className="chip small" onClick={shareByEmail}>Share via email</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function ListNoteBody({ note, onChange }) {
  const [text, setText] = useState('')
  const items = note.list_items || []

  function add() {
    const t = text.trim()
    if (!t) return
    onChange([...items, { text: t, done: false }])
    setText('')
  }
  function toggle(i) {
    onChange(items.map((it, idx) => idx === i ? { ...it, done: !it.done } : it))
  }
  function remove(i) {
    onChange(items.filter((_, idx) => idx !== i))
  }

  return (
    <div className="list-note-body">
      <div className="subtask-add">
        <input type="text" placeholder="Add item…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
      </div>
      {items.map((it, i) => (
        <div className="subtask-row" key={i}>
          <button className="check small" onClick={() => toggle(i)}>
            {it.done && <svg viewBox="0 0 24 24" fill="none" strokeWidth="3"><path d="M4 12l5 5L20 6" /></svg>}
          </button>
          <span className={it.done ? 'sub-done' : ''}>{it.text}</span>
          <button className="del" onClick={() => remove(i)}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
    </div>
  )
}
