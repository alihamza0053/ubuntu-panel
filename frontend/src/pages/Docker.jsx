import { useCallback, useEffect, useState } from 'react'
import api, { errorMessage } from '../api/client'
import Icon from '../components/Icon'
import LiveLog from '../components/LiveLog'
import PageHeader from '../components/PageHeader'

/**
 * Docker manager: live view of all containers, images and volumes with
 * start/stop/restart/remove. Auto-refreshes to stay in sync with reality.
 */
export default function Docker() {
  const [data, setData] = useState({ ready: true, containers: [], images: [], volumes: [] })
  const [tab, setTab] = useState('containers')
  const [logId, setLogId] = useState(null) // container id whose logs are shown
  const [msg, setMsg] = useState('')

  const refresh = useCallback(() => {
    api.get('/docker').then((res) => setData(res.data)).catch((err) => setMsg(errorMessage(err)))
  }, [])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 5000) // keep in sync
    return () => clearInterval(t)
  }, [refresh])

  async function containerAction(cid, action) {
    if (action === 'remove' && !window.confirm('Remove this container?')) return
    setMsg('')
    try {
      await api.post(`/docker/containers/${cid}/${action}`)
      refresh()
    } catch (err) { setMsg(errorMessage(err)) }
  }

  async function removeImage(id) {
    if (!window.confirm('Remove this image?')) return
    try { await api.delete(`/docker/images/${id}`); refresh() }
    catch (err) { alert(errorMessage(err)) }
  }

  async function removeVolume(name) {
    if (!window.confirm(`Remove volume ${name}? Its data is lost.`)) return
    try { await api.delete(`/docker/volumes/${name}`); refresh() }
    catch (err) { alert(errorMessage(err)) }
  }

  async function prune() {
    if (!window.confirm('Prune unused containers, networks and dangling images?')) return
    try { const r = await api.post('/docker/prune'); setMsg(r.data.detail); refresh() }
    catch (err) { setMsg(errorMessage(err)) }
  }

  if (!data.ready) {
    return (
      <div>
        <PageHeader title="Docker" crumbs={[{ label: 'ServerHub', to: '/dashboard' }, { label: 'Docker' }]} />
        <div className="card border-amber-500/40 bg-amber-500/[0.06]">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-300">
            <Icon name="alert" size={15} /> Docker isn't installed
          </p>
          <p className="hint mt-2">
            Install the <b className="text-ink-secondary">Docker Engine</b> app from the{' '}
            <a href="/apps" className="link">Apps</a> page, then manage containers here.
          </p>
        </div>
      </div>
    )
  }

  const TABS = [
    ['containers', 'Containers', data.containers.length],
    ['images', 'Images', data.images.length],
    ['volumes', 'Volumes', data.volumes.length],
  ]

  return (
    <div>
      <PageHeader
        title="Docker"
        crumbs={[{ label: 'ServerHub', to: '/dashboard' }, { label: 'Docker' }]}
        lead="Every container, image and volume on this server — including the ones the panel installed."
        actions={
          <>
            <button className="btn-secondary" onClick={refresh}>
              <Icon name="refresh" size={14} /> Refresh
            </button>
            <button className="btn-secondary" onClick={prune}>
              <Icon name="clean" size={14} /> Prune
            </button>
          </>
        }
      />

      {msg && <p className="mb-4 break-words text-sm text-ink-muted">{msg}</p>}

      <div className="tabs">
        {TABS.map(([k, label, count]) => (
          <button key={k} onClick={() => setTab(k)} className={`tab ${tab === k ? 'tab-active' : ''}`}>
            {label}
            <span className="tab-count">{count}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 panel-enter" key={tab}>
        {/* Containers */}
        {tab === 'containers' && (
          <>
            <div className="table-panel">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Name</th><th>Image</th><th>State</th><th>Ports</th><th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.containers.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className={`icon-tile ${c.state === 'running' ? 'tile-mint' : ''}`}>
                            <Icon name="container" size={16} />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-mono text-[13px] text-ink-primary">{c.name}</p>
                            <p className="text-[11px] text-ink-faint">
                              {c.managed ? 'installed via the panel' : c.id.slice(0, 12)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-ink-muted">{c.image}</td>
                      <td>
                        <span className={`badge ${c.state === 'running' ? 'badge-mint' : 'badge-neutral'}`}>
                          <span className={c.state === 'running' ? 'dot-pulse' : 'dot'} />
                          {c.state}
                        </span>
                      </td>
                      <td className="font-mono text-xs text-ink-faint">{c.ports}</td>
                      <td className="col-actions">
                        <div className="inline-flex items-center gap-1">
                          {c.state === 'running' ? (
                            <button onClick={() => containerAction(c.id, 'stop')} className="btn-icon" title="Stop">
                              <Icon name="stop" size={14} />
                            </button>
                          ) : (
                            <button onClick={() => containerAction(c.id, 'start')} className="btn-icon" title="Start">
                              <Icon name="play" size={14} />
                            </button>
                          )}
                          <button onClick={() => containerAction(c.id, 'restart')} className="btn-icon" title="Restart">
                            <Icon name="refresh" size={15} />
                          </button>
                          <button onClick={() => setLogId(logId === c.id ? null : c.id)}
                            className={`btn-icon ${logId === c.id ? 'text-mint-300' : ''}`} title="Logs">
                            <Icon name="scroll" size={15} />
                          </button>
                          <button onClick={() => containerAction(c.id, 'remove')} className="btn-icon-danger" title="Remove">
                            <Icon name="trash" size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data.containers.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-ink-faint">No containers</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {logId && (
              <div className="mt-4">
                <p className="label">Logs — {logId.slice(0, 12)}</p>
                <LiveLog path={`/ws/docker/containers/${logId}/logs`} />
              </div>
            )}
          </>
        )}

        {/* Images */}
        {tab === 'images' && (
          <div className="table-panel">
            <table className="tbl">
              <thead>
                <tr><th>Image</th><th>Size</th><th>Created</th><th className="text-right">Actions</th></tr>
              </thead>
              <tbody>
                {data.images.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="icon-tile tile-aqua"><Icon name="layers" size={16} /></span>
                        <div className="min-w-0">
                          <p className="truncate font-mono text-[13px] text-ink-primary">{i.name}</p>
                          <p className="text-[11px] text-ink-faint">{i.id.slice(0, 12)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-ink-muted">{i.size}</td>
                    <td className="text-xs text-ink-faint">{i.created}</td>
                    <td className="col-actions">
                      <button onClick={() => removeImage(i.id)} className="btn-icon-danger" title="Remove">
                        <Icon name="trash" size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {data.images.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-ink-faint">No images</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Volumes */}
        {tab === 'volumes' && (
          <div className="table-panel">
            <table className="tbl">
              <thead>
                <tr><th>Volume</th><th>Driver</th><th className="text-right">Actions</th></tr>
              </thead>
              <tbody>
                {data.volumes.map((v) => (
                  <tr key={v.name}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="icon-tile tile-violet"><Icon name="disk" size={16} /></span>
                        <span className="truncate font-mono text-[13px] text-ink-primary">{v.name}</span>
                      </div>
                    </td>
                    <td className="text-ink-muted">{v.driver}</td>
                    <td className="col-actions">
                      <button onClick={() => removeVolume(v.name)} className="btn-icon-danger" title="Remove">
                        <Icon name="trash" size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {data.volumes.length === 0 && (
                  <tr><td colSpan={3} className="py-8 text-center text-ink-faint">No volumes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
