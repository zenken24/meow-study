import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, CONFIGURED } from '../supabaseClient.js'
import { useAuth } from './AuthContext.jsx'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const { session } = useAuth()
  const [theme, setThemeState] = useState('dark')
  const [backgroundMode, setBackgroundModeState] = useState('default')
  const [customBackgroundUrl, setCustomBackgroundUrlState] = useState(null)
  const [username, setUsernameState] = useState('')
  const [avatarUrl, setAvatarUrlState] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!session || !CONFIGURED) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('theme, background_mode, custom_background_url, username, avatar_url')
        .eq('user_id', session.user.id)
        .maybeSingle()
      if (cancelled) return
      if (data) {
        if (data.theme) setThemeState(data.theme)
        if (data.background_mode) setBackgroundModeState(data.background_mode)
        if (data.custom_background_url) setCustomBackgroundUrlState(data.custom_background_url)
        setUsernameState(data.username || '')
        setAvatarUrlState(data.avatar_url || null)
      }

      const pendingRaw = sessionStorage.getItem('pending_profile')
      if (pendingRaw) {
        sessionStorage.removeItem('pending_profile')
        try {
          const pending = JSON.parse(pendingRaw)
          let avatarUrlToSave = data?.avatar_url || null
          if (pending.avatarDataUrl) {
            const blob = await (await fetch(pending.avatarDataUrl)).blob()
            const path = `${session.user.id}/avatar-${Date.now()}.png`
            const { error: upErr } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true })
            if (!upErr) {
              const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
              avatarUrlToSave = pub.publicUrl
            }
          }
          const usernameToSave = pending.username || data?.username || ''
          await supabase.from('profiles').upsert(
            { user_id: session.user.id, username: usernameToSave, avatar_url: avatarUrlToSave, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
          )
          if (cancelled) return
          setUsernameState(usernameToSave)
          setAvatarUrlState(avatarUrlToSave)
        } catch {
          // malformed/missing pending profile — ignore
        }
      }

      setLoaded(true)
    })()
    return () => { cancelled = true }
  }, [session])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const persist = useCallback(async (fields) => {
    if (!session || !CONFIGURED) return
    await supabase.from('profiles').upsert(
      { user_id: session.user.id, ...fields, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  }, [session])

  const setTheme = useCallback((t) => {
    setThemeState(t)
    persist({ theme: t })
  }, [persist])

  const setBackgroundMode = useCallback((mode) => {
    setBackgroundModeState(mode)
    persist({ background_mode: mode })
  }, [persist])

  const setCustomBackgroundUrl = useCallback((url) => {
    setCustomBackgroundUrlState(url)
    persist({ custom_background_url: url, background_mode: 'custom' })
    setBackgroundModeState('custom')
  }, [persist])

  const setUsername = useCallback((u) => {
    setUsernameState(u)
    persist({ username: u })
  }, [persist])

  const setAvatarUrl = useCallback((url) => {
    setAvatarUrlState(url)
    persist({ avatar_url: url })
  }, [persist])

  const backgroundImage =
    backgroundMode === 'none'
      ? null
      : backgroundMode === 'custom' && customBackgroundUrl
      ? customBackgroundUrl
      : theme === 'dark'
      ? '/dark_mode.jpeg'
      : '/light_mode.jpeg'

  return (
    <ThemeContext.Provider
      value={{
        theme, setTheme, backgroundMode, setBackgroundMode, customBackgroundUrl, setCustomBackgroundUrl,
        backgroundImage, loaded, username, setUsername, avatarUrl, setAvatarUrl
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}