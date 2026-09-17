import { useRef } from "react"

/**
 * Fires a callback after holding an element for `ms` milliseconds.
 * Cancels if the pointer moves more than 10px (so swipes work).
 * Also prevents the OS context menu on long-press.
 */
export function useLongPress(callback, ms = 500) {
  const timer = useRef(null)
  const startPos = useRef({ x: 0, y: 0 })
  const moved = useRef(false)

  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }

  const start = (e) => {
    moved.current = false
    const touch = e.touches?.[0] || e
    startPos.current = { x: touch.clientX ?? 0, y: touch.clientY ?? 0 }
    clear()
    timer.current = setTimeout(() => {
      if (!moved.current) {
        callback(e)
      }
    }, ms)
  }

  const move = (e) => {
    const touch = e.touches?.[0] || e
    const dx = Math.abs((touch.clientX ?? 0) - startPos.current.x)
    const dy = Math.abs((touch.clientY ?? 0) - startPos.current.y)
    if (dx > 10 || dy > 10) {
      moved.current = true
      clear()
    }
  }

  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: move,
    onTouchCancel: clear,
    onContextMenu: (e) => {
      e.preventDefault()
      callback(e)
    },
  }
}
