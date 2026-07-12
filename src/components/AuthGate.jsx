import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { CONFIGURED } from '../supabaseClient.js'

export default function AuthGate() {
  const { signInWithPassword, signUp, signInWithMagicLink, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  async function handleSubmit() {
    setError(''); setStatus('')
    if (!email || !password) { setError('Enter an email and password.'); return }
    const fn = mode === 'signin' ? signInWithPassword : signUp
    const { data, error: err } = await fn(email, password)
    if (err) { setError(err.message); return }
    if (mode === 'signup' && !data.session) {
      setStatus('Check your email to confirm your account, then sign in.')
    }
  }

  async function handleMagicLink() {
    setError('')
    if (!email) { setError('Enter your email above first.'); return }
    const { error: err } = await signInWithMagicLink(email)
    if (err) { setError(err.message); return }
    setStatus('Link sent — check your inbox.')
  }

  if (!CONFIGURED) {
    return (
      <div id="auth-gate">
        <div id="auth-card">
          <div className="mark">meowstudy</div>
          <div className="tag">⋆ a cozy study corner ⋆</div>
          <div id="auth-setup-notice">
            This copy isn't connected to a database yet. Open <code>src/supabaseClient.js</code>,
            fill in <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code> from your Supabase
            project's Settings → API Keys page. See the README for the full walkthrough.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div id="auth-gate">
      <div id="auth-card">
        <div className="mark">meow-study</div>
        <div className="tag">⋆ a cozy study corner ⋆</div>

        <div id="auth-tabs">
          <button className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>Sign in</button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Create account</button>
        </div>

        <label htmlFor="auth-email">Email</label>
        <input id="auth-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />

        <label htmlFor="auth-password">Password</label>
        <input id="auth-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />

        <button className="btn" id="auth-submit" onClick={handleSubmit}>
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
        <button id="auth-magic" onClick={handleMagicLink}>Email me a sign-in link instead</button>

        <div id="auth-divider">or</div>
        <button id="auth-google" onClick={signInWithGoogle}>Continue with Google</button>

        <div id="auth-error">{error}</div>
        <div id="auth-status">{status}</div>
      </div>
    </div>
  )
}
