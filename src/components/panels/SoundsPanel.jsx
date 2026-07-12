import { useEffect, useRef, useState } from 'react'
import * as Sound from '../../lib/soundFiles.js'
import { useNotify } from '../../context/NotificationContext.jsx'

const TRACKS = [
  { id: 'rain', label: 'Rain', icon: <path d="M16 13v8M8 13v8M12 15v8 M20 9a4 4 0 0 0-3-6.6A5.5 5.5 0 0 0 7 5 4.5 4.5 0 0 0 4 13h15a3.5 3.5 0 0 0 1-6.9" /> },
  { id: 'cafe', label: 'Cafe', icon: <path d="M18 8h1a4 4 0 0 1 0 8h-1 M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z M6 1v3M10 1v3M14 1v3" /> },
  { id: 'fireplace', label: 'Fireplace', icon: <path d="M12 2c1 3-3 4-3 8a3 3 0 0 0 6 0c1 1 2 2.5 2 4.5A5.5 5.5 0 0 1 11.5 20 6 6 0 0 1 6 14c0-4 3-6 3-9 1 1 2 2 3-3z" /> },
  { id: 'oceanwaves', label: 'Ocean Waves', icon: <path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" /> }
]

export default function SoundsPanel({ savedLevels, onLevelsChange, savedMixes, onMixesChange }) {
  const { notify, confirmDialog } = useNotify()
  const [master, setMaster] = useState(savedLevels?.master ?? 70)
  const [levels, setLevels] = useState(() => {
    const init = {}
    TRACKS.forEach((t) => { init[t.id] = savedLevels?.[t.id] ?? 0 })
    return init
  })
  const [mixName, setMixName] = useState('')
  const saveTimer = useRef(null)
  const appliedInitial = useRef(false)

  useEffect(() => {
    if (appliedInitial.current) return
    appliedInitial.current = true
    Sound.setMaster(master)
    TRACKS.forEach((t) => { if (levels[t.id] > 0) Sound.setLevel(t.id, levels[t.id]) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function scheduleSave(nextLevels, nextMaster) {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      onLevelsChange({ master: nextMaster, ...nextLevels })
    }, 400)
  }

  function applyAll(nextLevels, nextMaster) {
    Sound.setMaster(nextMaster)
    TRACKS.forEach((t) => Sound.setLevel(t.id, nextLevels[t.id] ?? 0))
  }

  function handleMaster(v) {
    setMaster(v)
    Sound.setMaster(v)
    TRACKS.forEach((t) => Sound.setLevel(t.id, levels[t.id]))
    scheduleSave(levels, v)
  }

  function handleTrack(id, v) {
    const next = { ...levels, [id]: v }
    setLevels(next)
    Sound.setLevel(id, v)
    scheduleSave(next, master)
  }

  function saveMix() {
    const name = mixName.trim()
    if (!name) { notify('Give your mix a name first.'); return }
    const mix = { name, master, levels: { ...levels } }
    const next = [...(savedMixes || []).filter((m) => m.name !== name), mix]
    onMixesChange(next)
    setMixName('')
    notify(`Saved "${name}" \u2727`)
  }

  function loadMix(mix) {
    setMaster(mix.master)
    setLevels(mix.levels)
    applyAll(mix.levels, mix.master)
    scheduleSave(mix.levels, mix.master)
  }

  async function deleteMix(name) {
    const ok = await confirmDialog(`Delete the "${name}" mix?`)
    if (!ok) return
    onMixesChange((savedMixes || []).filter((m) => m.name !== name))
  }

  return (
    <section id="panel-sounds">
      <div className="panel-head"><h2>Soundboard</h2></div>

      <div className="card master">
        <div className="slider-row">
          <div className="lbl"><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6"><path d="M4 9v6h4l5 5V4L8 9H4z" /><path d="M17 8a5 5 0 0 1 0 8" /></svg>Master</div>
          <input type="range" min="0" max="100" value={master} onChange={(e) => handleMaster(Number(e.target.value))} />
          <div className="val">{master}%</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div id="tracks">
          {TRACKS.map((t) => (
            <div className="slider-row track-row" key={t.id}>
              <div className="lbl"><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6">{t.icon}</svg>{t.label}</div>
              <input type="range" min="0" max="100" value={levels[t.id]} onChange={(e) => handleTrack(t.id, Number(e.target.value))} />
              <div className="val">{levels[t.id]}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 16, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Saved mixes</div>
        <div className="settings-inline" style={{ marginBottom: 12 }}>
          <input type="text" placeholder="e.g. Rainy Cafe" value={mixName} onChange={(e) => setMixName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveMix()} />
          <button className="btn ghost" onClick={saveMix}>Save current</button>
        </div>
        <div className="chips" style={{ overflowY: 'auto' }}>
          {(savedMixes || []).length === 0 && <div style={{ color: 'var(--text-faint)', fontSize: 12.5, fontStyle: 'italic' }}>No saved mixes yet.</div>}
          {(savedMixes || []).map((m) => (
            <span key={m.name} className="chip" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'default' }}>
              <span style={{ cursor: 'pointer' }} onClick={() => loadMix(m)}>{m.name}</span>
              <span style={{ cursor: 'pointer', opacity: .6 }} onClick={() => deleteMix(m.name)}>×</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
