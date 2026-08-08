import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import ProjectCard from '../components/ProjectCard'
import WebsiteCard from '../components/WebsiteCard'
import { useAuth } from '../context/AuthContext'

/** Small stat widget (CPU / RAM / Disk / Uptime). */
function StatWidget({ label, value, sub, percent, icon }) {
  // Mint is the resting state; saturated colour is reserved for pressure.
  const barColor =
    percent == null ? '' : percent > 90 ? 'bg-red-500' : percent > 70 ? 'bg-amber-400' : 'bg-mint'
  return (
    <div className="card card-hover">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-dim">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-ink-primary">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-ink-faint">{sub}</p>}
        </div>
        <span className="icon-tile tile-mint"><Icon name={icon} size={17} /></span>
      </div>
      {percent != null && (
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-panel-raised">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${barColor}`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

/** Section heading with a mint "manage" link on the right. */
function SectionBar({ title, to, cta }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="sec-title">{title}</h3>
      <Link to={to} className="link inline-flex items-center gap-1 text-sm">
        {cta} <Icon name="chevron-right" size={13} />
      </Link>
    </div>
  )
}

export default function Home() {
  const { can } = useAuth()
  const [stats, setStats] = useState(null)
  const [projects, setProjects] = useState([])
  const [websites, setWebsites] = useState([])
  const [loading, setLoading] = useState(true)

  // Users without the projects/websites tabs must not see (or fetch) them here.
  const showProjects = can('projects')
  const showWebsites = can('websites')

  const refresh = useCallback(() => {
    // with_status=true asks the backend for live supervisor states
    if (showProjects) {
      api.get('/projects', { params: { with_status: true } }).then((res) => setProjects(res.data))
    }
    api.get('/server/stats').then((res) => setStats(res.data)).catch(() => {})
  }, [showProjects])

  useEffect(() => {
    Promise.allSettled([
      showProjects &&
        api.get('/projects', { params: { with_status: true } }).then((res) => setProjects(res.data)),
      showWebsites && api.get('/websites').then((res) => setWebsites(res.data)),
      api.get('/server/stats').then((res) => setStats(res.data)),
    ]).finally(() => setLoading(false))

    const interval = setInterval(() => {
      api.get('/server/stats').then((res) => setStats(res.data)).catch(() => {})
    }, 10000) // refresh stats every 10s
    return () => clearInterval(interval)
  }, [showProjects, showWebsites])

  return (
    <div>
      <PageHeader
        title="Dashboard"
        crumbs={[{ label: 'ServerHub' }, { label: 'Dashboard' }]}
        lead="Live server health, plus every project and website the panel manages."
      />

      {/* Server stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatWidget
          label="CPU"
          icon="cpu"
          value={stats ? `${stats.cpu_percent}%` : '…'}
          percent={stats?.cpu_percent}
        />
        <StatWidget
          label="RAM"
          icon="chip"
          value={stats ? `${stats.memory.percent}%` : '…'}
          sub={stats && `${stats.memory.used_gb} / ${stats.memory.total_gb} GB`}
          percent={stats?.memory.percent}
        />
        <StatWidget
          label="Disk"
          icon="disk"
          value={stats ? `${stats.disk.percent}%` : '…'}
          sub={stats && `${stats.disk.used_gb} / ${stats.disk.total_gb} GB`}
          percent={stats?.disk.percent}
        />
        <StatWidget label="Uptime" icon="clock" value={stats ? stats.uptime.human : '…'} />
      </div>

      {/* Project cards — only for users with the projects tab */}
      {showProjects && (
        <section className="mt-8">
          <SectionBar title="Python Projects" to="/projects" cta="Manage projects" />
          {loading ? (
            <p className="text-sm text-ink-faint">Loading…</p>
          ) : projects.length === 0 ? (
            <div className="empty">
              <Icon name="code" size={26} />
              <p>No projects yet.</p>
              <Link to="/projects" className="link text-sm">Create your first project</Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} onChanged={refresh} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Website cards — only for users with the websites tab */}
      {showWebsites && (
        <section className="mt-8">
          <SectionBar title="Websites" to="/websites" cta="Manage websites" />
          {websites.length === 0 ? (
            <div className="empty">
              <Icon name="globe" size={26} />
              <p>No websites yet.</p>
              <Link to="/websites" className="link text-sm">Create one</Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {websites.map((s) => <WebsiteCard key={s.id} site={s} />)}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
