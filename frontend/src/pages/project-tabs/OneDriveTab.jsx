import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { errorMessage } from '../../api/client'
import Icon from '../../components/Icon'
import Modal from '../../components/Modal'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatTime(iso) {
  return new Date(iso + 'Z').toLocaleString()
}

/**
 * OneDrive tab: read-only view of the project's mapped OneDrive subfolder.
 * Files are kept fresh by the panel's OneDrive sync monitor (set up in Apps).
 */
export default function OneDriveTab({ project }) {
  const [status, setStatus] = useState(null) // { installed, authorized, monitor, sync_dir }
  const [listing, setListing] = useState(null) // { mapped, subpath, parent, available, entries }
  const [subpath, setSubpath] = useState('')
  const [msg, setMsg] = useState('')
  const [picker, setPicker] = useState(null) // { path, entries } when open

  const loadStatus = useCallback(() => {
    api.get('/onedrive/status').then((r) => setStatus(r.data)).catch(() => setStatus(null))
  }, [])

  const loadListing = useCallback(() => {
    api
      .get(`/projects/${project.id}/onedrive`, { params: { subpath } })
      .then((r) => setListing(r.data))
      .catch((err) => setMsg(errorMessage(err)))
  }, [project.id, subpath])

  useEffect(() => { loadStatus() }, [loadStatus])
  useEffect(() => { loadListing() }, [loadListing])

  async function syncNow() {
    setMsg('Syncing…')
    try {
      const r = await api.post('/onedrive/monitor/restart')
      setMsg(r.data.detail)
      setTimeout(loadListing, 1500)
    } catch (err) {
      setMsg(errorMessage(err))
    }
  }

  function download(rel, name) {
    api
      .get(`/projects/${project.id}/onedrive/download`, {
        params: { path: rel }, responseType: 'blob',
      })
      .then((res) => {
        const url = URL.createObjectURL(res.data)
        const a = document.createElement('a')
        a.href = url
        a.download = name
        a.click()
        URL.revokeObjectURL(url)
      })
      .catch((err) => alert(errorMessage(err)))
  }

  // ---- folder picker (browse the OneDrive root, pick a subfolder) ----
  function openPicker() {
    browseTo(status?.sync_dir || '')
  }

  function browseTo(path) {
    api
      .get('/files/browse', { params: { path } })
      .then((r) => setPicker({ path: r.data.path, parent: r.data.parent, entries: r.data.entries }))
      .catch((err) => alert(errorMessage(err)))
  }

  async function selectFolder(absPath) {
    const root = status?.sync_dir || ''
    let rel = absPath
    if (root && absPath.startsWith(root)) rel = absPath.slice(root.length).replace(/^[/\\]+/, '')
    if (absPath === root) rel = ''
    try {
      await api.put(`/projects/${project.id}/onedrive-path`, { path: rel })
      setPicker(null)
      setSubpath('')
      loadListing()
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  // OneDrive not set up yet → guide the user to the Apps page.
  if (status && (!status.installed || !status.authorized)) {
    return (
      <div className="card">
        <div className="flex items-center gap-3">
          <span className="icon-tile tile-aqua"><Icon name="cloud" size={17} /></span>
          <h3 className="sec-title">OneDrive</h3>
        </div>
        <p className="mt-3 text-sm text-ink-muted">
          {!status.installed
            ? 'The OneDrive client isn’t installed on this server yet.'
            : 'OneDrive is installed but not authorized yet.'}
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Set it up once in the{' '}
          <Link to="/apps" className="link">Apps</Link> page
          (Files &amp; Sync → OneDrive), then map a folder here.
        </p>
      </div>
    )
  }

  const crumbs = subpath ? subpath.split('/') : []

  return (
    <div className="card">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="icon-tile tile-aqua"><Icon name="cloud" size={17} /></span>
          <div className="min-w-0">
            <h3 className="sec-title">OneDrive files</h3>
            <p className="hint mt-0.5">
              Mapped folder:{' '}
              <span className="font-mono text-ink-secondary">{listing?.mapped || '(none selected)'}</span>
              {status?.monitor && (
                <span className="ml-2">· monitor: <span className="text-ink-secondary">{status.monitor}</span></span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary btn-sm" onClick={openPicker}>
            <Icon name="folder" size={13} /> Change folder
          </button>
          <button className="btn-secondary btn-sm" onClick={syncNow}>
            <Icon name="refresh" size={13} /> Sync now
          </button>
        </div>
      </div>

      {/* Breadcrumb within the mapped folder */}
      {listing?.mapped !== undefined && (
        <nav className="crumbs mb-4">
          <button className="crumb" onClick={() => setSubpath('')}>root</button>
          {crumbs.map((c, i) => (
            <span key={i} className="contents">
              <Icon name="chevron-right" size={12} className="crumb-sep" />
              {i === crumbs.length - 1 ? (
                <span className="crumb-current">{c}</span>
              ) : (
                <button className="crumb" onClick={() => setSubpath(crumbs.slice(0, i + 1).join('/'))}>{c}</button>
              )}
            </span>
          ))}
        </nav>
      )}

      {!listing?.available ? (
        <div className="empty">
          <Icon name="cloud" size={26} />
          <p>
            {listing?.mapped == null
              ? 'No OneDrive folder mapped yet — click “Change folder”.'
              : 'Folder not synced yet. Click “Sync now”, then refresh.'}
          </p>
        </div>
      ) : listing.entries.length === 0 ? (
        <div className="empty">
          <Icon name="folder" size={26} />
          <p>This folder is empty.</p>
        </div>
      ) : (
        <div className="table-panel">
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Size</th>
                <th>Last modified</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listing.entries.map((e) => (
                <tr key={e.rel}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className={`icon-tile ${e.is_dir ? 'tile-mint' : ''}`}>
                        <Icon name={e.is_dir ? 'folder' : 'file'} size={16} />
                      </span>
                      {e.is_dir ? (
                        <button className="truncate font-mono text-[13px] text-ink-primary
                                           transition-colors hover:text-mint-300"
                          onClick={() => setSubpath(e.rel)}>
                          {e.name}
                        </button>
                      ) : (
                        <span className="truncate font-mono text-[13px] text-ink-secondary">{e.name}</span>
                      )}
                    </div>
                  </td>
                  <td className="text-ink-muted">{e.is_dir ? '—' : formatSize(e.size)}</td>
                  <td className="whitespace-nowrap text-ink-muted">{formatTime(e.modified)}</td>
                  <td className="col-actions">
                    {!e.is_dir && (
                      <button onClick={() => download(e.rel, e.name)} className="btn-icon" title="Download">
                        <Icon name="download" size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {msg && <p className="mt-4 break-words text-xs text-ink-muted">{msg}</p>}

      {/* Folder picker modal */}
      {picker && (
        <Modal
          title="Pick a OneDrive folder"
          subtitle={picker.path || '/'}
          width="max-w-lg"
          onClose={() => setPicker(null)}
          footer={
            <>
              {picker.parent != null && (
                <button className="btn-secondary mr-auto" onClick={() => browseTo(picker.parent)}>
                  <Icon name="arrow-up" size={14} /> Up
                </button>
              )}
              <button className="btn-primary" onClick={() => selectFolder(picker.path)}>
                <Icon name="check" size={14} /> Use this folder
              </button>
            </>
          }
        >
          <ul className="max-h-[50vh] divide-y divide-panel-border/40 overflow-y-auto">
            {picker.entries.filter((e) => e.is_dir).map((e) => (
              <li key={e.path}>
                <button
                  className="flex w-full items-center gap-3 py-2 text-left transition-colors hover:text-mint-300"
                  onClick={() => browseTo(e.path)}
                >
                  <span className="icon-tile tile-mint"><Icon name="folder" size={16} /></span>
                  <span className="truncate font-mono text-[13px]">{e.name}</span>
                  <Icon name="chevron-right" size={14} className="ml-auto text-ink-faint" />
                </button>
              </li>
            ))}
            {picker.entries.filter((e) => e.is_dir).length === 0 && (
              <li className="py-6 text-center text-sm text-ink-faint">No subfolders here.</li>
            )}
          </ul>
        </Modal>
      )}
    </div>
  )
}
