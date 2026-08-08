import { useCallback, useEffect, useState } from 'react'
import api, { errorMessage } from '../../api/client'
import Icon from '../../components/Icon'
import LiveLog from '../../components/LiveLog'
import StatusBadge from '../../components/StatusBadge'

function formatTime(iso) {
  if (!iso) return 'never'
  return new Date(iso + 'Z').toLocaleString()
}

/** Scripts tab: run scripts with live output, view last run logs. */
export default function ScriptsTab({ project, onChanged }) {
  const [scripts, setScripts] = useState([])
  // Per-script expanded panel: { [id]: { mode: 'live' | 'log', content? } }
  const [panels, setPanels] = useState({})

  const refresh = useCallback(() => {
    api.get(`/projects/${project.id}/scripts`).then((res) => setScripts(res.data))
  }, [project.id])

  useEffect(() => {
    refresh()
  }, [refresh])

  // While a live run panel is open, poll so RUNNING/STOPPED status (and the
  // Stop button) stays current.
  useEffect(() => {
    const anyOpen = Object.values(panels).some((p) => p?.mode === 'live' || p?.mode === 'log')
    if (!anyOpen) return
    const t = setInterval(refresh, 3000)
    return () => clearInterval(t)
  }, [panels, refresh])

  function runLive(script) {
    // Open (or re-open) the live stream panel for this script
    setPanels((prev) => ({ ...prev, [script.id]: null }))
    setTimeout(
      () => setPanels((prev) => ({ ...prev, [script.id]: { mode: 'live' } })),
      0,
    )
  }

  async function stopScript(script) {
    try {
      await api.post(`/scripts/${script.id}/stop`)
      refresh()
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  function viewLog(script) {
    // Live-tail the script's log file: shows the running script's output live,
    // or the last run's log when idle. Re-open to re-attach to the latest.
    setPanels((prev) => ({ ...prev, [script.id]: null }))
    setTimeout(
      () => setPanels((prev) => ({ ...prev, [script.id]: { mode: 'log' } })),
      0,
    )
  }

  function closePanel(id) {
    setPanels((prev) => ({ ...prev, [id]: undefined }))
  }

  if (scripts.length === 0) {
    return (
      <div className="empty">
        <Icon name="code" size={26} />
        <p>No scripts yet — upload .py files to code/ or allscripts/ on the Files tab.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {scripts.map((script) => {
        const panel = panels[script.id]
        const running = script.last_status === 'RUNNING'
        return (
          <div key={script.id} className="card">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`icon-tile ${running ? 'tile-mint' : ''}`}>
                <Icon name="file-text" size={16} />
              </span>
              <div className="min-w-0">
                <p className="truncate font-mono text-[13px] text-ink-primary">
                  <span className="text-ink-faint">{script.folder}/</span>{script.filename}
                </p>
                <p className="text-[11px] text-ink-faint">last run: {formatTime(script.last_run)}</p>
              </div>
              {script.last_status && <StatusBadge status={script.last_status} />}

              <div className="ml-auto flex gap-2">
                {running ? (
                  <button className="btn-danger btn-sm" onClick={() => stopScript(script)}>
                    <Icon name="stop" size={13} /> Stop
                  </button>
                ) : (
                  <button className="btn-primary btn-sm" onClick={() => runLive(script)}>
                    <Icon name="play" size={13} /> Run Now
                  </button>
                )}
                <button className="btn-secondary btn-sm" onClick={() => viewLog(script)}>
                  <Icon name="scroll" size={13} /> View Log
                </button>
                {panel && (
                  <button className="btn-icon" onClick={() => closePanel(script.id)} title="Close panel">
                    <Icon name="x" size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Expandable panel: live stream or last log */}
            {panel?.mode === 'live' && (
              <LiveLog
                path={`/ws/script/${script.id}/run`}
                onClose={() => {
                  refresh()
                  onChanged?.()
                }}
              />
            )}
            {panel?.mode === 'log' && (
              <LiveLog path={`/ws/script/${script.id}/logs`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
