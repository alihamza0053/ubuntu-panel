import { useCallback, useEffect, useState } from 'react'
import api, { errorMessage } from '../api/client'
import Icon from '../components/Icon'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'

/**
 * Proxies: expose any local service (a Docker container, or a uvicorn/Flask/
 * Node app on 127.0.0.1:PORT) on a domain with SSL. The panel writes the nginx
 * reverse-proxy block; you keep running the service however you like.
 */
export default function Proxies() {
  const [proxies, setProxies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', upstream_port: '' })
  const [error, setError] = useState('')

  const refresh = useCallback(() => {
    api.get('/proxies').then((res) => setProxies(res.data)).finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function create(e) {
    e.preventDefault()
    setError('')
    try {
      await api.post('/proxies', {
        name: form.name,
        upstream_port: parseInt(form.upstream_port, 10),
      })
      setShowModal(false)
      setForm({ name: '', upstream_port: '' })
      refresh()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function remove(p) {
    if (!window.confirm(`Remove proxy "${p.name}"? (your service keeps running; only the domain mapping is removed)`)) return
    try {
      await api.delete(`/proxies/${p.id}`)
      refresh()
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  return (
    <div>
      <PageHeader
        title="Proxies"
        crumbs={[{ label: 'ServerHub', to: '/dashboard' }, { label: 'Proxies' }]}
        lead="Put a domain + SSL in front of any local service (Docker container, uvicorn, Flask, Node…)."
        actions={
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Icon name="plus" size={14} /> New Proxy
          </button>
        }
      />

      {loading ? (
        <p className="text-sm text-ink-faint">Loading…</p>
      ) : proxies.length === 0 ? (
        <div className="empty">
          <Icon name="shuffle" size={26} />
          <p className="max-w-md">
            No proxies yet. Run your app on a localhost port (e.g. a Docker container on{' '}
            <span className="font-mono text-ink-secondary">127.0.0.1:9100</span>), then create a proxy
            pointing at that port.
          </p>
          <button className="btn-primary mt-2" onClick={() => setShowModal(true)}>
            <Icon name="plus" size={14} /> New Proxy
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {proxies.map((p) => <ProxyCard key={p.id} proxy={p} onChanged={refresh} onDelete={remove} />)}
        </div>
      )}

      {showModal && (
        <Modal
          as="form"
          onSubmit={create}
          onClose={() => setShowModal(false)}
          title="New Proxy"
          subtitle="Maps a domain onto a service already listening on localhost."
          footer={
            <>
              <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Create proxy</button>
            </>
          }
        >
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5
                            text-sm text-red-300">
              <Icon name="alert" size={15} className="mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <div>
            <label className="label">Name</label>
            <input className="input font-mono" placeholder="browser-automation" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus required />
          </div>
          <div>
            <label className="label">Local port (127.0.0.1)</label>
            <input className="input font-mono" type="number" placeholder="9100" value={form.upstream_port}
              onChange={(e) => setForm({ ...form, upstream_port: e.target.value })} required />
            <p className="hint mt-1.5">
              The port your service listens on locally. Bind your app to 127.0.0.1, not 0.0.0.0.
            </p>
          </div>
        </Modal>
      )}
    </div>
  )
}

function ProxyCard({ proxy, onChanged, onDelete }) {
  const [domain, setDomain] = useState(proxy.domain || '')
  const [msg, setMsg] = useState('')

  async function assignDomain() {
    setMsg('')
    try {
      const r = await api.post(`/proxies/${proxy.id}/assign-domain`, { domain })
      setMsg(r.data.detail)
      onChanged()
    } catch (err) {
      setMsg(errorMessage(err))
    }
  }

  async function requestSsl() {
    setMsg('')
    try {
      const r = await api.post(`/proxies/${proxy.id}/ssl`)
      setMsg(r.data.detail)
    } catch (err) {
      setMsg(errorMessage(err))
    }
  }

  return (
    <div className="card card-hover space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="icon-tile tile-aqua"><Icon name="shuffle" size={18} /></span>
          <span className="truncate text-base font-semibold text-ink-primary">{proxy.name}</span>
        </div>
        <span className={`badge ${proxy.live ? 'badge-mint' : 'badge-neutral'}`}>
          <span className={proxy.live ? 'dot-pulse' : 'dot'} />
          {proxy.live ? 'service up' : 'no service'}
        </span>
      </div>

      <dl className="space-y-2 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-dim">Upstream</dt>
          <dd className="font-mono text-[13px] text-ink-body">127.0.0.1:{proxy.upstream_port}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-dim">URL</dt>
          <dd className="min-w-0 truncate text-right">
            {proxy.domain ? (
              <a href={`http://${proxy.domain}`} target="_blank" rel="noreferrer"
                 className="link inline-flex items-center gap-1">
                {proxy.domain} <Icon name="external-link" size={12} />
              </a>
            ) : <span className="text-ink-faint">no domain yet</span>}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <input className="input max-w-[11rem] py-1.5 text-[13px]" placeholder="app.example.com"
          value={domain} onChange={(e) => setDomain(e.target.value)} />
        <button className="btn-secondary btn-sm" onClick={assignDomain} disabled={!domain}>Domain</button>
        <button className="btn-secondary btn-sm" onClick={requestSsl} disabled={!proxy.domain}>
          <Icon name="lock" size={13} /> SSL
        </button>
      </div>

      {!proxy.live && (
        <p className="flex items-start gap-1.5 text-xs text-amber-300/90">
          <Icon name="alert" size={13} className="mt-0.5" />
          Nothing is listening on this port yet — start your service first, or it’ll return 502.
        </p>
      )}
      {msg && <p className="break-words text-xs text-ink-muted">{msg}</p>}

      <div className="flex justify-end border-t border-panel-border/50 pt-3">
        <button onClick={() => onDelete(proxy)} className="act-danger">remove</button>
      </div>
    </div>
  )
}
