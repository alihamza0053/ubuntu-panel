import { FitAddon } from '@xterm/addon-fit'
import { Terminal as XTerm } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { useEffect, useRef, useState } from 'react'
import { wsUrl } from '../api/ws'
import PageHeader from '../components/PageHeader'

// xterm palette matched to the panel: near-black ground, mint for success
// tones, aqua for info, muted teal-grey for ordinary output.
const XTERM_THEME = {
  background: '#04090C',
  foreground: '#A6C2C6',
  cursor: '#3FE39B',
  cursorAccent: '#04090C',
  selectionBackground: 'rgba(63,227,155,0.28)',
  black: '#0D1D25',
  red: '#F87171',
  green: '#3FE39B',
  yellow: '#FBBF24',
  blue: '#22E5CE',
  magenta: '#C4B5FD',
  cyan: '#7BF3C0',
  white: '#CFE4E1',
  brightBlack: '#5F7E89',
  brightRed: '#FCA5A5',
  brightGreen: '#7BF3C0',
  brightYellow: '#FCD34D',
  brightBlue: '#67F0E1',
  brightMagenta: '#DDD6FE',
  brightCyan: '#B6FBDC',
  brightWhite: '#E7F5F1',
}

const STATUS_BADGE = {
  connected: 'badge-mint',
  connecting: 'badge-amber',
}

/**
 * Full interactive terminal backed by a server-side PTY over WebSocket.
 *
 * Frame protocol (JSON):
 *   client → {type:'input', data} | {type:'resize', cols, rows}
 *   server → {type:'output', data}
 */
export default function Terminal() {
  const containerRef = useRef(null)
  const [status, setStatus] = useState('connecting')

  useEffect(() => {
    const term = new XTerm({
      fontSize: 13,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      theme: XTERM_THEME,
      cursorBlink: true,
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(containerRef.current)
    fit.fit()

    const socket = new WebSocket(wsUrl('/ws/terminal'))

    socket.onopen = () => {
      setStatus('connected')
      // Send initial size
      socket.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }))
      term.focus()
    }
    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'output') term.write(msg.data)
      } catch {
        term.write(event.data)
      }
    }
    socket.onclose = () => {
      setStatus('disconnected')
      term.write('\r\n\x1b[31m[connection closed]\x1b[0m\r\n')
    }
    socket.onerror = () => setStatus('error')

    // Keystrokes → server
    term.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'input', data }))
      }
    })

    // Resize handling
    function handleResize() {
      fit.fit()
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }))
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      socket.close()
      term.dispose()
    }
  }, [])

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Terminal"
        crumbs={[{ label: 'ServerHub', to: '/dashboard' }, { label: 'Terminal' }]}
        lead="Full bash session — run any command (apt, pip, nano, top…)."
        badge={
          <span className={`badge ${STATUS_BADGE[status] || 'badge-red'}`}>
            <span className={status === 'connected' ? 'dot-pulse' : 'dot'} />
            {status}
          </span>
        }
      />

      <div className="log-pane flex-1" style={{ minHeight: '70vh' }}>
        <div className="log-head">
          <span className="flex items-center gap-2 font-mono text-ink-dim">/bin/bash</span>
        </div>
        <div className="bg-panel-ink p-3">
          <div ref={containerRef} style={{ height: '70vh' }} />
        </div>
      </div>
    </div>
  )
}
