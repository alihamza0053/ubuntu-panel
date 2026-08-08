import { useState } from 'react'
import api, { errorMessage } from '../../api/client'
import FolderBrowser from '../../components/FolderBrowser'
import Icon from '../../components/Icon'

/**
 * Upload Portal tab: a public, password-protected page at
 * <project-domain>/onedrivefiles/ where outside people upload files for this
 * project (instead of OneDrive). You set/change the username + password here.
 */
export default function UploadPortalTab({ project, onChanged }) {
  const [username, setUsername] = useState(project.portal_username || '')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const enabled = !!project.portal_username
  const portalUrl = project.domain ? `https://${project.domain}/onedrivefiles/` : null

  async function save() {
    setMsg(''); setBusy(true)
    try {
      const r = await api.put(`/projects/${project.id}/portal-auth`, { username, password })
      setMsg(r.data.detail)
      setPassword('')
      onChanged()
    } catch (err) {
      setMsg(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    if (!window.confirm('Disable the upload portal? The page will stop accepting uploads.')) return
    setMsg('')
    try {
      const r = await api.delete(`/projects/${project.id}/portal-auth`)
      setMsg(r.data.detail)
      setPassword('')
      onChanged()
    } catch (err) {
      setMsg(errorMessage(err))
    }
  }

  return (
    <div className="space-y-4">
      <div className="card max-w-2xl space-y-5">
        <div className="flex items-center gap-3">
          <span className="icon-tile tile-mint"><Icon name="upload" size={17} /></span>
          <div className="min-w-0">
            <h3 className="sec-title">Upload Portal</h3>
            <p className="hint mt-0.5">
              A public page where people upload files for this project. Files land in the project’s{' '}
              <span className="font-mono text-ink-secondary">onedrivefiles/</span> folder; re-uploading the
              same name replaces it.
            </p>
          </div>
        </div>

        {/* Portal URL + status */}
        <div className="surface space-y-2.5 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-ink-dim">Status</span>
            <span className={`badge ${enabled ? 'badge-mint' : 'badge-neutral'}`}>
              <span className={enabled ? 'dot-pulse' : 'dot'} />
              {enabled ? 'enabled' : 'disabled'}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="shrink-0 text-ink-dim">URL</span>
            <span className="min-w-0 text-right">
              {portalUrl ? (
                <a href={portalUrl} target="_blank" rel="noreferrer"
                   className="link inline-flex items-center gap-1 break-all">
                  {portalUrl} <Icon name="external-link" size={12} />
                </a>
              ) : (
                <span className="text-amber-300/90">
                  Assign a domain to this project first (Dashboard tab → Domain)
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Credentials form */}
        <div className="space-y-4">
          <div>
            <label className="label">Username</label>
            <input className="input" placeholder="e.g. supplier" value={username}
              onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
          </div>
          <div>
            <label className="label">
              {enabled ? 'New password (blank keeps current)' : 'Password'}
            </label>
            <input className="input" type="text" placeholder="set a password"
              value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
          </div>
          <p className="hint">
            Share these with the people who should upload. Anyone with the link + credentials can upload.
          </p>
          <div className="flex gap-2">
            <button className="btn-primary" disabled={busy || !username || password.length < 4}
              onClick={save}>
              {busy ? 'Saving…' : enabled ? 'Update credentials' : 'Enable portal'}
            </button>
            {enabled && (
              <button className="btn-secondary" onClick={disable}>Disable</button>
            )}
          </div>
        </div>

        {msg && <p className="break-words text-xs text-ink-muted">{msg}</p>}
      </div>

      {/* Files uploaded via the portal — overview + upload from the panel */}
      <div className="card">
        <div className="mb-4 flex items-center gap-3">
          <span className="icon-tile"><Icon name="folder" size={17} /></span>
          <div className="min-w-0">
            <h3 className="sec-title">Portal files</h3>
            <p className="hint mt-0.5">
              Everything uploaded through the portal lands in{' '}
              <span className="font-mono text-ink-secondary">onedrivefiles/</span>. You can also upload here
              directly (button or drag-and-drop) and open spreadsheets.
            </p>
          </div>
        </div>
        <FolderBrowser
          rootPath={`${project.folder_path}/onedrivefiles`}
          emptyHint="No files uploaded yet"
        />
      </div>
    </div>
  )
}
