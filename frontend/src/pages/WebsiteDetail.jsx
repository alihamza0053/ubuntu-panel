import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import api, { errorMessage } from '../api/client'
import EditorModal from '../components/EditorModal'
import Icon from '../components/Icon'
import LiveLog from '../components/LiveLog'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'

const BASE_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'files', label: 'Files' },
  { key: 'database', label: 'Database' },
  { key: 'domain', label: 'Domain & SSL' },
]

// Python apps get a "Run" tab (between Files and Database).
function tabsFor(type) {
  if (type !== 'python') return BASE_TABS
  return [
    BASE_TABS[0], BASE_TABS[1],
    { key: 'run', label: 'Run' },
    BASE_TABS[2], BASE_TABS[3],
  ]
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** One label/value line inside an info card. */
function InfoRow({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-panel-border/40 py-2 last:border-0">
      <dt className="shrink-0 text-ink-dim">{label}</dt>
      <dd className="min-w-0 break-all text-right text-ink-body">{children}</dd>
    </div>
  )
}

/** Small inline message strip shared by the tabs below. */
function Note({ children }) {
  if (!children) return null
  return (
    <p className="flex items-start gap-2 break-words text-sm text-ink-body">
      <Icon name="info" size={14} className="mt-0.5 text-mint-400" />
      <span>{children}</span>
    </p>
  )
}

export default function WebsiteDetail() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'overview'

  const [site, setSite] = useState(null)
  const [files, setFiles] = useState([])
  const [editorPath, setEditorPath] = useState(null)
  const uploadRef = useRef(null)
  const [uploadMsg, setUploadMsg] = useState('')

  const refresh = useCallback(() => {
    api.get(`/websites/${id}`).then((res) => setSite(res.data))
    api.get(`/websites/${id}/files`).then((res) => setFiles(res.data)).catch(() => setFiles([]))
  }, [id])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function uploadZip(file, build) {
    if (!file) return
    setUploadMsg('Uploading…')
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await api.post(`/websites/${id}/upload`, form, {
        params: { build, replace: true },
      })
      setUploadMsg(res.data.detail + (res.data.build_output ? `\n${res.data.build_output}` : ''))
      refresh()
    } catch (err) {
      setUploadMsg(errorMessage(err))
    }
  }

  if (!site) return <p className="text-sm text-ink-faint">Loading…</p>

  const liveUrl = site.domain ? `http://${site.domain}` : null
  const editableFile = (name) => /\.(html?|css|js|jsx|ts|tsx|php|json|md|txt|xml|env|sql)$/i.test(name)
  const sitePath = (name) => `${site.folder_path}/${name.replace(/\/$/, '')}`

  return (
    <div>
      <PageHeader
        title={site.name}
        crumbs={[
          { label: 'ServerHub', to: '/dashboard' },
          { label: 'Websites', to: '/websites' },
          { label: site.name },
        ]}
        badge={<span className="badge badge-neutral">{site.type.toUpperCase()}</span>}
        actions={
          liveUrl && (
            <a href={liveUrl} target="_blank" rel="noreferrer" className="btn-secondary">
              <Icon name="external-link" size={14} /> {site.domain}
            </a>
          )
        }
      />

      <div className="tabs">
        {tabsFor(site.type).map((t) => (
          <button key={t.key} onClick={() => setSearchParams({ tab: t.key })}
            className={`tab ${tab === t.key ? 'tab-active' : ''}`}>{t.label}</button>
        ))}
      </div>

      <div className="mt-5 panel-enter" key={tab}>
        {/* Overview */}
        {tab === 'overview' && (
          <div className="card max-w-xl">
            <h3 className="sec-title mb-3">Website Info</h3>
            <dl className="text-sm">
              <InfoRow label="Type">{site.type}</InfoRow>
              <InfoRow label="Folder"><span className="font-mono text-[13px]">{site.folder_path}</span></InfoRow>
              <InfoRow label="Domain">{site.domain || '—'}</InfoRow>
              <InfoRow label="Database">{site.db_name || '—'}</InfoRow>
              {site.type === 'python' && (
                <>
                  <InfoRow label="Port"><span className="font-mono text-[13px]">127.0.0.1:{site.port}</span></InfoRow>
                  <InfoRow label="Status"><StatusBadge status={site.status} /></InfoRow>
                </>
              )}
            </dl>
          </div>
        )}

        {/* Run (python apps) */}
        {tab === 'run' && <RunTab site={site} onChanged={refresh} />}

        {/* Files */}
        {tab === 'files' && (
          <div className="space-y-4">
            <div className="card">
              <h3 className="sec-title mb-3">Deploy</h3>
              <div className="flex flex-wrap items-center gap-2">
                <button className="btn-primary" onClick={() => uploadRef.current?.click()}>
                  <Icon name="upload" size={14} /> Upload .zip
                </button>
                {site.type === 'react' && (
                  <button className="btn-secondary" onClick={() => {
                    const f = uploadRef.current?.files?.[0]
                    if (f) uploadZip(f, true)
                    else alert('Pick a zip first via Upload')
                  }}>
                    <Icon name="package" size={14} /> Upload + npm build
                  </button>
                )}
                <input ref={uploadRef} type="file" accept=".zip" className="hidden"
                  onChange={(e) => { uploadZip(e.target.files[0], false); e.target.value = '' }} />
              </div>
              <p className="hint mt-3">
                Upload a .zip — it replaces the folder contents{site.type === 'react' ? ' (then builds to dist/)' : ''}.
              </p>
              {uploadMsg && (
                <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border
                                border-panel-border/70 bg-panel-ink p-3.5 font-mono text-xs text-ink-body">
                  {uploadMsg}
                </pre>
              )}
            </div>

            <div className="card">
              <h3 className="sec-title mb-3">Files</h3>
              {files.length === 0 ? (
                <div className="empty">
                  <Icon name="folder" size={26} />
                  <p>Empty — upload a zip to deploy this site.</p>
                </div>
              ) : (
                <div className="table-panel">
                  <table className="tbl">
                    <thead>
                      <tr><th>Name</th><th className="text-right">Size</th></tr>
                    </thead>
                    <tbody>
                      {files.map((f) => {
                        const dir = f.name.endsWith('/')
                        const canEdit = editableFile(f.name)
                        return (
                          <tr key={f.name}>
                            <td>
                              <div className="flex items-center gap-3">
                                <span className={`icon-tile ${dir ? 'tile-mint' : canEdit ? 'tile-violet' : ''}`}>
                                  <Icon name={dir ? 'folder' : canEdit ? 'file-text' : 'file'} size={16} />
                                </span>
                                {canEdit ? (
                                  <button className="font-mono text-[13px] text-ink-primary transition-colors hover:text-mint-300"
                                    onClick={() => setEditorPath(sitePath(f.name))}>
                                    {f.name}
                                  </button>
                                ) : (
                                  <span className="font-mono text-[13px] text-ink-secondary">{f.name}</span>
                                )}
                              </div>
                            </td>
                            <td className="text-right text-xs text-ink-muted">{dir ? '' : formatSize(f.size)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="hint mt-3">For full navigation/rename/move use the global File Manager.</p>
            </div>
          </div>
        )}

        {/* Database */}
        {tab === 'database' && <DatabaseTab site={site} onChanged={refresh} />}

        {/* Domain & SSL */}
        {tab === 'domain' && <DomainTab site={site} onChanged={refresh} />}
      </div>

      <EditorModal path={editorPath} onClose={() => setEditorPath(null)} />
    </div>
  )
}

/** Link / change / unlink the website's MySQL database. */
function DatabaseTab({ site, onChanged }) {
  const [databases, setDatabases] = useState([])
  const [selected, setSelected] = useState(site.db_name || '')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get('/databases').then((res) => setDatabases(res.data)).catch(() => {})
  }, [])

  async function save() {
    setBusy(true); setMsg('')
    try {
      const res = await api.post(`/websites/${site.id}/link-database`, { db_name: selected })
      setMsg(res.data.detail)
      onChanged()
    } catch (err) {
      setMsg(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card max-w-xl space-y-4">
      <h3 className="sec-title">Linked Database</h3>

      <p className="text-sm text-ink-muted">
        Current: {site.db_name
          ? <span className="font-mono text-mint-300">{site.db_name}</span>
          : <span className="text-ink-faint">none</span>}
      </p>

      <div>
        <label className="label">Select a database to link</label>
        <select className="input max-w-xs" value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">— none (unlink) —</option>
          {databases.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save link'}
        </button>
        <Link to="/databases" className="link inline-flex items-center gap-1 text-sm">
          Manage databases <Icon name="chevron-right" size={13} />
        </Link>
      </div>

      <Note>{msg}</Note>
      {databases.length === 0 && (
        <p className="hint">
          No databases exist yet — create one on the Databases page, then link it here.
        </p>
      )}
    </div>
  )
}

/** Python web-service controls: deps, run command, start/stop, logs. */
function RunTab({ site, onChanged }) {
  const [cmd, setCmd] = useState(site.run_command || '')
  const [msg, setMsg] = useState('')
  const [setupWs, setSetupWs] = useState(null)
  const [showAppLogs, setShowAppLogs] = useState(false)

  async function saveCmd() {
    setMsg('')
    try {
      const r = await api.put(`/websites/${site.id}/run-command`, { run_command: cmd })
      setMsg(r.data.detail)
      onChanged()
    } catch (err) { setMsg(errorMessage(err)) }
  }

  async function installDeps() {
    setMsg('')
    try {
      const r = await api.post(`/websites/${site.id}/install-deps`)
      setMsg(r.data.detail)
      setSetupWs(null)
      setTimeout(() => setSetupWs(`/ws/websites/${site.id}/logs?source=setup`), 0)
      onChanged()
    } catch (err) { setMsg(errorMessage(err)) }
  }

  async function action(name) {
    setMsg('')
    try {
      const r = await api.post(`/websites/${site.id}/action/${name}`)
      setMsg(r.data.detail)
      onChanged()
    } catch (err) { setMsg(errorMessage(err)) }
  }

  const envBadge = {
    READY: 'badge-mint',
    BUILDING: 'badge-amber',
    MISSING: 'badge-neutral',
  }[site.env_status] || 'badge-neutral'

  return (
    <div className="max-w-2xl space-y-4">
      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="sec-title">Service</h3>
          <div className="flex items-center gap-2">
            <span className={`badge ${envBadge}`}>deps: {site.env_status || 'MISSING'}</span>
            <StatusBadge status={site.status} />
          </div>
        </div>

        <p className="hint">
          Upload your app in the <b className="text-ink-secondary">Files</b> tab (a .zip with your code +
          requirements.txt), then install deps and start it. It runs on{' '}
          <span className="font-mono text-ink-secondary">127.0.0.1:{site.port}</span>; assign a domain to reach it.
        </p>

        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary btn-sm" onClick={installDeps}>
            <Icon name="package" size={13} /> Install deps
          </button>
          <button className="btn-secondary btn-sm" onClick={() => action('start')}>
            <Icon name="play" size={13} /> Start
          </button>
          <button className="btn-secondary btn-sm" onClick={() => action('stop')}>
            <Icon name="stop" size={13} /> Stop
          </button>
          <button className="btn-secondary btn-sm" onClick={() => action('restart')}>
            <Icon name="refresh" size={13} /> Restart
          </button>
          <button className="btn-secondary btn-sm" onClick={() => setShowAppLogs((v) => !v)}>
            <Icon name="scroll" size={13} /> Logs
          </button>
        </div>

        {setupWs && (
          <div>
            <p className="label">Dependency install</p>
            <LiveLog path={setupWs} />
          </div>
        )}
        {showAppLogs && (
          <div>
            <p className="label">App logs</p>
            <LiveLog path={`/ws/websites/${site.id}/logs?source=app`} />
          </div>
        )}
      </div>

      <div className="card space-y-3">
        <h3 className="sec-title">Run command</h3>
        <p className="hint">
          Use <span className="font-mono text-ink-secondary">{'{port}'}</span> for the port. The app’s venv is on
          PATH, so <span className="font-mono text-ink-secondary">uvicorn</span>/
          <span className="font-mono text-ink-secondary">gunicorn</span>/
          <span className="font-mono text-ink-secondary">python</span> resolve to it.
        </p>
        <input className="input font-mono text-[13px]" value={cmd} onChange={(e) => setCmd(e.target.value)} />
        <div className="flex gap-2">
          <button className="btn-primary" onClick={saveCmd}>Save</button>
          <button className="btn-secondary" onClick={() => setCmd('uvicorn app_server:app --host 127.0.0.1 --port {port}')}>
            Reset default
          </button>
        </div>
      </div>

      <Note>{msg}</Note>
    </div>
  )
}

/** Domain assignment + SSL for a website. */
function DomainTab({ site, onChanged }) {
  const [domain, setDomain] = useState(site.domain || '')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function assign() {
    setBusy(true); setMsg('')
    try {
      const res = await api.post(`/websites/${site.id}/assign-domain`, { domain })
      setMsg(res.data.detail)
      onChanged()
    } catch (err) { setMsg(errorMessage(err)) } finally { setBusy(false) }
  }

  async function ssl() {
    setBusy(true); setMsg('')
    try {
      const res = await api.post(`/websites/${site.id}/ssl`)
      setMsg(res.data.detail)
    } catch (err) { setMsg(errorMessage(err)) } finally { setBusy(false) }
  }

  return (
    <div className="card max-w-xl space-y-4">
      <h3 className="sec-title">Domain &amp; SSL</h3>
      <div>
        <label className="label">Domain</label>
        <div className="flex flex-wrap items-center gap-2">
          <input className="input max-w-xs" placeholder="example.com" value={domain}
            onChange={(e) => setDomain(e.target.value)} />
          <button className="btn-primary" onClick={assign} disabled={busy || !domain}>Assign domain</button>
          <button className="btn-secondary" onClick={ssl} disabled={busy || !site.domain}>
            <Icon name="lock" size={14} /> Request SSL
          </button>
        </div>
      </div>
      <p className="hint">
        Assigning writes an nginx {site.type} server block and reloads nginx. SSL runs certbot for the domain
        (DNS must already point at this server).
      </p>
      <Note>{msg}</Note>
    </div>
  )
}
