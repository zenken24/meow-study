import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, CONFIGURED } from '../supabaseClient.js'
import { useAuth } from './AuthContext.jsx'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const { session } = useAuth()
  const [theme, setThemeState] = useState('dark')
  const [backgroundMode, setBackgroundModeState] = useState('default') // 'default' | 'custom' | 'none'
  const [customBackgroundUrl, setCustomBackgroundUrlState] = useState(null)
  const [loaded, setLoaded] = useState(false)

  // Load saved prefs once we have a session
  useEffect(() => {
    if (!session || !CONFIGURED) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('theme, background_mode, custom_background_url')
        .eq('user_id', session.user.id)
        .maybeSingle()
      if (cancelled) return
      if (data) {
        if (data.theme) setThemeState(data.theme)
        if (data.background_mode) setBackgroundModeState(data.background_mode)
        if (data.custom_background_url) setCustomBackgroundUrlState(data.custom_background_url)
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
      value={{ theme, setTheme, backgroundMode, setBackgroundMode, customBackgroundUrl, setCustomBackgroundUrl, backgroundImage, loaded }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
