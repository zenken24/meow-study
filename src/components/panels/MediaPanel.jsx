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
  const [historyMeta, setHistoryMeta] = useState({})
  const [favorites, setFavorites] = useState(savedState?.favorites || [])
  const [loop, setLoop] = useState(false)
  const playerRef = useRef(null)
  const mountRef = useRef(null)
  const loopRef = useRef(false)

  useEffect(() => {
    if (savedState?.url) load(savedState.url, { save: false, autoplay: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Titles/thumbnails for the history and favorites grids, fetched from
  // YouTube's public oEmbed endpoint (no API key needed) — only for links
  // not already cached.
  useEffect(() => {
    const missing = [...new Set([...history, ...favorites])].filter((h) => !historyMeta[h])
    if (!missing.length) return
    missing.forEach(async (h) => {
      try {
        const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(h)}&format=json`)
        if (!res.ok) throw new Error('oembed failed')
        const data = await res.json()
        setHistoryMeta((m) => ({ ...m, [h]: { title: data.title, thumbnail: data.thumbnail_url } }))
      } catch {
        setHistoryMeta((m) => ({ ...m, [h]: { title: h, thumbnail: null } }))
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, favorites])

  async function load(loadUrl, { save = true, fromHistoryIdx = null, autoplay = true } = {}) {
    const { videoId, listId } = parseYouTube(loadUrl)
    if (!videoId && !listId) { notify('Couldn\u2019t read that link — try a youtu.be or watch?v= URL.'); return }
    await loadYouTubeApi()
    if (playerRef.current) { playerRef.current.destroy(); playerRef.current = null }
    const opts = {
      height: '100%', width: '100%',
      playerVars: { autoplay: autoplay ? 1 : 0 },
      events: {
        onReady: (e) => {
          e.target.setVolume(volume)
          if (listId && typeof e.target.setLoop === 'function') e.target.setLoop(loopRef.current)
        },
        onStateChange: (e) => {
          if (!listId && loopRef.current && e.data === window.YT.PlayerState.ENDED) {
            e.target.seekTo(0)
            e.target.playVideo()
          }
        }
      }
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
    onStateChange({ url: loadUrl, volume, history: nextHistory, favorites })
  }

  function loadFavorite(h) {
    const idx = history.indexOf(h)
    if (idx >= 0) setHistoryIdx(idx)
    load(h, { save: false, fromHistoryIdx: idx >= 0 ? idx : null })
  }

  function toggleFavorite() {
    if (!url) return
    const next = favorites.includes(url)
      ? favorites.filter((f) => f !== url)
      : [...favorites, url].slice(-3)
    setFavorites(next)
    onStateChange({ url, volume, history, favorites: next })
  }

  function toggleLoop() {
    const next = !loop
    setLoop(next)
    loopRef.current = next
    if (playerRef.current && typeof playerRef.current.setLoop === 'function') {
      playerRef.current.setLoop(next)
    }
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
    onStateChange({ url, volume: v, history, favorites })
  }

  const ordered = history.map((h, i) => ({ url: h, idx: i })).reverse()
  const recentThree = ordered.slice(0, 3)

  return (
    <section id="panel-media">
      <div className="panel-head"><h2>Now playing</h2></div>

      {favorites.length > 0 && (
        <div className="card media-recent-card">
          <div className="eyebrow" style={{ marginBottom: 10 }}>Favorites</div>
          <div className="media-history-grid">
            {[...favorites].reverse().map((h) => {
              const meta = historyMeta[h]
              return (
                <div key={h} className={'media-history-item' + (h === url ? ' active' : '')} onClick={() => loadFavorite(h)}>
                  <div className="media-history-thumb">
                    {meta?.thumbnail
                      ? <img src={meta.thumbnail} alt="" />
                      : <div className="media-history-thumb-empty">▶</div>}
                  </div>
                  <div className="media-history-title">{meta?.title || h}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {recentThree.length > 0 && (
        <div className="card media-recent-card">
          <div className="eyebrow" style={{ marginBottom: 10 }}>Recently played</div>
          <div className="media-history-grid">
            {recentThree.map(({ url: h, idx }) => {
              const meta = historyMeta[h]
              return (
                <div
                  key={h}
                  className={'media-history-item' + (idx === historyIdx ? ' active' : '')}
                  onClick={() => { setHistoryIdx(idx); load(h, { save: false, fromHistoryIdx: idx }) }}
                >
                  <div className="media-history-thumb">
                    {meta?.thumbnail
                      ? <img src={meta.thumbnail} alt="" />
                      : <div className="media-history-thumb-empty">▶</div>}
                  </div>
                  <div className="media-history-title">{meta?.title || h}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
        <button
          className={'icon-btn' + (favorites.includes(url) ? ' active' : '')}
          onClick={toggleFavorite} disabled={!url} title="Favorite this video"
        >★</button>
        <button
          className={'icon-btn' + (loop ? ' active' : '')}
          onClick={toggleLoop} disabled={!url} title="Loop this video"
          style={{ fontSize: 16 }}
        >⟳</button>
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

      {ordered.length > 0 && (
        <div className="card media-history-card">
          <div className="eyebrow" style={{ marginBottom: 8 }}>History</div>
          <div className="media-history-list">
            {ordered.map(({ url: h, idx }) => (
              <div
                key={h}
                className={'media-history-list-item' + (idx === historyIdx ? ' active' : '')}
                onClick={() => { setHistoryIdx(idx); load(h, { save: false, fromHistoryIdx: idx }) }}
              >
                {historyMeta[h]?.title || h}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
