import { Link } from 'react-router-dom'
import Icon from './Icon'

/**
 * Standard page header: large semibold title, an optional breadcrumb of mint
 * links joined by small muted chevrons (last crumb muted), an optional lead
 * paragraph, and action buttons pinned right.
 *
 *   <PageHeader
 *     title="Projects"
 *     crumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Projects' }]}
 *     lead="Python workspaces managed by the panel."
 *     actions={<button className="btn-primary">…</button>}
 *   />
 */
export default function PageHeader({ title, crumbs, lead, actions, badge }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {crumbs?.length > 0 && (
          <nav className="crumbs mb-2">
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1
              return (
                <span key={`${c.label}-${i}`} className="contents">
                  {i > 0 && (
                    <Icon name="chevron-right" size={12} className="crumb-sep" />
                  )}
                  {last || !c.to ? (
                    <span className="crumb-current">{c.label}</span>
                  ) : (
                    <Link to={c.to} className="crumb">{c.label}</Link>
                  )}
                </span>
              )
            })}
          </nav>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <h2 className="page-title">{title}</h2>
          {badge}
        </div>

        {lead && <p className="mt-1.5 max-w-3xl text-sm text-ink-muted">{lead}</p>}
      </div>

      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
