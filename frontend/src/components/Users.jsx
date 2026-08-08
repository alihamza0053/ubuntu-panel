import { useCallback, useEffect, useState } from 'react'
import api, { errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Icon from './Icon'

/** Admin-only: create panel users and grant per-tab access with checkboxes. */
export default function Users() {
  const { user: me } = useAuth()
  const [catalog, setCatalog] = useState([])     // [{key,label}]
  const [users, setUsers] = useState([])
  const [msg, setMsg] = useState(null)           // {text, error}
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', is_admin: false, permissions: [] })

  const load = useCallback(() => {
    Promise.all([api.get('/auth/permissions'), api.get('/auth/users')])
      .then(([c, u]) => { setCatalog(c.data); setUsers(u.data) })
      .catch((err) => setMsg({ text: errorMessage(err), error: true }))
  }, [])

  useEffect(() => { load() }, [load])

  function toggle(list, key) {
    return list.includes(key) ? list.filter((k) => k !== key) : [...list, key]
  }

  async function createUser(e) {
    e.preventDefault()
    setCreating(true); setMsg(null)
    try {
      await api.post('/auth/users', form)
      setMsg({ text: `User “${form.username}” created` })
      setForm({ username: '', password: '', is_admin: false, permissions: [] })
      load()
    } catch (err) {
      setMsg({ text: errorMessage(err), error: true })
    } finally { setCreating(false) }
  }

  async function patch(u, body) {
    try {
      await api.put(`/auth/users/${u.id}`, body)
      load()
    } catch (err) { setMsg({ text: errorMessage(err), error: true }) }
  }

  async function resetPw(u) {
    const pw = window.prompt(`New password for “${u.username}” (min 8 chars):`, '')
    if (!pw) return
    try {
      await api.post(`/auth/users/${u.id}/password`, { new_password: pw })
      setMsg({ text: `Password reset for ${u.username}` })
    } catch (err) { setMsg({ text: errorMessage(err), error: true }) }
  }

  async function remove(u) {
    if (!window.confirm(`Delete user “${u.username}”?`)) return
    try {
      await api.delete(`/auth/users/${u.id}`)
      load()
    } catch (err) { setMsg({ text: errorMessage(err), error: true }) }
  }

  return (
    <div className="card space-y-5">
      <div>
        <h3 className="sec-title">Users &amp; Access</h3>
        <p className="hint mt-1.5">
          Create users and tick the tabs each one may see. Admins see everything.
        </p>
      </div>

      {msg && (
        <p className={`flex items-start gap-1.5 text-sm ${msg.error ? 'text-red-400' : 'text-mint-300'}`}>
          <Icon name={msg.error ? 'alert' : 'check'} size={14} className="mt-0.5" />
          {msg.text}
        </p>
      )}

      {/* Create user */}
      <form onSubmit={createUser} className="surface space-y-4 p-4">
        <p className="sec-title">Add a user</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Username</label>
            <input className="input" placeholder="username" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="min 8 characters" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-body">
          <input type="checkbox" checked={form.is_admin}
            onChange={(e) => setForm({ ...form, is_admin: e.target.checked })} />
          Administrator (full access + can manage users)
        </label>

        {!form.is_admin && (
          <div>
            <p className="label">Allowed tabs</p>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {catalog.map((c) => (
                <label key={c.key}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm text-ink-body
                             transition-colors hover:bg-panel-raised/50">
                  <input type="checkbox" checked={form.permissions.includes(c.key)}
                    onChange={() => setForm({ ...form, permissions: toggle(form.permissions, c.key) })} />
                  {c.label}
                </label>
              ))}
            </div>
          </div>
        )}

        <button className="btn-primary" disabled={creating}>
          <Icon name="plus" size={14} />
          {creating ? 'Creating…' : 'Create user'}
        </button>
      </form>

      {/* Existing users */}
      <div className="space-y-3">
        {users.map((u) => {
          const self = u.id === me?.id
          return (
            <div key={u.id} className="rounded-card border border-panel-border/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`icon-tile ${u.is_admin ? 'tile-amber' : ''}`}>
                    <Icon name="user" size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink-primary">
                      {u.username}
                      {self && <span className="ml-1.5 text-[10px] text-ink-faint">(you)</span>}
                    </p>
                    <span className={`badge mt-0.5 ${u.is_admin ? 'badge-amber' : 'badge-neutral'}`}>
                      {u.is_admin ? 'admin' : 'user'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs text-ink-muted">
                    <input type="checkbox" checked={u.is_admin} disabled={self}
                      onChange={(e) => patch(u, { is_admin: e.target.checked })} />
                    admin
                  </label>
                  <button className="btn-secondary btn-sm" onClick={() => resetPw(u)}>
                    <Icon name="key" size={13} /> Reset password
                  </button>
                  <button className="btn-icon-danger" title="Delete user"
                    onClick={() => remove(u)} disabled={self}>
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              </div>

              {!u.is_admin && (
                <div className="mt-3 grid grid-cols-2 gap-1 border-t border-panel-border/50 pt-3 sm:grid-cols-4">
                  {catalog.map((c) => (
                    <label key={c.key}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm text-ink-body
                                 transition-colors hover:bg-panel-raised/50">
                      <input type="checkbox" checked={u.permissions.includes(c.key)}
                        onChange={() => patch(u, { permissions: toggle(u.permissions, c.key) })} />
                      {c.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
