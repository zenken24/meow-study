import { useEffect, useRef, useState } from 'react'
import { useNotify } from '../../context/NotificationContext.jsx'

let ytApiPromise = null
function loadYouTubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve()
  if (ytApiPromise) return ytApiPromise
  ytApiPromise = new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = resolve
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })
  return ytApiPromise
}

function parseYouTube(url) {
  try {
    const u = new URL(url.trim())
    let videoId = null
    const listId = u.searchParams.get('list')
    if (u.hostname.includes('youtu.be')) videoId = u.pathname.slice(1)
    else if (u.searchParams.get('v')) videoId = u.searchParams.get('v')
    else if (u.pathname.startsWith('/embed/')) videoId = u.pathname.split('/embed/')[1]
    return { videoId, listId }
  } catch {
    return { videoId: null, listId: null }
  }
}

export default function MediaPanel({ savedState, onStateChange }) {
  const { notify } = useNotify()
  const [url, setUrl] = useState(savedState?.url || '')
  const [volume, setVolume] = useState(savedState?.volume ?? 60)
  const [history, setHistory] = useState(savedState?.history || [])
  const [historyIdx, setHistoryIdx] = useState(
    savedState?.history?.length ? savedState.history.length - 1 : -1
  )
  const [loaded, setLoaded] = useState(false)
  const playerRef = useRef(null)
  const mountRef = useRef(null)

  useEffect(() => {
    if (savedState?.url) load(savedState.url, { save: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load(loadUrl, { save = true, fromHistoryIdx = null } = {}) {
    const { videoId, listId } = parseYouTube(loadUrl)
    if (!videoId && !listId) { notify('Couldn\u2019t read that link — try a youtu.be or watch?v= URL.'); return }
    await loadYouTubeApi()
    if (playerRef.current) { playerRef.current.destroy(); playerRef.current = null }
    const opts = {
      height: '100%', width: '100%',
      playerVars: { autoplay: 1 },
      events: { onReady: (e) => e.target.setVolume(volume) }
    }
    if (listId) { opts.playerVars.listType = 'playlist'; opts.playerVars.list = listId }
    if (videoId) opts.videoId = videoId
    playerRef.current = new window.YT.Player(mountRef.current, opts)
    setLoaded(true)
    setUrl(loadUrl)

    let nextHistory = history
    let nextIdx = fromHistoryIdx
    if (save) {
      nextHistory = [...history.filter((h) => h !== loadUrl), loadUrl]
      nextIdx = nextHistory.length - 1
      setHistory(nextHistory)
      setHistoryIdx(nextIdx)
    }
    onStateChange({ url: loadUrl, volume, history: nextHistory })
  }

  function goBack() {
    if (historyIdx <= 0) return
    const idx = historyIdx - 1
    setHistoryIdx(idx)
    load(history[idx], { save: false, fromHistoryIdx: idx })
  }
  function goForward() {
    if (historyIdx >= history.length - 1) return
    const idx = historyIdx + 1
    setHistoryIdx(idx)
    load(history[idx], { save: false, fromHistoryIdx: idx })
  }

  function handleVolume(v) {
    setVolume(v)
    if (playerRef.current && playerRef.current.setVolume) playerRef.current.setVolume(v)
    onStateChange({ url, volume: v, history })
  }

  return (
    <section id="panel-media">
      <div className="panel-head"><h2>Now playing</h2></div>
      <div className="url-row">
        <button className="nav-btn" onClick={goBack} disabled={historyIdx <= 0} title="Previous link">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <input
          type="text" id="yt-url" placeholder="Paste a YouTube video or playlist link…"
          value={url} onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') load(url) }}
        />
        <button className="nav-btn" onClick={goForward} disabled={historyIdx >= history.length - 1} title="Next link">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </button>
        <button className="btn" onClick={() => load(url)}>Load</button>
      </div>
      <div id="yt-wrap">
        <div ref={mountRef} style={{ width: '100%', height: '100%', display: loaded ? 'block' : 'none' }} />
        {!loaded && <div id="yt-empty">Nothing playing yet ⋆ drop a link above!</div>}
      </div>
      <div className="card media-vol" style={{ marginBottom: 14 }}>
        <div className="slider-row">
          <div className="lbl">Volume</div>
          <input type="range" min="0" max="100" value={volume} onChange={(e) => handleVolume(Number(e.target.value))} />
          <div className="val">{volume}%</div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="card" style={{ padding: 14, flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>History</div>
          {history.map((h, i) => (
            <div key={h} className={'history-row' + (i === historyIdx ? ' active' : '')} onClick={() => { setHistoryIdx(i); load(h, { save: false, fromHistoryIdx: i }) }}>
              {h}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
