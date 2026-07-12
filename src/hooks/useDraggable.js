import { useEffect, useRef } from 'react'

/**
 * Makes `elRef` draggable by pointing/dragging `handleRef`.
 * Elements with [data-no-drag] inside the handle are excluded from starting a drag
 * (buttons, mode switches, etc.)
 * Calls onFocus() on pointerdown so the caller can raise z-index.
 */
export function useDraggable(elRef, handleRef, onFocus) {
  const dragging = useRef(false)
  const offset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const el = elRef.current
    const handle = handleRef.current
    if (!el || !handle) return

    function clamp(x, y) {
      const w = el.offsetWidth, h = el.offsetHeight
      return {
        x: Math.min(Math.max(x, 4), window.innerWidth - w - 4),
        y: Math.min(Math.max(y, 4), window.innerHeight - h - 4)
      }
    }

    function onPointerDown(e) {
      if (e.target.closest('[data-no-drag]')) return
      dragging.current = true
      el.classList.add('dragging')
      if (onFocus) onFocus()
      const rect = el.getBoundingClientRect()
      el.style.left = rect.left + 'px'
      el.style.top = rect.top + 'px'
      el.style.transform = 'none'
      offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      handle.setPointerCapture(e.pointerId)
    }
    function onPointerMove(e) {
      if (!dragging.current) return
      const p = clamp(e.clientX - offset.current.x, e.clientY - offset.current.y)
      el.style.left = p.x + 'px'
      el.style.top = p.y + 'px'
    }
    function endDrag() {
      dragging.current = false
      el.classList.remove('dragging')
    }

    handle.addEventListener('pointerdown', onPointerDown)
    handle.addEventListener('pointermove', onPointerMove)
    handle.addEventListener('pointerup', endDrag)
    handle.addEventListener('pointercancel', endDrag)

    return () => {
      handle.removeEventListener('pointerdown', onPointerDown)
      handle.removeEventListener('pointermove', onPointerMove)
      handle.removeEventListener('pointerup', endDrag)
      handle.removeEventListener('pointercancel', endDrag)
    }
  }, [elRef, handleRef, onFocus])
}
