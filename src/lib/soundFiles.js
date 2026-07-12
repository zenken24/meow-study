/* Real-audio-file engine — replaces the synthesized version for the
   soundboard, and plays one-shot sound effects for the Pomodoro timer.
   Ambiance files live in /public/audio/soundtracks, sfx in /public/audio/music. */

const AMBIANCE_PATHS = {
  rain: '/audio/soundtracks/rain.wav',
  cafe: '/audio/soundtracks/cafe.wav',
  fireplace: '/audio/soundtracks/fire.mp3',
  oceanwaves: '/audio/soundtracks/oceanwaves.wav'
}

const SFX_PATHS = {
  start: '/audio/music/blip-bleep.mp3',
  complete: '/audio/music/bling.mp3',
  breakStart: '/audio/music/double-knock.mp3'
}

const ambianceEls = {}

function getAmbianceEl(name) {
  if (!ambianceEls[name]) {
    const el = new Audio(AMBIANCE_PATHS[name])
    el.loop = true
    el.volume = 0
    el.preload = 'auto'
    ambianceEls[name] = el
  }
  return ambianceEls[name]
}

let masterVolume = 0.7
const TRACK_MAX = { rain: 1, cafe: 1, fireplace: 1, oceanwaves: 1 }

export function setLevel(name, pct) {
  const el = getAmbianceEl(name)
  const v = (pct / 100) * (TRACK_MAX[name] ?? 1) * masterVolume
  el.volume = Math.min(1, Math.max(0, v))
  if (pct > 0) {
    el.play().catch(() => { /* needs a user gesture first; slider drag counts */ })
  } else {
    el.pause()
  }
}

export function setMaster(pct) {
  masterVolume = pct / 100
  Object.entries(ambianceEls).forEach(([name, el]) => {
    // re-apply using the last known pct isn't tracked here; caller re-calls setLevel
    // for the currently-open panel on master changes. This just scales volume directly
    // if the track is already playing.
    if (!el.paused) {
      el.volume = Math.min(1, Math.max(0, el.volume))
    }
  })
}

export function stopAll() {
  Object.values(ambianceEls).forEach((el) => { el.pause() })
}

export function playSfx(kind) {
  const path = SFX_PATHS[kind]
  if (!path) return
  const el = new Audio(path)
  el.volume = 0.85
  el.play().catch(() => {})
}
