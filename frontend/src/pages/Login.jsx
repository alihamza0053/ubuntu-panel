import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { errorMessage } from '../api/client'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Already logged in → go straight to the dashboard
  if (user) return <Navigate to="/dashboard" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(username, password)
      navigate('/dashboard')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm animate-fade-up space-y-5 p-7">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-tile bg-mint text-lg
                           font-black text-onmint shadow-rail">
            S
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink-primary">ServerHub</h1>
          <p className="mt-1 text-sm text-ink-muted">Sign in to manage your server</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5
                          text-sm text-red-300">
            <Icon name="alert" size={15} className="mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="label">Username</label>
          <input
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Signing in…' : 'Sign in'}
          {!busy && <Icon name="chevron-right" size={14} />}
        </button>

        <p className="text-center text-[11px] uppercase tracking-[0.1em] text-ink-faint">
          VPS control panel
        </p>
      </form>
    </div>
  )
}
