import { useCallback, useEffect, useState } from 'react'
import api, { errorMessage } from '../api/client'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'

function formatSize(bytes) {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatTime(iso) {
  return iso ? new Date(iso + (iso.endsWith('Z') ? '' : 'Z')).toLocaleString() : '—'
}

/** "in 5h 12m" until the item is auto-purged (or "expired"). */
function timeLeft(expiresIso) {
  if (!expiresIso) return '—'
  const ms = new Date(expiresIso + (expiresIso.endsWith('Z') ? '' : 'Z')).getTime() - Date.now()
  if (ms <= 0) return 'expiring…'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `in ${h}h ${m}m` : `in ${m}m`
}

export default function RecycleBin() {
  const [items, setItems] = useState([])
  const [retention, setRetention] = useState(24)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    setErr('')
    api.get('/trash')
      .then((res) => {
        setItems(res.data.items || [])
        setRetention(res.data.retention_hours ?? 24)
      })
      .catch((e) => setErr(errorMessage(e)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function restore(item) {
    try {
      const r = await api.post(`/trash/${item.id}/restore`)
      load()
      alert(r.data.detail)
    } catch (e) { alert(errorMessage(e)) }
  }

  async function remove(item) {
    if (!window.confirm(`Permanently delete "${item.name}"? This cannot be undone.`)) return
    try {
      await api.delete(`/trash/${item.id}`)
      load()
    } catch (e) { alert(errorMessage(e)) }
  }

  async function empty() {
    if (!items.length) return
    if (!window.confirm('Permanently delete everything in the recycle bin? This cannot be undone.')) return
    try {
      await api.post('/trash/empty')
      load()
    } catch (e) { alert(errorMessage(e)) }
  }

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Recycle Bin"
        crumbs={[{ label: 'ServerHub', to: '/dashboard' }, { label: 'Files', to: '/files' }, { label: 'Recycle Bin' }]}
        lead={`Files deleted from Projects & Websites in the last ${retention} hours. Items are removed automatically ${retention}h after deletion.`}
        actions={
          <>
            <button className="btn-secondary" onClick={load}>
              <Icon name="refresh" size={14} /> Refresh
            </button>
            <button className="btn-danger" disabled={!items.length} onClick={empty}>
              <Icon name="trash" size={14} /> Empty bin
            </button>
          </>
        }
      />

      {err && (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-red-400">
          <Icon name="alert" size={14} /> {err}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-ink-faint">Loading…</p>
      ) : items.length === 0 ? (
        <div className="empty">
          <Icon name="trash" size={26} />
          <p>The recycle bin is empty.</p>
          <p className="text-xs text-ink-faint">
            Deleted project &amp; website files show up here for {retention} hours.
          </p>
        </div>
      ) : (
        <div className="table-panel">
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Original location</th>
                <th>Size</th>
                <th>Deleted</th>
                <th>Auto-removes</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className={`icon-tile ${item.is_dir ? 'tile-mint' : ''}`}>
                        <Icon name={item.is_dir ? 'folder' : 'file'} size={16} />
                      </span>
                      <span className="truncate font-mono text-[13px] text-ink-primary">{item.name}</span>
                    </div>
                  </td>
                  <td className="font-mono text-xs text-ink-muted">{item.origin}</td>
                  <td className="text-ink-muted">{item.is_dir ? '—' : formatSize(item.size)}</td>
                  <td className="whitespace-nowrap text-ink-muted">{formatTime(item.deleted_at)}</td>
                  <td className="whitespace-nowrap text-xs text-amber-300">{timeLeft(item.expires_at)}</td>
                  <td className="col-actions">
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => restore(item)} className="btn-icon" title="Restore">
                        <Icon name="refresh" size={15} />
                      </button>
                      <button onClick={() => remove(item)} className="btn-icon-danger" title="Delete permanently">
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
