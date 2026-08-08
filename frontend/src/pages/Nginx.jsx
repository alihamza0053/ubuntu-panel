import { useCallback, useEffect, useState } from 'react'
import api, { errorMessage } from '../api/client'
import EditorModal from '../components/EditorModal'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'

const ENTITY_TILE = {
  website: 'tile-aqua',
  project: 'tile-mint',
  proxy: 'tile-violet',
  app: 'tile-amber',
}

/** Nginx config manager: list managed blocks, edit in Monaco, reload, delete. */
export default function Nginx() {
  const [configs, setConfigs] = useState([])
  const [editorPath, setEditorPath] = useState(null)
  const [message, setMessage] = useState('')

  const refresh = useCallback(() => {
    api.get('/nginx/configs').then((res) => setConfigs(res.data)).catch(() => {})
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function reload() {
    setMessage('')
    try {
      const res = await api.post('/nginx/reload')
      setMessage(res.data.detail)
    } catch (err) {
      setMessage(errorMessage(err))
    }
  }

  async function remove(cfg) {
    if (!window.confirm(`Delete nginx config for ${cfg.domain}? This unlinks and reloads nginx.`)) return
    try {
      await api.delete(`/nginx/configs/${cfg.id}`)
      refresh()
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  return (
    <div>
      <PageHeader
        title="Nginx Configs"
        crumbs={[{ label: 'ServerHub', to: '/dashboard' }, { label: 'Nginx' }]}
        lead="Every server block the panel wrote — edit it inline, then reload nginx."
        actions={
          <button className="btn-primary" onClick={reload}>
            <Icon name="refresh" size={14} /> Reload Nginx
          </button>
        }
      />

      {message && (
        <p className="mb-4 flex items-start gap-2 break-words text-sm text-ink-body">
          <Icon name="info" size={14} className="mt-0.5 text-mint-400" />
          {message}
        </p>
      )}

      {configs.length === 0 ? (
        <div className="empty">
          <Icon name="sliders" size={26} />
          <p>No managed configs yet — assign a domain to a project or website to create one.</p>
        </div>
      ) : (
        <div className="table-panel">
          <table className="tbl">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Type</th>
                <th>Path</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((cfg) => (
                <tr key={cfg.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className={`icon-tile ${ENTITY_TILE[cfg.entity_type] || ''}`}>
                        <Icon name="globe" size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[13px] text-ink-primary">{cfg.domain}</p>
                        <p className="text-[11px] text-ink-faint">nginx server block</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-ink-muted">{cfg.entity_type}</td>
                  <td className="max-w-xs truncate font-mono text-xs text-ink-faint">{cfg.config_path}</td>
                  <td className="col-actions">
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => setEditorPath(cfg.config_path)} className="btn-icon" title="Edit">
                        <Icon name="edit" size={15} />
                      </button>
                      <button onClick={() => remove(cfg)} className="btn-icon-danger" title="Delete">
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

      <EditorModal
        path={editorPath}
        onClose={(saved) => {
          setEditorPath(null)
          if (saved) reload()
        }}
      />
    </div>
  )
}
