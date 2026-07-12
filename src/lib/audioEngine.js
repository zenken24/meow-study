/* Synthesized ambiance engine — no audio files needed, everything is
   generated live with the Web Audio API. Ported as-is from the previous
   vanilla build. */

let ctx = null
let master = null
const tracks = {}
const TRACK_MAX = { rain: .5, cafe: .4, fireplace: .5, delta: .35, theta: .35, lava: .45 }

function ensureCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    master = ctx.createGain()
    master.gain.value = .7
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function noiseBuffer(context, seconds) {
  const len = Math.floor(context.sampleRate * seconds)
  const buf = context.createBuffer(1, len, context.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  return buf
}

function loopingNoise(context) {
  const src = context.createBufferSource()
  src.buffer = noiseBuffer(context, 4)
  src.loop = true
  src.start()
  return src
}

function makePops(context, outGain, { minMs, maxMs, burstMs, freqLow, freqHigh, peak }) {
  let timer
  function next() {
    const wait = minMs + Math.random() * (maxMs - minMs)
    timer = setTimeout(() => {
      const src = context.createBufferSource()
      src.buffer = noiseBuffer(context, burstMs / 1000 + 0.05)
      const bp = context.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = freqLow + Math.random() * (freqHigh - freqLow)
      bp.Q.value = 5
      const env = context.createGain()
      env.gain.value = 0
      src.connect(bp).connect(env).connect(outGain)
      const now = context.currentTime
      env.gain.setValueAtTime(0, now)
      env.gain.linearRampToValueAtTime(peak, now + 0.006)
      env.gain.exponentialRampToValueAtTime(0.001, now + burstMs / 1000)
      src.start(now)
      src.stop(now + burstMs / 1000 + 0.05)
      next()
    }, wait)
  }
  next()
  return { stop() { clearTimeout(timer) } }
}

function buildTrack(name) {
  const context = ensureCtx()
  const gain = context.createGain()
  gain.gain.value = 0
  gain.connect(master)

  if (name === 'rain') {
    const src = loopingNoise(context)
    const bp = context.createBiquadFilter()
    bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = .7
    const hs = context.createBiquadFilter()
    hs.type = 'highshelf'; hs.frequency.value = 5500; hs.gain.value = 5
    src.connect(bp).connect(hs).connect(gain)
  } else if (name === 'cafe') {
    const src = loopingNoise(context)
    const lp = context.createBiquadFilter()
    lp.type = 'lowpass'; lp.frequency.value = 1200
    src.connect(lp).connect(gain)
    makePops(context, gain, { minMs: 900, maxMs: 3200, burstMs: 90, freqLow: 900, freqHigh: 2600, peak: .5 })
  } else if (name === 'fireplace') {
    const src = loopingNoise(context)
    const lp = context.createBiquadFilter()
    lp.type = 'lowpass'; lp.frequency.value = 500
    const rumbleGain = context.createGain(); rumbleGain.gain.value = .5
    src.connect(lp).connect(rumbleGain).connect(gain)
    makePops(context, gain, { minMs: 150, maxMs: 700, burstMs: 55, freqLow: 1500, freqHigh: 4500, peak: .7 })
  } else if (name === 'lava') {
    const src = loopingNoise(context)
    const lp = context.createBiquadFilter()
    lp.type = 'lowpass'; lp.frequency.value = 260
    const rumbleGain = context.createGain(); rumbleGain.gain.value = .6
    src.connect(lp).connect(rumbleGain).connect(gain)
    makePops(context, gain, { minMs: 600, maxMs: 2200, burstMs: 220, freqLow: 200, freqHigh: 600, peak: .55 })
  } else if (name === 'delta' || name === 'theta') {
    const carrier = 180
    const beat = name === 'delta' ? 2.2 : 6
    const oscL = context.createOscillator(); oscL.type = 'sine'; oscL.frequency.value = carrier
    const oscR = context.createOscillator(); oscR.type = 'sine'; oscR.frequency.value = carrier + beat
    const panL = context.createStereoPanner(); panL.pan.value = -1
    const panR = context.createStereoPanner(); panR.pan.value = 1
    const toneGain = context.createGain(); toneGain.gain.value = .8
    oscL.connect(panL).connect(toneGain)
    oscR.connect(panR).connect(toneGain)
    toneGain.connect(gain)
    oscL.start(); oscR.start()
  }

  return { gain }
}

export function setLevel(name, pct) {
  if (!ctx && pct <= 0) return
  ensureCtx()
  if (!tracks[name]) tracks[name] = buildTrack(name)
  const max = TRACK_MAX[name] ?? .5
  const v = (pct / 100) * max
  tracks[name].gain.gain.setTargetAtTime(v, ctx.currentTime, .15)
}

export function setMaster(pct) {
  ensureCtx()
  master.gain.setTargetAtTime(pct / 100, ctx.currentTime, .1)
}

export function chime() {
  const context = ensureCtx()
  const g = context.createGain(); g.gain.value = 0
  g.connect(context.destination)
  ;[880, 1318.5].forEach((f, i) => {
    const osc = context.createOscillator()
    osc.type = 'sine'; osc.frequency.value = f
    osc.connect(g)
    osc.start(context.currentTime + i * 0.14)
    osc.stop(context.currentTime + i * 0.14 + .5)
  })
  const now = context.currentTime
  g.gain.setValueAtTime(0, now)
  g.gain.linearRampToValueAtTime(.35, now + 0.02)
  g.gain.exponentialRampToValueAtTime(0.001, now + 1.1)
}
