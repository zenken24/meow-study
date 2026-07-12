import { useCallback, useRef } from 'react'
import { useWindows } from '../context/WindowsContext.jsx'
import { useDraggable } from '../hooks/useDraggable.js'

export default function FloatingWindow({ panel, title, defaultWidth, defaultHeight, children }) {
  const { openMap, zMap, closeWindow, bringToFront, getInitialPosition } = useWindows()
  const elRef = useRef(null)
  const headRef = useRef(null)

  const focusThis = useCallback(() => bringToFront(panel), [bringToFront, panel])
  useDraggable(elRef, headRef, focusThis)

  const isOpen = !!openMap[panel]
  const pos = getInitialPosition(panel)

  return (
    <div
      ref={elRef}
      className={'win' + (isOpen ? ' open' : '')}
      id={'win-' + panel}
      style={{
        left: pos.left, top: pos.top,
        width: defaultWidth, height: defaultHeight,
        zIndex: zMap[panel] || 50
      }}
      onPointerDown={() => bringToFront(panel)}
    >
      <div className="win-head" ref={headRef}>
        <div className="win-title">{title}</div>
        <button
          className="win-close"
          data-no-drag
          aria-label={'Close ' + title}
          onClick={(e) => { e.stopPropagation(); closeWindow(panel) }}
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="win-body">
        {children}
      </div>
    </div>
  )
}
