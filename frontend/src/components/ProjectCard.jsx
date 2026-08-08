import { Link, useNavigate } from 'react-router-dom'
import api, { errorMessage } from '../api/client'
import Icon from './Icon'
import StatusBadge from './StatusBadge'

function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso + 'Z').toLocaleString()
}

/** One label/value line inside a card's detail list. */
function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-ink-dim">{label}</dt>
      <dd className="min-w-0 truncate text-right text-ink-body">{children}</dd>
    </div>
  )
}

/**
 * Home-page card for one Python project: status, domain, last run,
 * file counts and quick start/stop/restart actions.
 */
export default function ProjectCard({ project, onChanged }) {
  const navigate = useNavigate()

  async function action(name) {
    try {
      await api.post(`/projects/${project.id}/dashboard/${name}`)
      onChanged?.()
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  const liveUrl = project.domain
    ? `http://${project.domain}`
    : `http://${window.location.hostname}:${project.dashboard_port}`

  return (
    <div className="card card-hover">
      {/* Header: name + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="icon-tile tile-mint">
            <Icon name="code" size={18} />
          </span>
          <Link
            to={`/projects/${project.id}`}
            className="truncate text-base font-semibold text-ink-primary transition-colors hover:text-mint-300"
          >
            {project.name}
          </Link>
        </div>
        <span className="flex shrink-0 items-center gap-1.5">
          {project.hidden && (
            <span className="badge badge-neutral" title="Only admins can see this project">
              <Icon name="eye-off" size={12} /> hidden
            </span>
          )}
          <StatusBadge status={project.dashboard_status} />
        </span>
      </div>

      {/* Details */}
      <dl className="mt-4 space-y-2 text-sm">
        <Row label="Dashboard">
          <a href={liveUrl} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1">
            {project.domain || `:${project.dashboard_port}`}
            <Icon name="external-link" size={12} />
          </a>
        </Row>
        <Row label="Last script run">
          <span className="inline-flex items-center gap-1.5">
            {formatTime(project.last_script_run)}
            {project.last_script_status && (
              <Icon
                name={project.last_script_status === 'SUCCESS' ? 'check' : 'x'}
                size={13}
                className={project.last_script_status === 'SUCCESS' ? 'text-mint-400' : 'text-red-400'}
              />
            )}
          </span>
        </Row>
        <Row label="Next scheduled">{formatTime(project.next_scheduled_run)}</Row>
        <Row label="Files">
          {project.file_counts?.code ?? 0} scripts · {project.file_counts?.data ?? 0} data ·{' '}
          {project.file_counts?.dashboard ?? 0} dashboard
        </Row>
      </dl>

      {/* Quick actions */}
      <div className="mt-5 flex flex-wrap gap-2">
        <button className="btn-secondary btn-sm" onClick={() => action('start')}>
          <Icon name="play" size={13} /> Start
        </button>
        <button className="btn-secondary btn-sm" onClick={() => action('stop')}>
          <Icon name="stop" size={13} /> Stop
        </button>
        <button className="btn-secondary btn-sm" onClick={() => action('restart')}>
          <Icon name="refresh" size={13} /> Restart
        </button>
        <button className="btn-secondary btn-sm" onClick={() => navigate(`/projects/${project.id}?tab=scripts`)}>
          <Icon name="terminal" size={13} /> Scripts
        </button>
        <button className="btn-secondary btn-sm" onClick={() => navigate(`/projects/${project.id}?tab=files`)}>
          <Icon name="folder" size={13} /> Files
        </button>
      </div>
    </div>
  )
}
