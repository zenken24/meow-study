import { createContext, useCallback, useContext, useRef, useState } from 'react'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState(null) // { message, resolve }
  const idRef = useRef(0)

  const notify = useCallback((message, opts = {}) => {
    const id = ++idRef.current
    const duration = opts.duration ?? 3200
    setToasts((t) => [...t, { id, message, tone: opts.tone || 'default' }])
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, duration)
  }, [])

  const confirmDialog = useCallback((message) => {
    return new Promise((resolve) => {
      setConfirmState({ message, resolve })
    })
  }, [])

  function resolveConfirm(result) {
    if (confirmState) confirmState.resolve(result)
    setConfirmState(null)
  }

  return (
    <NotificationContext.Provider value={{ notify, confirmDialog }}>
      {children}

      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={'toast-item show tone-' + t.tone}>
            {t.message}
          </div>
        ))}
      </div>

      {confirmState && (
        <div className="confirm-overlay" onClick={() => resolveConfirm(false)}>
          <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-message">{confirmState.message}</div>
            <div className="confirm-actions">
              <button className="btn ghost" onClick={() => resolveConfirm(false)}>Cancel</button>
              <button className="btn" onClick={() => resolveConfirm(true)}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  )
}

export function useNotify() {
  return useContext(NotificationContext)
}
