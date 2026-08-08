import { useCallback, useEffect, useState } from 'react'
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import api, { errorMessage } from '../api/client'
import Icon from '../components/Icon'
import LiveLog from '../components/LiveLog'
import PageHeader from '../components/PageHeader'

const MAX_POINTS = 30

// Mint stays the lead; aqua and violet only differentiate the second and third
// series, never compete with it.
const METRICS = [
  { key: 'cpu', label: 'CPU', icon: 'cpu', color: '#3FE39B' },
  { key: 'ram', label: 'RAM', icon: 'chip', color: '#22E5CE' },
  { key: 'disk', label: 'Disk', icon: 'disk', color: '#A78BFA' },
]

/** Server tools: live CPU/RAM/disk graphs, supervisor + system processes, apt. */
export default function Server() {
  const [history, setHistory] = useState([]) // [{t, cpu, ram, disk}]
  const [processes, setProcesses] = useState({ supervisor: [], system: [] })
  const [aptQuery, setAptQuery] = useState('')
  const [aptResults, setAptResults] = useState([])
  const [aptWsPath, setAptWsPath] = useState(null)

  const loadStats = useCallback(() => {
    api.get('/server/stats').then((res) => {
      const s = res.data
      setHistory((prev) => [
        ...prev.slice(-(MAX_POINTS - 1)),
        {
          t: new Date().toLocaleTimeString(),
          cpu: s.cpu_percent,
          ram: s.memory.percent,
          disk: s.disk.percent,
        },
      ])
    }).catch(() => {})
  }, [])

  const loadProcesses = useCallback(() => {
    api.get('/server/processes').then((res) => setProcesses(res.data)).catch(() => {})
  }, [])

  useEffect(() => {
    loadStats()
    loadProcesses()
    const a = setInterval(loadStats, 3000)
    const b = setInterval(loadProcesses, 8000)
    return () => { clearInterval(a); clearInterval(b) }
  }, [loadStats, loadProcesses])

  async function supervisorAction(name, action) {
    try {
      await api.post(`/server/supervisor/${name}/${action}`)
      loadProcesses()
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  async function searchApt() {
    try {
      const res = await api.get('/server/apt/search', { params: { q: aptQuery } })
      setAptResults(res.data)
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  function aptAction(action, pkg) {
    // Reconnect each time so re-running streams fresh
    setAptWsPath(null)
    const qs = pkg ? `?package=${encodeURIComponent(pkg)}` : ''
    setTimeout(() => setAptWsPath(`/ws/apt/${action}${qs}`), 0)
  }

  const latest = history[history.length - 1]

  return (
    <div>
      <PageHeader
        title="Server Tools"
        crumbs={[{ label: 'ServerHub', to: '/dashboard' }, { label: 'Server' }]}
        lead="Live resource graphs, supervisor programs and the APT package manager."
      />

      {/* Live graphs */}
      <div className="grid gap-4 lg:grid-cols-3">
        {METRICS.map((m) => (
          <div key={m.key} className="card card-hover">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[10px] font-semibold uppercase
                               tracking-[0.1em] text-ink-dim">
                <Icon name={m.icon} size={14} style={{ color: m.color }} />
                {m.label}
              </span>
              <span className="text-xl font-semibold tracking-tight text-ink-primary">
                {latest ? `${latest[m.key]}%` : '…'}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={history} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={m.key} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={m.color} stopOpacity={0.42} />
                    <stop offset="95%" stopColor={m.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis domain={[0, 100]} hide />
                <Tooltip
                  cursor={{ stroke: '#17333D' }}
                  contentStyle={{
                    background: '#0D1D25',
                    border: '1px solid rgba(23,51,61,0.8)',
                    borderRadius: 12,
                    fontSize: 12,
                    boxShadow: '0 8px 24px -12px rgba(0,0,0,0.7)',
                  }}
                  labelStyle={{ color: '#7B989F' }}
                  itemStyle={{ color: '#E7F5F1' }}
                />
                <Area type="monotone" dataKey={m.key} stroke={m.color} strokeWidth={2}
                  fill={`url(#${m.key})`} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {/* Supervisor processes */}
      <div className="card mt-6">
        <h3 className="sec-title mb-4">Supervisor Programs</h3>
        <div className="table-panel">
          <table className="tbl">
            <thead>
              <tr><th>Program</th><th>State</th><th>Detail</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody>
              {processes.supervisor.map((p) => (
                <tr key={p.name}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className={`icon-tile ${p.state === 'RUNNING' ? 'tile-mint' : ''}`}>
                        <Icon name="activity" size={16} />
                      </span>
                      <span className="truncate font-mono text-[13px] text-ink-primary">{p.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${p.state === 'RUNNING' ? 'badge-mint' : 'badge-neutral'}`}>
                      <span className={p.state === 'RUNNING' ? 'dot-pulse' : 'dot'} />
                      {p.state}
                    </span>
                  </td>
                  <td className="text-xs text-ink-faint">{p.detail}</td>
                  <td className="col-actions">
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => supervisorAction(p.name, 'start')} className="btn-icon" title="Start">
                        <Icon name="play" size={14} />
                      </button>
                      <button onClick={() => supervisorAction(p.name, 'stop')} className="btn-icon" title="Stop">
                        <Icon name="stop" size={14} />
                      </button>
                      <button onClick={() => supervisorAction(p.name, 'restart')} className="btn-icon" title="Restart">
                        <Icon name="refresh" size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {processes.supervisor.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-ink-faint">No supervisor programs</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* APT package manager */}
      <div className="card mt-6">
        <h3 className="sec-title mb-4">APT Package Manager</h3>
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative max-w-xs flex-1">
            <Icon name="search" size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              className="input pl-9"
              placeholder="search packages…"
              value={aptQuery}
              onChange={(e) => setAptQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchApt()}
            />
          </div>
          <button className="btn-secondary" onClick={searchApt}>
            <Icon name="search" size={14} /> Search
          </button>
          <button className="btn-secondary" onClick={() => aptAction('update')}>apt update</button>
          <button className="btn-secondary" onClick={() => aptAction('upgrade')}>apt upgrade</button>
        </div>

        {aptResults.length > 0 && (
          <ul className="mb-4 max-h-52 divide-y divide-panel-border/40 overflow-y-auto rounded-card
                         border border-panel-border/70">
            {aptResults.map((pkg) => (
              <li key={pkg.name} className="flex items-center gap-3 px-4 py-2 text-sm transition-colors
                                            hover:bg-mint-400/[0.04]">
                <span className="shrink-0 font-mono text-[13px] text-ink-primary">{pkg.name}</span>
                <span className="truncate text-xs text-ink-faint">{pkg.description}</span>
                <div className="ml-auto flex shrink-0 items-center gap-1">
                  <button onClick={() => aptAction('install', pkg.name)} className="btn-icon" title="Install">
                    <Icon name="download" size={15} />
                  </button>
                  <button onClick={() => aptAction('remove', pkg.name)} className="btn-icon-danger" title="Remove">
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <LiveLog path={aptWsPath} />
      </div>
    </div>
  )
}
