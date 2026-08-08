import { useEffect, useState } from 'react'
import api, { errorMessage } from '../../api/client'
import Icon from '../../components/Icon'
import LiveLog from '../../components/LiveLog'
import StatusBadge from '../../components/StatusBadge'

/** Streamlit dashboard control: start/stop/restart, status, live logs. */
export default function DashboardTab({ project, onChanged }) {
  const [status, setStatus] = useState(project.dashboard_status)
  const [raw, setRaw] = useState('')
  const [busy, setBusy] = useState(false)
  const [logStream, setLogStream] = useState(null) // 'out' | 'err' | null
  const [domain, setDomain] = useState(project.domain || '')
  const [domainMsg, setDomainMsg] = useState('')
  const [venv, setVenv] = useState(project.venv_status || 'MISSING')

  async function refreshStatus() {
    try {
      const res = await api.get(`/projects/${project.id}/dashboard/status`)
      setStatus(res.data.status)
      setRaw(res.data.raw)
    } catch (err) {
      setRaw(errorMessage(err))
    }
  }

  async function refreshVenv() {
    try {
      const res = await api.get(`/projects/${project.id}`)
      setVenv(res.data.venv_status)
      return res.data.venv_status
    } catch { /* ignore */ }
  }

  async function buildVenv() {
    try {
      const res = await api.post(`/projects/${project.id}/build-venv`)
      setVenv('BUILDING')
      alert(res.data.detail)
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  useEffect(() => {
    refreshStatus()
    refreshVenv()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id])

  // While the env is building, poll until it's ready.
  useEffect(() => {
    if (venv !== 'BUILDING') return
    const t = setInterval(async () => {
      if ((await refreshVenv()) === 'READY') clearInterval(t)
    }, 4000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venv])

  async function action(name) {
    setBusy(true)
    try {
      await api.post(`/projects/${project.id}/dashboard/${name}`)
      await refreshStatus()
      onChanged?.()
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function toggleLog(stream) {
    setLogStream((prev) => (prev === stream ? null : stream))
  }

  async function assignDomain() {
    setDomainMsg('')
    try {
      const res = await api.post(`/projects/${project.id}/assign-domain`, { domain })
      setDomainMsg(res.data.detail)
      onChanged?.()
    } catch (err) {
      setDomainMsg(errorMessage(err))
    }
  }

  async function requestSsl() {
    setDomainMsg('')
    try {
      const res = await api.post(`/projects/${project.id}/ssl`)
      setDomainMsg(res.data.detail)
    } catch (err) {
      setDomainMsg(errorMessage(err))
    }
  }

  const liveUrl = project.domain
    ? `http://${project.domain}`
    : `http://${window.location.hostname}:${project.dashboard_port}`

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="sec-title">Streamlit Dashboard</h3>
          <StatusBadge status={status} />
          <span className="badge badge-neutral font-mono">port {project.dashboard_port}</span>
          <a href={liveUrl} target="_blank" rel="noreferrer"
             className="link ml-auto inline-flex items-center gap-1 text-sm">
            Open live URL <Icon name="external-link" size={12} />
          </a>
        </div>

        {/* Dashboard Python environment status */}
        {venv === 'BUILDING' && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/[0.08]
                          px-3.5 py-3 text-sm text-amber-200">
            <Icon name="clock" size={15} className="mt-0.5" />
            <span>
              Preparing the dashboard's Python environment (installing streamlit + packages)… you can start it
              once this finishes. Progress is in{' '}
              <span className="font-mono">logs/venv-setup.log</span>.
            </span>
          </div>
        )}
        {venv === 'MISSING' && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-red-500/40
                          bg-red-500/[0.08] px-3.5 py-3 text-sm text-red-200">
            <Icon name="alert" size={15} />
            <span>The dashboard environment isn't built yet, so Start would fail.</span>
            <button className="btn-secondary btn-sm ml-auto" onClick={buildVenv}>
              <Icon name="wrench" size={13} /> Build environment
            </button>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button className="btn-primary btn-sm" disabled={busy || venv !== 'READY'}
            title={venv !== 'READY' ? 'Dashboard environment is not ready yet' : ''}
            onClick={() => action('start')}>
            <Icon name="play" size={13} /> Start
          </button>
          <button className="btn-secondary btn-sm" disabled={busy} onClick={() => action('stop')}>
            <Icon name="stop" size={13} /> Stop
          </button>
          <button className="btn-secondary btn-sm" disabled={busy || venv !== 'READY'}
            onClick={() => action('restart')}>
            <Icon name="refresh" size={13} /> Restart
          </button>
          <button className="btn-secondary btn-sm" onClick={refreshStatus}>
            <Icon name="activity" size={13} /> Refresh status
          </button>
        </div>

        {raw && <p className="mt-4 break-all font-mono text-xs text-ink-faint">{raw}</p>}

        <p className="hint mt-4">
          The dashboard runs <span className="font-mono text-ink-secondary">dashboard/app.py</span> under
          Supervisor (auto-restart on crash). Upload your Streamlit files on the Files tab.
        </p>
      </div>

      {/* Domain / SSL */}
      <div className="card">
        <h3 className="sec-title mb-4">Domain &amp; SSL</h3>
        <div className="flex flex-wrap items-center gap-2">
          <input className="input max-w-xs" placeholder="dashboard.example.com" value={domain}
            onChange={(e) => setDomain(e.target.value)} />
          <button className="btn-primary" onClick={assignDomain} disabled={!domain}>Assign domain</button>
          <button className="btn-secondary" onClick={requestSsl} disabled={!project.domain}>
            <Icon name="lock" size={14} /> Request SSL
          </button>
        </div>
        <p className="hint mt-3">
          Writes an nginx proxy block to the dashboard's port and reloads nginx. SSL runs certbot
          (DNS must already point at this server).
        </p>
        {domainMsg && (
          <p className="mt-3 flex items-start gap-2 break-words text-sm text-ink-body">
            <Icon name="info" size={14} className="mt-0.5 text-mint-400" />
            {domainMsg}
          </p>
        )}
      </div>

      {/* Live process logs */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="sec-title">Process Logs</h3>
          <div className="ml-auto flex gap-2">
            <button
              className={logStream === 'out' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
              onClick={() => toggleLog('out')}
            >
              {logStream === 'out' && <span className="dot-pulse" />} stdout
            </button>
            <button
              className={logStream === 'err' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
              onClick={() => toggleLog('err')}
            >
              {logStream === 'err' && <span className="dot-pulse" />} stderr
            </button>
          </div>
        </div>
        <LiveLog
          path={logStream ? `/ws/logs/supervisor/${project.name}?stream=${logStream}` : null}
        />
        {!logStream && <p className="hint mt-3">Pick a stream to tail it live.</p>}
      </div>
    </div>
  )
}
