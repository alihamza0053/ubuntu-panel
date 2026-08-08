import { useCallback, useEffect, useMemo, useState } from 'react'
import api, { errorMessage } from '../../api/client'
import Icon from '../../components/Icon'
import LiveLog from '../../components/LiveLog'

/**
 * Packages tab: pip-install Python libraries into the same interpreter that
 * runs this project's scripts — so a `ModuleNotFoundError: No module named 'X'`
 * is fixed by typing `X` and clicking Install.
 */
export default function PackagesTab({ project }) {
  const [pkgs, setPkgs] = useState([])
  const [pyver, setPyver] = useState('')
  const [loading, setLoading] = useState(true)
  const [spec, setSpec] = useState('')
  const [installWs, setInstallWs] = useState(null)
  const [query, setQuery] = useState('')
  const [err, setErr] = useState('')

  const refresh = useCallback(() => {
    setLoading(true)
    api.get(`/projects/${project.id}/packages`)
      .then((res) => { setPkgs(res.data.packages || []); setPyver(res.data.python || '') })
      .catch((e) => setErr(errorMessage(e)))
      .finally(() => setLoading(false))
  }, [project.id])

  useEffect(() => { refresh() }, [refresh])

  function install(e) {
    e?.preventDefault()
    if (!spec.trim()) return
    const path = `/ws/projects/${project.id}/pip-install?spec=${encodeURIComponent(spec.trim())}`
    setInstallWs(null)
    setTimeout(() => setInstallWs(path), 0)
  }

  function installPlaywrightBrowsers() {
    const path = `/ws/projects/${project.id}/playwright-install`
    setInstallWs(null)
    setTimeout(() => setInstallWs(path), 0)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? pkgs.filter((p) => p.name.toLowerCase().includes(q)) : pkgs
  }, [pkgs, query])

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center gap-3">
          <span className="icon-tile tile-mint"><Icon name="package" size={17} /></span>
          <div className="min-w-0">
            <h3 className="sec-title">Install a Python package</h3>
            <p className="hint mt-0.5">
              Installs into the scripts' Python ({pyver || 'python3'}). When a script fails with
              <span className="font-mono text-ink-secondary"> ModuleNotFoundError: No module named 'X'</span>, type
              <span className="font-mono text-ink-secondary"> X</span> here and Install.
            </p>
          </div>
        </div>

        <form onSubmit={install} className="mt-4 flex flex-wrap gap-2">
          <input
            className="input min-w-[16rem] flex-1 font-mono text-[13px]"
            placeholder="e.g. playwright   or   requests==2.31.0   (space-separate several)"
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={!spec.trim()}>
            <Icon name="download" size={14} /> Install
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="hint">
            Packages are shared by all projects' scripts (same interpreter). Using Playwright?
            After installing it, download its browser:
          </span>
          <button type="button" className="btn-secondary btn-sm" onClick={installPlaywrightBrowsers}>
            <Icon name="globe" size={13} /> Install Playwright browsers
          </button>
        </div>

        {installWs && <LiveLog path={installWs} onClose={refresh} />}
      </div>

      <div className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="sec-title">
            Installed packages
            {!loading && <span className="tab-count ml-1">{pkgs.length}</span>}
          </h3>
          <div className="relative max-w-xs flex-1">
            <Icon name="search" size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              className="input pl-9"
              placeholder="filter…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {err && (
          <p className="mb-3 flex items-center gap-1.5 text-sm text-red-400">
            <Icon name="alert" size={14} /> {err}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-ink-faint">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <Icon name="package" size={26} />
            <p>No packages match “{query}”.</p>
          </div>
        ) : (
          <div className="table-panel">
            <table className="tbl">
              <thead>
                <tr><th>Package</th><th className="text-right">Version</th></tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.name}>
                    <td className="font-mono text-[13px] text-ink-secondary">{p.name}</td>
                    <td className="text-right font-mono text-[13px] text-ink-muted">{p.version}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
