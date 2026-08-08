import { useEffect, useRef, useState } from 'react'
import { wsUrl } from '../api/ws'

// Colour log lines: failures red, successes mint, system/pipeline markers aqua.
function lineColor(line) {
  const l = line.toLowerCase()
  if (line.includes('✗') || l.includes('failed') || l.includes('error') || l.includes('traceback')) {
    return 'log-err'
  }
  if (line.includes('✓') || l.includes('status=success') || l.includes(' ok')) {
    return 'log-ok'
  }
  if (line.includes('[pipeline]') || line.includes('[serverhub]')) {
    return 'log-sys'
  }
  return ''
}

/**
 * Terminal-style live log panel fed by a WebSocket.
 *
 * Props:
 *   path     — backend WS path (e.g. /ws/script/3/run); null = idle
 *   onClose  — called when the socket closes (run finished)
 */
export default function LiveLog({ path, onClose }) {
  const [lines, setLines] = useState([])
  const [connected, setConnected] = useState(false)
  const boxRef = useRef(null)
  const socketRef = useRef(null)

  useEffect(() => {
    if (!path) return
    setLines([])
    const socket = new WebSocket(wsUrl(path))
    socketRef.current = socket

    socket.onopen = () => setConnected(true)
    socket.onmessage = (event) => setLines((prev) => [...prev, event.data])
    socket.onerror = () => setLines((prev) => [...prev, '[connection error]'])
    socket.onclose = () => {
      setConnected(false)
      onClose?.()
    }
    return () => socket.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  // Auto-scroll to bottom as lines arrive
  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight
  }, [lines])

  if (!path) return null

  return (
    <div className="log-pane mt-3">
      <div className="log-head">
        <span className={`flex items-center gap-2 font-medium ${connected ? 'text-mint-300' : 'text-ink-dim'}`}>
          <span className={connected ? 'dot-pulse' : 'dot'} />
          {connected ? 'live' : 'closed'}
        </span>
        <button onClick={() => setLines([])} className="act">clear</button>
      </div>
      <div ref={boxRef} className="log-body h-64">
        {lines.length
          ? lines.map((line, i) => (
              <div key={i} className={lineColor(line)}>{line || ' '}</div>
            ))
          : <span className="text-ink-faint">Waiting for output…</span>}
      </div>
    </div>
  )
}
