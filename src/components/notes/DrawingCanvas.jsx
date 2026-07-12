import { useEffect, useRef, useState } from 'react'

export default function DrawingCanvas({ existingUrl, onSave }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const [hasStroke, setHasStroke] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#FF1493'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (existingUrl) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      img.src = existingUrl
    }
  }, [existingUrl])

  function pos(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: (e.clientX - rect.left) * (canvasRef.current.width / rect.width), y: (e.clientY - rect.top) * (canvasRef.current.height / rect.height) }
  }

  function start(e) {
    drawing.current = true
    setHasStroke(true)
    const ctx = canvasRef.current.getContext('2d')
    const p = pos(e)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
  }
  function move(e) {
    if (!drawing.current) return
    const ctx = canvasRef.current.getContext('2d')
    const p = pos(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }
  function end() { drawing.current = false }

  function clear() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasStroke(false)
  }

  function save() {
    canvasRef.current.toBlob((blob) => onSave(blob), 'image/png')
  }

  return (
    <div className="drawing-wrap">
      <canvas
        ref={canvasRef} width={520} height={320} className="drawing-canvas"
        onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end}
      />
      <div className="drawing-actions">
        <button className="btn ghost" onClick={clear}>Clear</button>
        <button className="btn" onClick={save} disabled={!hasStroke}>Save drawing</button>
      </div>
    </div>
  )
}
