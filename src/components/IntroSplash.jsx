import { useEffect, useState } from 'react'

const SESSION_KEY = 'meow-study-intro-seen'
const AUTO_DISMISS_MS = 2600

const STARS = [
  { char: '\u2726', top: '28%', left: '22%', delay: '0s', size: 18 },
  { char: '\u2727', top: '68%', left: '78%', delay: '.3s', size: 14 },
  { char: '\u22c6', top: '20%', left: '76%', delay: '.6s', size: 22 },
  { char: '\u2727', top: '74%', left: '20%', delay: '.9s', size: 16 },
  { char: '\u2726', top: '46%', left: '88%', delay: '.45s', size: 12 },
  { char: '\u22c6', top: '82%', left: '48%', delay: '.15s', size: 14 }
]

export default function IntroSplash() {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return
    setVisible(true)
    const t = setTimeout(dismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(t)
  }, [])

  function dismiss() {
    setLeaving(true)
    sessionStorage.setItem(SESSION_KEY, '1')
    setTimeout(() => setVisible(false), 450)
  }

  if (!visible) return null

  return (
    <div className={'intro-splash' + (leaving ? ' leaving' : '')} onClick={dismiss}>
      <div className="intro-glow" />
      {STARS.map((s, i) => (
        <span
          key={i}
          className="intro-star"
          style={{ top: s.top, left: s.left, animationDelay: s.delay, fontSize: s.size }}
        >
          {s.char}
        </span>
      ))}
      <div className="intro-center">
        <div className="intro-mark">meow-study</div>
        <div className="intro-tagline">⋆ a cozy study corner ⋆</div>
      </div>
      <div className="intro-skip">tap anywhere to continue</div>
    </div>
  )
}