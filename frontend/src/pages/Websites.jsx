import { useCallback, useEffect, useState } from 'react'
import api, { errorMessage } from '../api/client'
import Icon from '../components/Icon'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import WebsiteCard from '../components/WebsiteCard'
import { useAuth } from '../context/AuthContext'

export default function Websites() {
  const { isAdmin } = useAuth()
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'html', db_name: '' })
  const [error, setError] = useState('')

  const refresh = useCallback(() => {
    api.get('/websites').then((res) => setSites(res.data)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function create(e) {
    e.preventDefault()
    setError('')
    try {
      await api.post('/websites', form)
      setShowModal(false)
      setForm({ name: '', type: 'html', db_name: '' })
      refresh()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function toggleHidden(site) {
    try {
      await api.put(`/websites/${site.id}/hidden`, { hidden: !site.hidden })
      refresh()
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  async function remove(site) {
    const delFiles = window.confirm(
      `Delete website "${site.name}"?\n\nOK = also delete its files\nCancel = keep files (panel entry only)`,
    )
    try {
      await api.delete(`/websites/${site.id}`, { params: { delete_files: delFiles } })
      refresh()
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  return (
    <div>
      <PageHeader
        title="Websites"
        crumbs={[{ label: 'ServerHub', to: '/dashboard' }, { label: 'Websites' }]}
        lead="Static, React, PHP and Python sites — upload a build, link a database, assign a domain."
        actions={
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Icon name="plus" size={14} /> New Website
          </button>
        }
      />

      {loading ? (
        <p className="text-sm text-ink-faint">Loading…</p>
      ) : sites.length === 0 ? (
        <div className="empty">
          <Icon name="globe" size={26} />
          <p>No websites yet — create one, then upload a .zip of your React build, PHP, or static HTML site.</p>
          <button className="btn-primary mt-2" onClick={() => setShowModal(true)}>
            <Icon name="plus" size={14} /> New Website
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sites.map((s) => (
            <WebsiteCard key={s.id} site={s} onDelete={remove}
              onToggleHidden={isAdmin ? toggleHidden : undefined} />
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          as="form"
          onSubmit={create}
          onClose={() => setShowModal(false)}
          title="New Website"
          subtitle="Creates the site folder and, for Python apps, a supervisor entry on a local port."
          footer={
            <>
              <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Create website</button>
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
            <input className="input font-mono" placeholder="site-name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus required />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="html">Static HTML/CSS/JS</option>
              <option value="react">React (build → dist/)</option>
              <option value="php">PHP</option>
              <option value="python">Python (FastAPI/Flask) — upload &amp; run</option>
            </select>
          </div>
          <div>
            <label className="label">Linked database (optional)</label>
            <input className="input font-mono" placeholder="database name" value={form.db_name}
              onChange={(e) => setForm({ ...form, db_name: e.target.value })} />
          </div>
        </Modal>
      )}
    </div>
  )
}
