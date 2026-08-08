import { useEffect, useMemo, useRef, useState } from 'react'
import api, { errorMessage } from '../api/client'
import { wsUrl } from '../api/ws'
import Icon from '../components/Icon'
import LiveLog from '../components/LiveLog'
import PageHeader from '../components/PageHeader'

/**
 * Always-on global activity feed — streams everything the panel is doing right
 * now (scripts running, pipelines, dashboard actions), failures in red.
 */
function LiveActivity() {
  const [open, setOpen] = useState(true)
  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="sec-title">Live Activity</h3>
        <span className="hint">scripts, pipelines &amp; dashboard actions as they happen</span>
        <button className="btn-ghost btn-sm ml-auto" onClick={() => setOpen((o) => !o)}>
          <Icon name={open ? 'chevron-down' : 'chevron-right'} size={13} />
          {open ? 'hide' : 'show'}
        </button>
      </div>
      {open && <LiveLog path="/ws/logs/activity/all" />}
    </div>
  )
}

/**
 * Log viewer: sidebar of sources, main panel showing content, a Live toggle
 * that streams via WebSocket, search filter, and download.
 */
export default function Logs() {
  const [sources, setSources] = useState([])
  const [selected, setSelected] = useState(null) // {type, name, label}
  const [lines, setLines] = useState([])
  const [live, setLive] = useState(false)
  const [filter, setFilter] = useState('')
  const boxRef = useRef(null)
  const socketRef = useRef(null)

  useEffect(() => {
    api.get('/logs/sources').then((res) => setSources(res.data)).catch(() => {})
  }, [])

  // Build the REST URL for a static (non-live) fetch of a source
  function restPath(src) {
    if (src.type === 'nginx') return `/logs/nginx/${src.name}`
    if (src.type === 'system') return '/logs/system'
    if (src.type === 'supervisor') return `/logs/supervisor/${src.name}`
    if (src.type === 'pipeline') return `/logs/pipeline/${src.name}`
    if (src.type === 'script') return `/logs/script/${src.name}`
    return null
  }

  async function loadStatic(src) {
    try {
      const res = await api.get(restPath(src))
      setLines(res.data.content.split('\n'))
    } catch (err) {
      setLines([errorMessage(err)])
    }
  }

  // Switch source / toggle live
  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }
    if (!selected) return

    if (live) {
      setLines([])
      const socket = new WebSocket(wsUrl(`/ws/logs/${selected.type}/${selected.name}`))
      socket.onmessage = (e) => setLines((prev) => [...prev, e.data])
      socket.onclose = () => {}
      socketRef.current = socket
      return () => socket.close()
    } else {
      loadStatic(selected)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, live])

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight
  }, [lines])

  const filtered = useMemo(
    () => (filter ? lines.filter((l) => l.toLowerCase().includes(filter.toLowerCase())) : lines),
    [lines, filter],
  )

  function download() {
    if (!selected) return
    api
      .get('/logs/download', {
        params: { log_type: selected.type, name: selected.name },
        responseType: 'blob',
      })
      .then((res) => {
        const url = URL.createObjectURL(res.data)
        const a = document.createElement('a')
        a.href = url
        a.download = `${selected.type}-${selected.name}.txt`
        a.click()
        URL.revokeObjectURL(url)
      })
      .catch((err) => alert(errorMessage(err)))
  }

  return (
    <div>
      <PageHeader
        title="Logs"
        crumbs={[{ label: 'ServerHub', to: '/dashboard' }, { label: 'Logs' }]}
        lead="Nginx, system, supervisor, pipeline and script output — tail any of them live."
      />

      {/* Always-on global activity feed */}
      <LiveActivity />

      <div className="mt-4 flex flex-col gap-4 lg:flex-row" style={{ minHeight: '70vh' }}>
        {/* Sidebar */}
        <aside className="card w-full shrink-0 overflow-y-auto lg:w-64">
          <h4 className="label">Sources</h4>
          <ul className="space-y-0.5">
            {sources.map((src) => {
              const active = selected?.type === src.type && selected?.name === src.name
              return (
                <li key={`${src.type}-${src.name}`}>
                  <button
                    onClick={() => setSelected(src)}
                    className={`list-item ${active ? 'list-item-active' : ''}`}
                  >
                    {src.label}
                  </button>
                </li>
              )
            })}
            {sources.length === 0 && <li className="px-2.5 text-xs text-ink-faint">No sources</li>}
          </ul>
        </aside>

        {/* Main panel */}
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="truncate font-mono text-sm text-ink-secondary">
              {selected?.label || 'Select a log'}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Icon name="filter" size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  className="input max-w-[12rem] py-1.5 pl-8 text-[13px]"
                  placeholder="filter…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
              <button
                className={live ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
                onClick={() => setLive((v) => !v)}
                disabled={!selected}
              >
                <span className={live ? 'dot-pulse' : 'dot'} /> Live
              </button>
              <button className="btn-secondary btn-sm" onClick={download} disabled={!selected}>
                <Icon name="download" size={13} /> Download
              </button>
            </div>
          </div>

          <div className="log-pane">
            <div className="log-head">
              <span className={`flex items-center gap-2 font-medium ${live ? 'text-mint-300' : 'text-ink-dim'}`}>
                <span className={live ? 'dot-pulse' : 'dot'} />
                {live ? 'streaming' : 'snapshot'}
              </span>
              <span className="font-mono text-ink-faint">{filtered.length} lines</span>
            </div>
            <pre ref={boxRef} className="log-body" style={{ height: '65vh' }}>
              {selected
                ? filtered.join('\n') || <span className="text-ink-faint">(empty)</span>
                : <span className="text-ink-faint">Pick a log source from the left.</span>}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
