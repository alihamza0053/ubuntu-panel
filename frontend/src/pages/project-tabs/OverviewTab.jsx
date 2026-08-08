import Icon from '../../components/Icon'
import StatusBadge from '../../components/StatusBadge'

function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso + 'Z').toLocaleString()
}

function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-panel-border/40 py-2 last:border-0">
      <dt className="shrink-0 text-ink-dim">{label}</dt>
      <dd className="min-w-0 break-all text-right text-ink-body">{children}</dd>
    </div>
  )
}

// Tint per project folder so the list reads at a glance.
const FOLDER_TILE = {
  code: 'tile-mint',
  allscripts: 'tile-aqua',
  data: 'tile-amber',
  dashboard: 'tile-violet',
}

/** Read-only summary of the whole project. */
export default function OverviewTab({ project, files }) {
  const liveUrl = project.domain
    ? `http://${project.domain}`
    : `http://${window.location.hostname}:${project.dashboard_port}`

  const rows = [
    ['Folder', project.folder_path],
    ['Dashboard port', project.dashboard_port],
    ['Domain', project.domain || 'not assigned'],
    ['Created', formatTime(project.created_at)],
    ['Last script run', formatTime(project.last_script_run)],
    ['Last script status', project.last_script_status || '—'],
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card">
        <h3 className="sec-title mb-3">Project Info</h3>
        <dl className="text-sm">
          {rows.map(([label, value]) => (
            <Row key={label} label={label}>{value}</Row>
          ))}
          <Row label="Dashboard status"><StatusBadge status={project.dashboard_status} /></Row>
          <Row label="Live URL">
            <a href={liveUrl} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1">
              {liveUrl} <Icon name="external-link" size={12} />
            </a>
          </Row>
        </dl>
      </div>

      <div className="card">
        <h3 className="sec-title mb-3">Folder Contents</h3>
        {files ? (
          <ul className="space-y-1.5">
            {Object.entries(files.folders).map(([folder, list]) => (
              <li key={folder}
                  className="flex items-center gap-3 rounded-lg px-1 py-1.5 transition-colors hover:bg-mint-400/[0.04]">
                <span className={`icon-tile ${FOLDER_TILE[folder] || ''}`}>
                  <Icon name="folder" size={16} />
                </span>
                <span className="font-mono text-[13px] text-ink-secondary">{folder}/</span>
                <span className="ml-auto text-sm text-ink-muted">
                  {list.length} file{list.length === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-faint">Loading…</p>
        )}
      </div>
    </div>
  )
}
