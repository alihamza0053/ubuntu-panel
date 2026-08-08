import { Link, useNavigate } from 'react-router-dom'
import Icon from './Icon'

// Per-type tint for the badge and the icon tile. Mint stays reserved for
// state, so site types borrow the neutral / aqua / amber / violet tints.
const TYPE_BADGE = {
  react: 'badge-aqua',
  php: 'badge-violet',
  html: 'badge-amber',
  python: 'badge-mint',
}
const TYPE_TILE = {
  react: 'tile-aqua',
  php: 'tile-violet',
  html: 'tile-amber',
  python: 'tile-mint',
}

/** Home / Websites grid card for one website. */
export default function WebsiteCard({ site, onDelete, onToggleHidden }) {
  const navigate = useNavigate()
  const liveUrl = site.domain ? `http://${site.domain}` : null

  return (
    <div className="card card-hover">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={`icon-tile ${TYPE_TILE[site.type] || ''}`}>
            <Icon name="globe" size={18} />
          </span>
          <Link
            to={`/websites/${site.id}`}
            className="truncate text-base font-semibold text-ink-primary transition-colors hover:text-mint-300"
          >
            {site.name}
          </Link>
        </div>
        <span className="flex shrink-0 items-center gap-1.5">
          {site.hidden && (
            <span className="badge badge-neutral" title="Only admins can see this website">
              <Icon name="eye-off" size={12} /> hidden
            </span>
          )}
          <span className={`badge ${TYPE_BADGE[site.type] || 'badge-neutral'}`}>
            {site.type.toUpperCase()}
          </span>
        </span>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-dim">Domain</dt>
          <dd className="min-w-0 truncate text-right">
            {liveUrl ? (
              <a href={liveUrl} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1">
                {site.domain}
                <Icon name="external-link" size={12} />
              </a>
            ) : <span className="text-ink-faint">not assigned</span>}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-dim">Database</dt>
          <dd className="min-w-0 truncate text-right text-ink-body">{site.db_name || '—'}</dd>
        </div>
        {site.type === 'python' && (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-ink-dim">Service</dt>
            <dd className={site.status === 'RUNNING' ? 'text-mint-300' : 'text-ink-muted'}>
              {site.status || 'STOPPED'}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button className="btn-secondary btn-sm" onClick={() => navigate(`/websites/${site.id}?tab=files`)}>
          <Icon name="folder" size={13} /> Files
        </button>
        {site.type === 'python' && (
          <button className="btn-secondary btn-sm" onClick={() => navigate(`/websites/${site.id}?tab=run`)}>
            <Icon name="play" size={13} /> Run
          </button>
        )}
        <button className="btn-secondary btn-sm" onClick={() => navigate(`/websites/${site.id}?tab=database`)}>
          <Icon name="database" size={13} /> Database
        </button>

        <span className="ml-auto flex items-center gap-1">
          {onToggleHidden && (
            <button
              className="btn-icon"
              onClick={() => onToggleHidden(site)}
              title={site.hidden ? 'Hidden from non-admins — click to unhide' : 'Hide from non-admins'}
            >
              <Icon name={site.hidden ? 'eye-off' : 'eye'} size={15} />
            </button>
          )}
          {onDelete && (
            <button className="btn-icon-danger" onClick={() => onDelete(site)} title="Delete website">
              <Icon name="trash" size={15} />
            </button>
          )}
        </span>
      </div>
    </div>
  )
}
