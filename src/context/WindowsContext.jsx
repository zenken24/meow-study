import { createContext, useCallback, useContext, useRef, useState } from 'react'

const WindowsContext = createContext(null)

const PANEL_ORDER = ['sounds', 'media', 'tasks', 'notes', 'calendar', 'streak', 'settings']

export function WindowsProvider({ children }) {
  const [openMap, setOpenMap] = useState({})
  const [zMap, setZMap] = useState({})
  const zTop = useRef(50)
  const cascadeIndex = useRef(0)
  const placedRef = useRef({}) // panel -> {left, top} already assigned this session

  const bringToFront = useCallback((panel) => {
    zTop.current += 1
    setZMap((m) => ({ ...m, [panel]: zTop.current }))
  }, [])

  const openWindow = useCallback((panel) => {
    setOpenMap((m) => ({ ...m, [panel]: true }))
    if (!placedRef.current[panel]) {
      const off = (cascadeIndex.current % 7) * 32
      cascadeIndex.current += 1
      placedRef.current[panel] = { left: 40 + off, top: 86 + off }
    }
    bringToFront(panel)
  }, [bringToFront])

  const closeWindow = useCallback((panel) => {
    setOpenMap((m) => ({ ...m, [panel]: false }))
  }, [])

  const toggleWindow = useCallback((panel) => {
    setOpenMap((m) => {
      const next = !m[panel]
      if (next) openWindow(panel)
      return { ...m, [panel]: next }
    })
  }, [openWindow])

  const getInitialPosition = useCallback((panel) => placedRef.current[panel] || { left: 40, top: 86 }, [])

  return (
    <WindowsContext.Provider
      value={{ openMap, zMap, openWindow, closeWindow, toggleWindow, bringToFront, getInitialPosition, PANEL_ORDER }}
    >
      {children}
    </WindowsContext.Provider>
  )
}

export function useWindows() {
  return useContext(WindowsContext)
}
