import { useCallback, useEffect, useRef, useState } from 'react'
import api, { errorMessage } from '../api/client'
import FolderBrowser from '../components/FolderBrowser'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'

export default function ShopifyApps() {
  const [apps, setApps] = useState([])
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [uploadTarget, setUploadTarget] = useState(null)
  const inputRef = useRef(null)

  const refresh = useCallback(() => {
    api.get('/shopify-apps').then((res) => setApps(res.data)).catch((err) => setMessage(errorMessage(err)))
  }, [])
  useEffect(() => { refresh() }, [refresh])

  async function createWorkspace(e) {
    e.preventDefault()
    if (!name.trim()) return
    try {
      const res = await api.post('/shopify-apps', { name })
      setMessage(res.data.detail); setName(''); refresh()
    } catch (err) { setMessage(errorMessage(err)) }
  }

  function chooseArchive(appName) { setUploadTarget(appName); inputRef.current?.click() }

  async function uploadArchive(file) {
    if (!file || !uploadTarget) return
    setMessage('Uploading source archive...')
    const form = new FormData(); form.append('file', file)
    try {
      const res = await api.post(`/shopify-apps/${encodeURIComponent(uploadTarget)}/archive`, form)
      setMessage(res.data.detail); refresh()
    } catch (err) { setMessage(errorMessage(err)) }
    finally { setUploadTarget(null) }
  }

  return (
    <div>
      <PageHeader
        title="Shopify Apps"
        crumbs={[{ label: 'ServerHub' }, { label: 'Shopify Apps' }]}
        lead="Panel-managed local source storage. Upload a ZIP without node_modules, then deploy its Dockerfile on this VPS."
      />

      <form onSubmit={createWorkspace} className="card flex flex-wrap items-end gap-3">
        <div className="min-w-[16rem] flex-1">
          <label className="label">New workspace</label>
          <input className="input max-w-sm font-mono" placeholder="app name, e.g. size-chart"
            value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <button className="btn-primary" type="submit" disabled={!name.trim()}>
          <Icon name="plus" size={14} /> New Shopify app
        </button>
        {message && <span className="break-all text-sm text-ink-muted">{message}</span>}
      </form>

      <input ref={inputRef} type="file" accept=".zip,application/zip" className="hidden"
        onChange={(e) => { uploadArchive(e.target.files?.[0]); e.target.value = '' }} />

      <div className="mt-4 space-y-4">
        {apps.length === 0 ? (
          <div className="empty">
            <Icon name="store" size={26} />
            <p>No Shopify app workspaces yet.</p>
          </div>
        ) : apps.map((app) => (
          <div key={app.path} className="card">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className={`icon-tile ${app.has_dockerfile ? 'tile-mint' : 'tile-amber'}`}>
                <Icon name={app.has_dockerfile ? 'container' : 'package'} size={17} />
              </span>
              <div className="min-w-0">
                <h3 className="truncate font-mono font-semibold text-ink-primary">{app.name}</h3>
                <p className="hint">
                  {app.has_dockerfile ? 'Dockerfile found — ready to build.' : 'Upload source containing a Dockerfile.'}
                </p>
              </div>
              <button className="btn-secondary ml-auto" onClick={() => chooseArchive(app.name)}>
                <Icon name="upload" size={14} /> Upload source ZIP
              </button>
            </div>
            <FolderBrowser rootPath={app.path} editable viewer={false}
              emptyHint="Upload a source ZIP or add files here" />
          </div>
        ))}
      </div>
    </div>
  )
}
