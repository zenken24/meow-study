import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, CONFIGURED } from '../supabaseClient.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!CONFIGURED) { setReady(true); return }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null)
      setReady(true)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setReady(true)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  async function signInWithPassword(email, password) {
    return supabase.auth.signInWithPassword({ email, password })
  }
  async function signUp(email, password) {
    return supabase.auth.signUp({ email, password })
  }
  async function signInWithMagicLink(email) {
    return supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } })
  }
  async function signInWithGoogle() {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href,
        scopes: 'https://www.googleapis.com/auth/calendar.events',
        queryParams: { access_type: 'offline', prompt: 'consent' }
      }
    })
  }
  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{ session, ready, signInWithPassword, signUp, signInWithMagicLink, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
