import { useCallback, useEffect, useState } from 'react'
import api, { errorMessage } from '../api/client'
import Icon from '../components/Icon'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import ProjectCard from '../components/ProjectCard'
import { useAuth } from '../context/AuthContext'

export default function Projects() {
  const { isAdmin } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => {
    api
      .get('/projects', { params: { with_status: true } })
      .then((res) => setProjects(res.data))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function createProject(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api.post('/projects', { name: newName })
      setShowModal(false)
      setNewName('')
      refresh()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function toggleHidden(project) {
    try {
      await api.put(`/projects/${project.id}/hidden`, { hidden: !project.hidden })
      refresh()
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  async function deleteProject(project) {
    const deleteFiles = window.confirm(
      `Delete project "${project.name}"?\n\nOK = also delete its files on disk\nCancel = keep going to next question`,
    )
    if (!deleteFiles && !window.confirm(`Delete only the panel entry for "${project.name}" (files stay on disk)?`)) {
      return
    }
    try {
      await api.delete(`/projects/${project.id}`, { params: { delete_files: deleteFiles } })
      refresh()
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  return (
    <div>
      <PageHeader
        title="Python Projects"
        crumbs={[{ label: 'ServerHub', to: '/dashboard' }, { label: 'Projects' }]}
        lead="Each project gets a standard workspace — code, allscripts, data and dashboard folders — plus a Streamlit service."
        actions={
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Icon name="plus" size={14} /> New Project
          </button>
        }
      />

      {loading ? (
        <p className="text-sm text-ink-faint">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="empty">
          <Icon name="code" size={26} />
          <p>No projects yet — create one to get the standard workspace folders.</p>
          <button className="btn-primary mt-2" onClick={() => setShowModal(true)}>
            <Icon name="plus" size={14} /> New Project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <div key={p.id} className="group relative">
              <ProjectCard project={p} onChanged={refresh} />
              <div className="absolute -top-2 right-3 flex items-center gap-0.5 opacity-0 transition-opacity
                              duration-150 focus-within:opacity-100 group-hover:opacity-100">
                {isAdmin && (
                  <button
                    onClick={() => toggleHidden(p)}
                    className="btn-icon h-7 w-7 border-panel-border/80 bg-panel-card"
                    title={p.hidden ? 'Hidden from non-admins — click to unhide' : 'Hide from non-admins'}
                  >
                    <Icon name={p.hidden ? 'eye-off' : 'eye'} size={14} />
                  </button>
                )}
                <button
                  onClick={() => deleteProject(p)}
                  className="btn-icon-danger h-7 w-7 border-panel-border/80 bg-panel-card"
                  title="Delete project"
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Project modal */}
      {showModal && (
        <Modal
          as="form"
          onSubmit={createProject}
          onClose={() => setShowModal(false)}
          title="New Project"
          subtitle="Creates /srv/projects/<name>/ with code, allscripts, data and dashboard folders, plus a supervisor entry for its Streamlit dashboard."
          footer={
            <>
              <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? 'Creating…' : 'Create project'}
              </button>
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
            <label className="label">Project name</label>
            <input
              className="input font-mono"
              placeholder="project-name (letters, numbers, - _)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              required
            />
          </div>
        </Modal>
      )}
    </div>
  )
}
