import { useCallback, useEffect, useRef, useState } from 'react'
import api, { errorMessage } from '../api/client'
import Backups from '../components/Backups'
import Icon from '../components/Icon'
import LiveLog from '../components/LiveLog'
import PageHeader from '../components/PageHeader'
import Users from '../components/Users'
import { useAuth } from '../context/AuthContext'

/** Settings: change password, panel key/value settings, DB backup, self-update. */
export default function Settings() {
  const { isAdmin } = useAuth()
  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState('')
  const [settings, setSettings] = useState({ panel_port: '', panel_subdomain: '' })
  const [setMsg, setSetMsg] = useState('')

  // Self-update
  const [upd, setUpd] = useState(null)        // /settings/update/info payload
  const [updLoading, setUpdLoading] = useState(false)
  const [updPath, setUpdPath] = useState(null) // WS path while updating
  const [restarting, setRestarting] = useState(false)
  const sawDown = useRef(false)

  useEffect(() => {
    api.get('/settings').then((res) => {
      setSettings((prev) => ({ ...prev, ...res.data }))
    }).catch(() => {})
  }, [])

  const checkUpdate = useCallback(() => {
    setUpdLoading(true)
    api.get('/settings/update/info')
      .then((res) => setUpd(res.data))
      .catch((err) => setUpd({ message: errorMessage(err), error: true }))
      .finally(() => setUpdLoading(false))
  }, [])

  useEffect(() => { checkUpdate() }, [checkUpdate])

  function startUpdate() {
    if (!window.confirm(
      'Update the panel now? It will pull the latest code, rebuild, and ' +
      'restart the panel. The page will reload when it is back.')) return
    setUpdPath(null)
    setTimeout(() => setUpdPath('/ws/settings/update'), 0)
  }

  // When the update WS closes, the panel is (probably) restarting — poll
  // /api/health and reload once it has gone down and come back up.
  function onUpdateClosed() {
    setRestarting(true)
    sawDown.current = false
    const t = setInterval(async () => {
      try {
        await api.get('/health', { timeout: 4000 })
        if (sawDown.current) { clearInterval(t); window.location.reload() }
      } catch {
        sawDown.current = true   // panel went down → restart in progress
      }
    }, 3000)
    // Give up after 3 min and just reload
    setTimeout(() => { clearInterval(t); window.location.reload() }, 180000)
  }

  async function changePassword(e) {
    e.preventDefault()
    setPwMsg('')
    if (pw.new_password !== pw.confirm) {
      setPwMsg('New passwords do not match')
      return
    }
    try {
      await api.post('/auth/change-password', {
        current_password: pw.current_password,
        new_password: pw.new_password,
      })
      setPwMsg('Password changed ✓')
      setPw({ current_password: '', new_password: '', confirm: '' })
    } catch (err) {
      setPwMsg(errorMessage(err))
    }
  }

  async function saveSettings(e) {
    e.preventDefault()
    setSetMsg('')
    try {
      await api.put('/settings', { values: settings })
      setSetMsg('Saved ✓')
    } catch (err) {
      setSetMsg(errorMessage(err))
    }
  }

  const pwOk = pwMsg.includes('✓')
  const settingsOk = setMsg.includes('✓')

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Settings"
        crumbs={[{ label: 'ServerHub', to: '/dashboard' }, { label: 'Settings' }]}
        lead="Panel users, credentials, configuration, backups and updates."
      />

      <div className="space-y-6">
        {/* User management (admins only) */}
        {isAdmin && <Users />}

        {/* Change password */}
        <form onSubmit={changePassword} className="card space-y-4">
          <h3 className="sec-title">Change Admin Password</h3>
          {pwMsg && (
            <p className={`flex items-center gap-1.5 text-sm ${pwOk ? 'text-mint-300' : 'text-red-400'}`}>
              <Icon name={pwOk ? 'check' : 'alert'} size={14} />
              {pwMsg.replace(' ✓', '')}
            </p>
          )}
          <div>
            <label className="label">Current password</label>
            <input className="input" type="password" value={pw.current_password}
              onChange={(e) => setPw({ ...pw, current_password: e.target.value })} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">New password</label>
              <input className="input" type="password" placeholder="min 8 characters" value={pw.new_password}
                onChange={(e) => setPw({ ...pw, new_password: e.target.value })} required />
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input className="input" type="password" value={pw.confirm}
                onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required />
            </div>
          </div>
          <button className="btn-primary" type="submit">
            <Icon name="lock" size={14} /> Change password
          </button>
        </form>

        {/* Panel settings */}
        <form onSubmit={saveSettings} className="card space-y-4">
          <h3 className="sec-title">Panel Configuration</h3>
          {setMsg && (
            <p className={`flex items-center gap-1.5 text-sm ${settingsOk ? 'text-mint-300' : 'text-red-400'}`}>
              <Icon name={settingsOk ? 'check' : 'alert'} size={14} />
              {setMsg.replace(' ✓', '')}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Panel port (informational)</label>
              <input className="input font-mono" value={settings.panel_port}
                onChange={(e) => setSettings({ ...settings, panel_port: e.target.value })} placeholder="8765" />
            </div>
            <div>
              <label className="label">Panel subdomain</label>
              <input className="input font-mono" value={settings.panel_subdomain}
                onChange={(e) => setSettings({ ...settings, panel_subdomain: e.target.value })}
                placeholder="panel.yourdomain.com" />
            </div>
          </div>
          <p className="hint">
            Changing the actual listen port requires updating the supervisor + nginx
            config on the server and restarting the panel.
          </p>
          <button className="btn-primary" type="submit">Save</button>
        </form>

        {/* Backup & Restore */}
        <Backups />

        {/* System cleanup: CPU / RAM / Disk cards (admins only) */}
        {isAdmin && <SystemCleanup />}

        {/* Updates */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="sec-title">Updates</h3>
            <button className="btn-ghost btn-sm" onClick={checkUpdate} disabled={updLoading || !!updPath}>
              <Icon name="refresh" size={13} />
              {updLoading ? 'Checking…' : 'Check again'}
            </button>
          </div>

          {upd && (
            <p className={`text-sm ${
              upd.error ? 'text-red-400'
              : upd.behind > 0 ? 'text-amber-300'
              : upd.behind === 0 ? 'text-mint-300' : 'text-ink-muted'}`}>
              {upd.message}
            </p>
          )}
          {upd?.current && (
            <p className="text-xs text-ink-faint">
              Current: <code className="font-mono text-ink-muted">{upd.current}</code>
            </p>
          )}
          {upd?.src && (
            <p className="text-xs text-ink-faint">
              Source: <code className="font-mono text-ink-muted">{upd.src}</code>
            </p>
          )}

          {restarting ? (
            <p className="flex items-start gap-2 text-sm text-aqua">
              <Icon name="refresh" size={14} className="mt-0.5" />
              Panel is restarting to finish the update… this page will reload
              automatically when it's back.
            </p>
          ) : (
            <button className="btn-primary"
              onClick={startUpdate}
              disabled={!!updPath || (upd && upd.ready === false)}>
              <Icon name="upload" size={14} />
              {updPath ? 'Updating…' : 'Update now'}
            </button>
          )}

          {upd && upd.ready === false && (
            <p className="hint">
              No source checkout found on the server. The update button redeploys
              from a git clone / uploaded bundle — set <code className="font-mono text-ink-muted">UPDATE_SRC</code> in{' '}
              <code className="font-mono text-ink-muted">backend/.env</code> (default{' '}
              <code className="font-mono text-ink-muted">/opt/serverhub-src</code>),
              then re-run <code className="font-mono text-ink-muted">sudo bash deploy/update.sh</code> once.
            </p>
          )}

          {updPath && <LiveLog path={updPath} onClose={onUpdateClosed} />}
        </div>
      </div>
    </div>
  )
}

const DEFAULT_CLEAN = ['tmp', 'apt', 'journal', 'logs', 'pip']

function fmtSize(bytes) {
  if (bytes === null || bytes === undefined) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let v = bytes
  let i = -1
  do { v /= 1024; i += 1 } while (v >= 1024 && i < units.length - 1)
  return `${v.toFixed(1)} ${units[i]}`
}

function StatBar({ label, percent, detail, color }) {
  return (
    <div className="min-w-[10rem] flex-1">
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="text-ink-muted">{label}</span>
        <span className="font-mono text-ink-secondary">{detail}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-panel-raised">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(percent || 0, 100)}%` }} />
      </div>
    </div>
  )
}

/** Compact process table used by the CPU and RAM cards. */
function ProcessTable({ rows, valueHeader, value }) {
  if (!rows?.length) return null
  return (
    <div className="table-panel">
      <table className="tbl text-xs">
        <thead>
          <tr>
            <th>Process</th>
            <th>User</th>
            <th>PID</th>
            <th className="text-right">{valueHeader}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.pid}>
              <td className="max-w-[12rem] truncate text-ink-secondary">{p.name}</td>
              <td className="text-ink-faint">{p.user}</td>
              <td className="font-mono text-ink-faint">{p.pid}</td>
              <td className="text-right font-mono text-ink-body">{value(p)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * System Cleanup: three cards — CPU (what's using it), RAM (top processes +
 * flush caches) and Disk (where the space went + cleanup tasks).
 */
function SystemCleanup() {
  const [info, setInfo] = useState(null)      // /settings/cleanup/preview payload
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(new Set(DEFAULT_CLEAN))
  const [wsPath, setWsPath] = useState(null)  // LiveLog path while cleaning
  const [runningKind, setRunningKind] = useState(null)  // 'ram' | 'disk' | null

  const refresh = useCallback(() => {
    setLoading(true)
    api.get('/settings/cleanup/preview')
      .then((res) => setInfo(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  function toggle(key) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function start(kind, tasks) {
    if (tasks.length === 0) return
    if (tasks.includes('trash') && !window.confirm(
      'Also empty the recycle bin? Deleted files in it can no longer be restored.')) {
      return
    }
    setRunningKind(kind)
    setWsPath(null)
    setTimeout(() => setWsPath(`/ws/settings/cleanup?tasks=${tasks.join(',')}`), 0)
  }

  function onCleanupClosed() {
    setRunningKind(null)
    setWsPath(null)
    refresh()   // show the freed space/RAM in the stats
  }

  const cpu = info?.cpu
  const mem = info?.memory
  const disk = info?.disk
  const ramTask = (info?.tasks || []).find((t) => t.key === 'ram')
  const diskTasks = (info?.tasks || []).filter((t) => t.key !== 'ram')
  const helperMissing = info && info.ready === false

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h3 className="sec-title">System Cleanup</h3>
        <button className="btn-ghost btn-sm" onClick={refresh} disabled={loading}>
          <Icon name="refresh" size={13} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {helperMissing && (
        <p className="flex items-start gap-1.5 text-xs text-amber-300">
          <Icon name="alert" size={13} className="mt-0.5" />
          <span>
            The cleanup helper isn't installed on this server yet — run{' '}
            <code className="font-mono text-ink-secondary">sudo bash deploy/update.sh</code> once,
            then the RAM/Disk cleanup buttons will work.
          </span>
        </p>
      )}

      {/* ─── CPU ─── */}
      <div className="card space-y-4">
        <h3 className="sec-title">CPU</h3>
        {cpu && (
          <>
            <StatBar label={`CPU (${cpu.cores} core${cpu.cores > 1 ? 's' : ''})`}
              percent={cpu.percent} detail={`${cpu.percent}%`} color="bg-mint" />
            {cpu.load_avg && (
              <p className="hint">
                Load average (1 / 5 / 15 min):{' '}
                <span className="font-mono text-ink-secondary">{cpu.load_avg.join(' / ')}</span>
                {' '}— above {cpu.cores}.0 means the CPU is saturated.
              </p>
            )}
            <p className="label !mb-2">Top processes by CPU right now</p>
            <ProcessTable rows={cpu.top} valueHeader="CPU %" value={(p) => `${p.cpu}%`} />
            <p className="hint">
              CPU load isn't "cleanable" — it's whatever is running. If something
              here shouldn't be running, stop it from the <b className="text-ink-secondary">Server</b> tab's
              process list (or stop that script/dashboard/app).
            </p>
          </>
        )}
      </div>

      {/* ─── RAM ─── */}
      <div className="card space-y-4">
        <h3 className="sec-title">RAM</h3>
        {mem && (
          <>
            <StatBar label="RAM" percent={mem.percent}
              detail={`${mem.used_gb} / ${mem.total_gb} GB`} color="bg-aqua" />
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-muted">
              <span>Available: <b className="text-ink-secondary">{mem.available_gb} GB</b></span>
              <span>Disk cache: <b className="text-ink-secondary">{mem.cached_gb} GB</b></span>
            </div>
            <p className="label !mb-2">Top processes by memory</p>
            <ProcessTable rows={mem.top} valueHeader="Memory"
              value={(p) => `${p.memory_mb} MB (${p.memory_percent}%)`} />
            <p className="hint">
              Linux keeps free RAM filled with disk cache on purpose — that part
              is released automatically when programs need it. Flushing it is
              safe but usually only worth it before starting something heavy.
            </p>
            <button className="btn-primary"
              onClick={() => start('ram', ['ram'])}
              disabled={!!runningKind || helperMissing}>
              <Icon name="clean" size={14} />
              {runningKind === 'ram' ? 'Flushing…' : 'Flush RAM caches'}
              {ramTask?.size ? ` (~${fmtSize(ramTask.size)})` : ''}
            </button>
            {runningKind === 'ram' && wsPath && (
              <LiveLog path={wsPath} onClose={onCleanupClosed} />
            )}
          </>
        )}
      </div>

      {/* ─── Disk ─── */}
      <div className="card space-y-4">
        <h3 className="sec-title">Disk</h3>
        {disk && (
          <>
            <StatBar label="Disk (/)" percent={disk.percent}
              detail={`${disk.used_gb} / ${disk.total_gb} GB · ${disk.free_gb} GB free`}
              color="bg-violet-400" />

            {disk.breakdown?.length > 0 && (
              <>
                <p className="label !mb-2">Where the space is going</p>
                <div className="space-y-1.5">
                  {disk.breakdown.map((d) => (
                    <div key={d.path} className="flex items-center justify-between gap-3 text-xs">
                      <span className="min-w-0 truncate text-ink-body">
                        {d.label}
                        <span className="ml-2 font-mono text-ink-faint">{d.path}</span>
                      </span>
                      <span className="shrink-0 font-mono text-ink-secondary">{fmtSize(d.size)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {disk.docker?.length > 0 && (
              <>
                <p className="label !mb-2">Docker disk usage</p>
                <div className="space-y-1.5">
                  {disk.docker.map((d) => (
                    <div key={d.type} className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-ink-body">
                        {d.type}<span className="ml-1.5 text-ink-faint">({d.count})</span>
                      </span>
                      <span className="shrink-0 font-mono text-ink-secondary">
                        {d.size} <span className="text-ink-faint">· reclaimable {d.reclaimable}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <p className="hint border-t border-panel-border/50 pt-3">
              Safe to clean (nothing here touches your projects, websites, apps
              or databases):
            </p>
            <div className="space-y-1">
              {diskTasks.map((t) => (
                <label key={t.key}
                  className="flex cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2 transition-colors
                             hover:bg-panel-raised/60">
                  <input type="checkbox" className="mt-0.5"
                    checked={selected.has(t.key)} onChange={() => toggle(t.key)} />
                  <span className="min-w-0 flex-1">
                    <span className="text-sm text-ink-secondary">{t.label}</span>
                    <span className="block text-xs text-ink-faint">{t.description}</span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-ink-muted">
                    {t.key === 'trash' && t.count ? `${t.count} item(s) · ` : ''}{fmtSize(t.size)}
                  </span>
                </label>
              ))}
            </div>

            <button className="btn-primary"
              onClick={() => start('disk', diskTasks.map((t) => t.key).filter((k) => selected.has(k)))}
              disabled={!!runningKind || helperMissing
                || diskTasks.every((t) => !selected.has(t.key))}>
              <Icon name="clean" size={14} />
              {runningKind === 'disk' ? 'Cleaning…' : 'Clean disk now'}
            </button>
            {runningKind === 'disk' && wsPath && (
              <LiveLog path={wsPath} onClose={onCleanupClosed} />
            )}
          </>
        )}
      </div>
    </>
  )
}
