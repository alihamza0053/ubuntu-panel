import { useCallback, useEffect, useMemo, useState } from 'react'
import api, { errorMessage } from '../api/client'
import Icon from '../components/Icon'
import LiveLog from '../components/LiveLog'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'

const CATEGORY_ORDER = [
  'Infrastructure', 'Database UIs', 'Developer', 'CMS & CRM', 'Files & Sync',
  'Media & Library', 'Productivity', 'Utilities', 'Monitoring', 'Notifications',
  'Browsers & Misc', 'Other',
]

/**
 * Catalog glyph. The backend ships a per-app character as content; it sits in a
 * neutral tile so it reads as an app logo rather than UI chrome.
 */
function AppGlyph({ glyph, size = 'md' }) {
  return (
    <span className={`icon-tile ${size === 'sm' ? 'h-8 w-8 text-sm' : 'text-base'} text-ink-secondary`}>
      {glyph || <Icon name="grid" size={16} />}
    </span>
  )
}

/**
 * Apps section: one-click install of self-hosted apps (VS Code/code-server,
 * File Browser, …), run them on a port, assign a domain, and manage them.
 */
export default function Apps() {
  const [catalog, setCatalog] = useState([])
  const [ready, setReady] = useState(true)
  const [dockerReady, setDockerReady] = useState(true)
  const [installed, setInstalled] = useState([])
  const [installWs, setInstallWs] = useState(null) // WS path during an install
  const [query, setQuery] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [custom, setCustom] = useState({ name: '', image: '', container_port: '', env: '' })

  const refresh = useCallback(() => {
    api.get('/apps/catalog').then((res) => {
      setCatalog(res.data.apps || [])
      setReady(res.data.installer_ready !== false)
      setDockerReady(res.data.docker_ready !== false)
    }).catch(() => {})
    api.get('/apps').then((res) => setInstalled(res.data)).catch(() => {})
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Poll while installing so the new app appears when done
  useEffect(() => {
    if (!installWs) return
    const t = setInterval(refresh, 3000)
    return () => clearInterval(t)
  }, [installWs, refresh])

  function install(app) {
    let path = `/ws/apps/${app.slug}/install`
    if (app.multi) {
      const name = window.prompt(
        `Name this ${app.name} instance (e.g. a site/client name):`, '')
      if (name === null) return            // cancelled
      if (name.trim()) path += `?name=${encodeURIComponent(name.trim())}`
    }
    setInstallWs(null)
    setTimeout(() => setInstallWs(path), 0)
  }

  function runCustom(e) {
    e.preventDefault()
    if (!custom.image.trim() || !custom.container_port) {
      alert('Image and container port are required')
      return
    }
    const qs = new URLSearchParams({
      name: custom.name.trim(),
      image: custom.image.trim(),
      container_port: String(custom.container_port),
      env: custom.env,
    })
    setInstallWs(null)
    setTimeout(() => setInstallWs(`/ws/apps/custom/install?${qs.toString()}`), 0)
  }

  // Group catalog by category (filtered by the search query) in defined order
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase()
    const match = (c) => !q || `${c.name} ${c.description} ${c.slug} ${c.category}`.toLowerCase().includes(q)
    const byCat = {}
    for (const c of catalog) if (match(c)) (byCat[c.category || 'Other'] ||= []).push(c)
    return CATEGORY_ORDER
      .filter((cat) => byCat[cat]?.length)
      .map((cat) => [cat, byCat[cat]])
  }, [catalog, query])

  return (
    <div>
      <PageHeader
        title="Apps"
        crumbs={[{ label: 'ServerHub', to: '/dashboard' }, { label: 'Apps' }]}
        lead="One-click installs for self-hosted apps, plus any Docker Hub image you want to run."
      />

      {/* Installer not deployed warning */}
      {!ready && (
        <div className="card mb-6 border-amber-500/40 bg-amber-500/[0.06]">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-300">
            <Icon name="alert" size={15} /> App installer not enabled on this server yet
          </p>
          <p className="hint mt-2">
            Installs run through one whitelisted root script (the panel can't run arbitrary
            commands as root). Deploy it once, then installs will work:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-panel-border/70 bg-panel-ink p-3
                          font-mono text-xs text-mint-300">cd /opt/serverhub-src &amp;&amp; sudo bash deploy/update.sh</pre>
        </div>
      )}

      {/* Run any Docker Hub image */}
      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="sec-title">Run any Docker image</h3>
            <p className="hint mt-1.5">
              Pull any Docker Hub image and run it on a port (you can run several).
              Needs the Docker Engine app.
            </p>
          </div>
          <button className="btn-secondary shrink-0" onClick={() => setShowCustom((v) => !v)}>
            <Icon name={showCustom ? 'x' : 'plus'} size={14} />
            {showCustom ? 'Close' : 'New container'}
          </button>
        </div>

        {showCustom && (
          <form onSubmit={runCustom} className="mt-5 grid animate-fade-up gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Image *</label>
              <input className="input font-mono" placeholder="e.g. nginx:latest or user/app:tag"
                value={custom.image} onChange={(e) => setCustom({ ...custom, image: e.target.value })} required />
            </div>
            <div>
              <label className="label">Container port *</label>
              <input className="input font-mono" type="number" placeholder="e.g. 80"
                value={custom.container_port} onChange={(e) => setCustom({ ...custom, container_port: e.target.value })} required />
            </div>
            <div>
              <label className="label">Name (optional)</label>
              <input className="input font-mono" placeholder="my-app"
                value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Environment variables (one KEY=value per line)</label>
              <textarea className="input h-20 font-mono text-[13px]" placeholder={'TZ=UTC\nFOO=bar'}
                value={custom.env} onChange={(e) => setCustom({ ...custom, env: e.target.value })} />
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <button type="submit" className="btn-primary" disabled={!dockerReady}>
                <Icon name="download" size={14} /> Pull &amp; run
              </button>
              {!dockerReady && (
                <span className="badge badge-amber">
                  <Icon name="alert" size={12} /> Install the Docker Engine app first
                </span>
              )}
              <span className="hint">
                The container’s port is proxied to localhost; assign a domain after it’s running.
              </span>
            </div>
          </form>
        )}
      </div>

      {/* Live install output */}
      {installWs && (
        <div className="card mt-4">
          <h3 className="sec-title mb-2">Installing…</h3>
          <LiveLog path={installWs} onClose={refresh} />
        </div>
      )}

      {/* Installed apps */}
      <section className="mt-8">
        <h3 className="sec-title mb-4">Installed</h3>
        {installed.length === 0 ? (
          <div className="empty">
            <Icon name="package" size={26} />
            <p>No apps installed yet — install one from the catalog below.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {installed.map((app) => (
              <InstalledApp key={app.id} app={app} onChanged={refresh} />
            ))}
          </div>
        )}
      </section>

      {/* Catalog grouped by category */}
      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h3 className="sec-title">Catalog</h3>
          <div className="ml-auto relative max-w-xs flex-1">
            <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              className="input pl-9"
              placeholder="Search apps…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {grouped.length === 0 && (
          <div className="empty">
            <Icon name="search" size={26} />
            <p>No apps match “{query}”.</p>
          </div>
        )}

        {grouped.map(([category, apps]) => (
          <div key={category} className="mb-8">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-dim">{category}</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {apps.map((c) => (
                <div key={c.slug} className="card card-hover flex flex-col">
                  <div className="flex items-start gap-3">
                    <AppGlyph glyph={c.icon} />
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-primary">{c.name}</p>
                      <p className="hint mt-0.5">{c.description}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-ink-faint">
                      {c.kind === 'tool' ? 'tool / dependency'
                        : c.kind === 'docker' ? (c.web_ui === false ? 'docker backend' : 'docker')
                        : c.kind === 'compose' ? 'compose stack'
                        : 'runs on a port'}
                    </span>
                    {c.installed ? (
                      <span className="badge badge-mint ml-auto"><span className="dot" /> installed</span>
                    ) : (c.kind === 'docker' || c.kind === 'compose') && !dockerReady ? (
                      <span className="badge badge-amber ml-auto" title="Install the Docker Engine app first">
                        needs Docker
                      </span>
                    ) : (
                      <button className="btn-primary btn-sm ml-auto" onClick={() => install(c)}>
                        <Icon name="download" size={13} />
                        {c.multi ? 'Install instance' : 'Install'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

/** One installed app: status, controls, domain/SSL, password, logs, uninstall. */
function InstalledApp({ app, onChanged }) {
  const { isAdmin } = useAuth()
  const [domain, setDomain] = useState(app.domain || '')
  const [showLog, setShowLog] = useState(false)
  const [msg, setMsg] = useState('')
  const [reveal, setReveal] = useState(false)
  const [newPw, setNewPw] = useState('')
  const [showPwForm, setShowPwForm] = useState(false)
  const [creds, setCreds] = useState(null) // full credential list when opened

  async function toggleCreds() {
    if (creds) { setCreds(null); return }
    try {
      const res = await api.get(`/apps/${app.id}/credentials`)
      setCreds(res.data.items)
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  async function setPassword() {
    setMsg('')
    try {
      const res = await api.post(`/apps/${app.id}/set-password`, { password: newPw })
      setMsg(res.data.detail)
      setNewPw('')
      setShowPwForm(false)
      onChanged()
    } catch (err) {
      setMsg(errorMessage(err))
    }
  }

  async function generatePw() {
    try {
      const res = await api.get('/apps/generate-password')
      setNewPw(res.data.password)
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  const liveUrl = app.domain
    ? `http://${app.domain}`
    : `http://${window.location.hostname}:${app.port}`

  async function action(name) {
    setMsg('')
    try {
      const res = await api.post(`/apps/${app.id}/action/${name}`)
      setMsg(res.data.detail)
      onChanged()
    } catch (err) {
      setMsg(errorMessage(err))
    }
  }

  async function assignDomain() {
    setMsg('')
    try {
      const res = await api.post(`/apps/${app.id}/assign-domain`, { domain })
      setMsg(res.data.detail)
      onChanged()
    } catch (err) {
      setMsg(errorMessage(err))
    }
  }

  async function requestSsl() {
    setMsg('')
    try {
      const res = await api.post(`/apps/${app.id}/ssl`)
      setMsg(res.data.detail)
    } catch (err) {
      setMsg(errorMessage(err))
    }
  }

  async function toggleHidden() {
    try {
      await api.put(`/apps/${app.id}/hidden`, { hidden: !app.hidden })
      onChanged()
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  async function uninstall() {
    if (!window.confirm(`Remove ${app.name} from the panel? (the installed program stays on disk)`)) return
    try {
      await api.delete(`/apps/${app.id}`)
      onChanged()
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  const isRunnable = app.kind !== 'tool'

  return (
    <div className="card card-hover flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <AppGlyph glyph={app.icon} size="sm" />
          <span className="truncate font-semibold text-ink-primary">{app.name}</span>
        </div>
        <span className="flex shrink-0 items-center gap-1.5">
          {app.hidden && (
            <span className="badge badge-neutral" title="Only admins can see this app">
              <Icon name="eye-off" size={12} /> hidden
            </span>
          )}
          {isRunnable && <StatusBadge status={app.status} />}
        </span>
      </div>

      {isRunnable ? (
        <>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="shrink-0 text-ink-dim">{app.web_ui === false ? 'Port' : 'URL'}</dt>
              <dd className="min-w-0 truncate text-right">
                {app.web_ui === false ? (
                  <span className="font-mono text-[13px] text-ink-body" title="Backend service — connect other apps to this port">
                    127.0.0.1:{app.port} <span className="text-[11px] text-ink-faint">(backend)</span>
                  </span>
                ) : app.domain ? (
                  <a href={liveUrl} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1">
                    {app.domain} <Icon name="external-link" size={12} />
                  </a>
                ) : (
                  <span className="text-ink-muted" title="Port is localhost-only — assign a domain to reach it">
                    :{app.port} <span className="text-[11px] text-ink-faint">(internal)</span>
                  </span>
                )}
              </dd>
            </div>

            {app.username && (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-dim">Username</dt>
                <dd className="font-mono text-[13px] text-ink-secondary">{app.username}</dd>
              </div>
            )}

            {(app.secret || app.can_set_password) && (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 text-ink-dim">{app.secret_label || 'Password'}</dt>
                <dd className="flex min-w-0 items-center justify-end gap-1.5">
                  <span className="truncate font-mono text-[13px] text-amber-300">
                    {app.secret
                      ? (reveal ? app.secret : '••••••••')
                      : <span className="text-ink-faint">not set</span>}
                  </span>
                  {app.secret && (
                    <button className="btn-icon h-6 w-6" title={reveal ? 'Hide' : 'Show'}
                      onClick={() => setReveal((v) => !v)}>
                      <Icon name={reveal ? 'eye-off' : 'eye'} size={13} />
                    </button>
                  )}
                </dd>
              </div>
            )}
          </dl>

          {app.can_set_password && (
            <div className="mt-3">
              {showPwForm ? (
                <div className="flex animate-fade-up flex-wrap items-center gap-2">
                  <input className="input max-w-[13rem] py-1.5 font-mono text-[13px]" placeholder="new password"
                    value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                  <button className="btn-icon" onClick={generatePw} title="Generate a strong password">
                    <Icon name="dice" size={15} />
                  </button>
                  <button className="btn-primary btn-sm" onClick={setPassword} disabled={newPw.length < 4}>Set</button>
                  <button className="btn-ghost btn-sm" onClick={() => { setShowPwForm(false); setNewPw('') }}>Cancel</button>
                </div>
              ) : (
                <button className="link inline-flex items-center gap-1 text-xs" onClick={() => setShowPwForm(true)}>
                  <Icon name="edit" size={12} /> change {(app.secret_label || 'password').toLowerCase()}
                </button>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-secondary btn-sm" onClick={() => action('start')}>
              <Icon name="play" size={13} /> Start
            </button>
            <button className="btn-secondary btn-sm" onClick={() => action('stop')}>
              <Icon name="stop" size={13} /> Stop
            </button>
            <button className="btn-secondary btn-sm" onClick={() => action('restart')}>
              <Icon name="refresh" size={13} /> Restart
            </button>
            <button className="btn-secondary btn-sm" onClick={() => setShowLog((v) => !v)}>
              <Icon name="scroll" size={13} /> Logs
            </button>
            {app.has_credentials && (
              <button className="btn-secondary btn-sm" onClick={toggleCreds}>
                <Icon name="key" size={13} /> Credentials
              </button>
            )}
          </div>

          {creds && (
            <div className="surface mt-3 animate-fade-up space-y-2">
              <p className="label !mb-2">All credentials (from the stack's config)</p>
              {creds.map((c) => (
                <div key={c.label} className="flex items-start justify-between gap-3 text-xs">
                  <span className="shrink-0 text-ink-muted">{c.label}</span>
                  <span className="flex items-center gap-1 break-all text-right font-mono text-amber-300">
                    {c.value || <span className="text-ink-faint">—</span>}
                    {c.value && (
                      <button className="btn-icon h-6 w-6"
                        onClick={() => navigator.clipboard?.writeText(c.value)} title="Copy">
                        <Icon name="copy" size={12} />
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          {app.web_ui !== false && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input className="input max-w-[11rem] py-1.5 text-[13px]" placeholder="app.example.com"
                value={domain} onChange={(e) => setDomain(e.target.value)} />
              <button className="btn-secondary btn-sm" onClick={assignDomain} disabled={!domain}>Domain</button>
              <button className="btn-secondary btn-sm" onClick={requestSsl} disabled={!app.domain}>
                <Icon name="lock" size={13} /> SSL
              </button>
            </div>
          )}

          {showLog && <LiveLog path={`/ws/apps/${app.id}/logs`} />}
        </>
      ) : app.slug === 'onedrive' ? (
        <OneDriveSetup />
      ) : (
        <p className="hint mt-3">Installed tool — no web UI to run.</p>
      )}

      {msg && <p className="mt-3 break-words text-xs text-ink-muted">{msg}</p>}

      <div className="mt-4 flex justify-end gap-3 border-t border-panel-border/50 pt-3">
        {isAdmin && (
          <button onClick={toggleHidden} className="act inline-flex items-center gap-1"
            title={app.hidden ? 'Hidden from non-admins — click to unhide' : 'Hide from non-admins'}>
            <Icon name={app.hidden ? 'eye-off' : 'eye'} size={12} />
            {app.hidden ? 'unhide' : 'hide'}
          </button>
        )}
        <button onClick={uninstall} className="act-danger">remove</button>
      </div>
    </div>
  )
}

/**
 * OneDrive setup: authorize a Microsoft account, then start/stop the read-only
 * sync monitor. Files appear under /srv/onedrive and in each project's
 * OneDrive tab (where a folder is mapped per project).
 */
function OneDriveSetup() {
  const [status, setStatus] = useState(null) // { installed, authorized, monitor, sync_dir }
  const [authUrl, setAuthUrl] = useState('')
  const [responseUrl, setResponseUrl] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => {
    api.get('/onedrive/status').then((r) => setStatus(r.data)).catch(() => {})
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function startAuth() {
    setMsg(''); setBusy(true)
    try {
      const r = await api.post('/onedrive/auth/start')
      setAuthUrl(r.data.auth_url)
    } catch (err) {
      setMsg(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function completeAuth() {
    setMsg(''); setBusy(true)
    try {
      const r = await api.post('/onedrive/auth/complete', { response_url: responseUrl })
      setMsg(r.data.detail)
      setAuthUrl(''); setResponseUrl('')
      refresh()
    } catch (err) {
      setMsg(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function monitor(action) {
    setMsg('')
    try {
      const r = await api.post(`/onedrive/monitor/${action}`)
      setMsg(r.data.detail)
      setTimeout(refresh, 1200)
    } catch (err) {
      setMsg(errorMessage(err))
    }
  }

  async function resync() {
    if (!window.confirm('Full resync re-checks the whole drive and pulls shared '
      + 'items. This can take a while. Continue?')) return
    setMsg('')
    try {
      const r = await api.post('/onedrive/resync')
      setMsg(r.data.detail)
      setTimeout(refresh, 1500)
    } catch (err) {
      setMsg(errorMessage(err))
    }
  }

  if (!status) return <p className="hint mt-3">Loading…</p>

  return (
    <div className="mt-4 space-y-4">
      <dl className="space-y-2 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-dim">Authorized</dt>
          <dd className={status.authorized ? 'text-mint-300' : 'text-amber-300'}>
            {status.authorized ? 'yes' : 'not yet'}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-dim">Sync monitor</dt>
          <dd className="text-ink-secondary">{status.monitor}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="shrink-0 text-ink-dim">Folder</dt>
          <dd className="min-w-0 truncate font-mono text-[13px] text-ink-body">{status.sync_dir}</dd>
        </div>
      </dl>

      {!status.authorized ? (
        <div className="space-y-3">
          {!authUrl ? (
            <button className="btn-primary" disabled={busy} onClick={startAuth}>
              <Icon name="key" size={14} />
              {busy ? 'Starting…' : 'Authorize OneDrive'}
            </button>
          ) : (
            <div className="surface animate-fade-up space-y-3">
              <p className="hint">1. Open this URL, sign in, and approve access:</p>
              <a href={authUrl} target="_blank" rel="noreferrer"
                 className="link block break-all text-xs">
                {authUrl}
              </a>
              <p className="hint">
                2. After approving, your browser lands on a blank page. Copy that page’s
                full URL from the address bar and paste it here:
              </p>
              <input
                className="input font-mono text-xs"
                placeholder="https://login.microsoftonline.com/.../nativeclient?code=…"
                value={responseUrl}
                onChange={(e) => setResponseUrl(e.target.value)}
              />
              <button className="btn-primary" disabled={busy || !responseUrl} onClick={completeAuth}>
                <Icon name="check" size={14} />
                {busy ? 'Finishing…' : 'Finish & start syncing'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary btn-sm" onClick={() => monitor('start')}>
              <Icon name="play" size={13} /> Start
            </button>
            <button className="btn-secondary btn-sm" onClick={() => monitor('stop')}>
              <Icon name="stop" size={13} /> Stop
            </button>
            <button className="btn-secondary btn-sm" onClick={() => monitor('restart')}>
              <Icon name="refresh" size={13} /> Sync now
            </button>
            <button className="btn-secondary btn-sm" disabled={status.resyncing} onClick={resync}>
              <Icon name={status.resyncing ? 'clock' : 'download'} size={13} />
              {status.resyncing ? 'Resyncing…' : 'Pull shared items'}
            </button>
          </div>
          <p className="hint">
            Files others shared with you (Work/School) only appear after a one-time
            <b className="text-ink-secondary"> resync</b>.
          </p>
        </div>
      )}

      {msg && <p className="break-words text-xs text-ink-muted">{msg}</p>}
    </div>
  )
}
