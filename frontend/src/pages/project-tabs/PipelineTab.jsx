import { useCallback, useEffect, useState } from 'react'
import api, { errorMessage } from '../../api/client'
import Icon from '../../components/Icon'
import LiveLog from '../../components/LiveLog'
import StatusBadge from '../../components/StatusBadge'

// Simple frequency → cron builder (same idea as the per-script scheduler).
const FREQUENCIES = [
  { key: 'daily', label: 'Daily' },
  { key: 'hourly', label: 'Hourly' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'custom', label: 'Custom cron' },
]
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function buildCron(b) {
  switch (b.frequency) {
    case 'hourly': return `${b.minute} * * * *`
    case 'daily': return `${b.minute} ${b.hour} * * *`
    case 'weekly': return `${b.minute} ${b.hour} * * ${b.weekday}`
    case 'custom': return b.custom
    default: return '0 6 * * *'
  }
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

/**
 * Pipeline tab: run ALL code/ scripts in order, mark each pass/fail (red),
 * then restart the dashboard. Plus a cron schedule for the whole pipeline.
 */
export default function PipelineTab({ project }) {
  const [info, setInfo] = useState(null)
  const [builder, setBuilder] = useState({
    frequency: 'daily', minute: 0, hour: 6, weekday: 1, custom: '0 6 * * *',
  })
  const [active, setActive] = useState(false)
  const [runWs, setRunWs] = useState(null)
  const [msg, setMsg] = useState('')

  const refresh = useCallback(() => {
    api.get(`/projects/${project.id}/pipeline`).then((res) => {
      setInfo(res.data)
      setActive(res.data.is_active)
      if (res.data.cron_expression) {
        setBuilder((b) => ({ ...b, frequency: 'custom', custom: res.data.cron_expression }))
      }
    })
  }, [project.id])

  useEffect(() => { refresh() }, [refresh])

  // Poll the last run while a pipeline is streaming so the table updates
  useEffect(() => {
    if (!runWs) return
    const t = setInterval(refresh, 3000)
    return () => clearInterval(t)
  }, [runWs, refresh])

  const cron = buildCron(builder)

  function runNow() {
    setRunWs(null)
    setTimeout(() => setRunWs(`/ws/pipeline/${project.id}/run`), 0)
  }

  async function stopNow() {
    try {
      const res = await api.post(`/projects/${project.id}/stop-pipeline`)
      setMsg(res.data.detail)
      setRunWs(null)
      setTimeout(refresh, 1000)   // let the run wind down, then refresh status
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  async function saveSchedule() {
    setMsg('')
    try {
      await api.put(`/projects/${project.id}/pipeline`, {
        cron_expression: cron,
        is_active: active,
      })
      setMsg('Schedule saved ✓')
      refresh()
    } catch (err) {
      setMsg(errorMessage(err))
    }
  }

  // Quickly turn the schedule on/off without changing the cron
  async function setActiveState(next) {
    setMsg('')
    try {
      await api.put(`/projects/${project.id}/pipeline`, {
        cron_expression: info?.cron_expression || cron,
        is_active: next,
      })
      setActive(next)
      setMsg(next ? 'Schedule enabled ✓' : 'Schedule stopped ✓')
      refresh()
    } catch (err) {
      setMsg(errorMessage(err))
    }
  }

  async function deleteSchedule() {
    if (!window.confirm('Delete this pipeline schedule? (the pipeline can still be run manually)')) return
    setMsg('')
    try {
      await api.delete(`/projects/${project.id}/pipeline`)
      setMsg('Schedule deleted ✓')
      refresh()
    } catch (err) {
      setMsg(errorMessage(err))
    }
  }

  const lastRun = info?.last_run
  const scheduled = !!info?.cron_expression
  // Running if we're locally streaming, or the latest run is still RUNNING
  const running = !!runWs || lastRun?.status === 'RUNNING'
  const msgOk = msg.includes('✓')

  return (
    <div className="space-y-4">
      {/* Run-all panel */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="sec-title">Project Pipeline</h3>
          <span className="hint max-w-xl">
            Runs all {info?.scripts?.length ?? 0} code/ script(s) in order, retries any that fail
            at the end, then restarts the dashboard.
          </span>
          <div className="ml-auto flex gap-2">
            {running && (
              <button className="btn-danger btn-sm" onClick={stopNow}>
                <Icon name="stop" size={13} /> Stop
              </button>
            )}
            <button className="btn-primary btn-sm" onClick={runNow} disabled={running}>
              <Icon name="play" size={13} />
              {running ? 'Running…' : 'Run All Now'}
            </button>
          </div>
        </div>

        {/* Ordered script list */}
        {info?.scripts?.length > 0 && (
          <ol className="mt-4 space-y-1 text-sm">
            {info.scripts.map((s, i) => (
              <li key={s} className="flex items-center gap-3 rounded-lg px-1 py-1
                                     transition-colors hover:bg-mint-400/[0.04]">
                <span className="w-6 shrink-0 text-right font-mono text-xs text-ink-faint">{i + 1}</span>
                <span className="truncate font-mono text-[13px] text-ink-body">{s}</span>
              </li>
            ))}
          </ol>
        )}
        <p className="hint mt-3">
          Scripts run in filename order — prefix with 01_, 02_, … to control the sequence.
        </p>

        <LiveLog path={runWs} onClose={refresh} />
      </div>

      {/* Last run results */}
      <div className="card">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h3 className="sec-title">Last Run</h3>
          {lastRun && <StatusBadge status={lastRun.status} />}
          {lastRun && (
            <span className="text-xs text-ink-faint">
              {fmt(lastRun.started_at + 'Z')} → {lastRun.finished_at ? fmt(lastRun.finished_at + 'Z') : 'running…'}
            </span>
          )}
        </div>

        {!lastRun ? (
          <div className="empty">
            <Icon name="activity" size={26} />
            <p>No runs yet.</p>
          </div>
        ) : (
          <>
            <div className="table-panel">
              <table className="tbl">
                <thead>
                  <tr><th>#</th><th>Script</th><th>Result</th><th className="text-right">Finished</th></tr>
                </thead>
                <tbody>
                  {lastRun.results.map((r, i) => (
                    <tr key={r.filename}>
                      <td className="w-px font-mono text-xs text-ink-faint">{i + 1}</td>
                      <td className="font-mono text-[13px] text-ink-secondary">{r.filename}</td>
                      <td>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`badge ${r.status === 'SUCCESS' ? 'badge-mint' : 'badge-red'}`}>
                            <span className="dot" />
                            {r.status === 'SUCCESS' ? 'OK' : `FAILED (exit ${r.exit_code})`}
                          </span>
                          {r.retried && (
                            <span className="badge badge-neutral"
                              title={`Re-run at the end (${r.attempts} attempts)`}>
                              <Icon name="refresh" size={11} />
                              {r.status === 'SUCCESS' ? 'recovered on retry' : 'retried'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-right text-xs text-ink-faint">
                        {fmt(r.finished + 'Z')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              Dashboard restarted: {lastRun.dashboard_restarted
                ? <span className="text-mint-300">yes</span>
                : <span className="text-ink-faint">no</span>}
            </p>
          </>
        )}
      </div>

      {/* Schedule the whole pipeline */}
      <div className="card">
        <h3 className="sec-title mb-4">Schedule the Pipeline</h3>
        {msg && (
          <p className={`mb-3 flex items-center gap-1.5 text-sm ${msgOk ? 'text-mint-300' : 'text-red-400'}`}>
            <Icon name={msgOk ? 'check' : 'alert'} size={14} />
            {msg.replace(' ✓', '')}
          </p>
        )}

        {/* Current schedule status + stop/delete */}
        <div className="surface mb-5 flex flex-wrap items-center gap-3">
          {scheduled ? (
            <>
              <span className={`badge ${info.is_active ? 'badge-mint' : 'badge-neutral'}`}>
                <span className={info.is_active ? 'dot-pulse' : 'dot'} />
                {info.is_active ? 'Scheduled (active)' : 'Scheduled (stopped)'}
              </span>
              <code className="rounded bg-panel-raised px-2 py-1 font-mono text-xs text-mint-300">
                {info.cron_expression}
              </code>
              {info.is_active && info.next_run && (
                <span className="text-xs text-ink-faint">next run: {fmt(info.next_run)}</span>
              )}
              <div className="ml-auto flex gap-2">
                {info.is_active ? (
                  <button className="btn-secondary btn-sm" onClick={() => setActiveState(false)}>
                    <Icon name="pause" size={13} /> Stop
                  </button>
                ) : (
                  <button className="btn-secondary btn-sm" onClick={() => setActiveState(true)}>
                    <Icon name="play" size={13} /> Enable
                  </button>
                )}
                <button className="btn-icon-danger" onClick={deleteSchedule} title="Delete schedule">
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </>
          ) : (
            <span className="text-sm text-ink-faint">No schedule yet — set one below.</span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Frequency</label>
            <select className="input" value={builder.frequency}
              onChange={(e) => setBuilder({ ...builder, frequency: e.target.value })}>
              {FREQUENCIES.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
          {['hourly', 'daily', 'weekly'].includes(builder.frequency) && (
            <div>
              <label className="label">Minute</label>
              <input type="number" min="0" max="59" className="input" value={builder.minute}
                onChange={(e) => setBuilder({ ...builder, minute: e.target.value })} />
            </div>
          )}
          {['daily', 'weekly'].includes(builder.frequency) && (
            <div>
              <label className="label">Hour (0–23)</label>
              <input type="number" min="0" max="23" className="input" value={builder.hour}
                onChange={(e) => setBuilder({ ...builder, hour: e.target.value })} />
            </div>
          )}
          {builder.frequency === 'weekly' && (
            <div>
              <label className="label">Day of week</label>
              <select className="input" value={builder.weekday}
                onChange={(e) => setBuilder({ ...builder, weekday: e.target.value })}>
                {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </div>
          )}
          {builder.frequency === 'custom' && (
            <div className="sm:col-span-2">
              <label className="label">Cron expression</label>
              <input className="input font-mono" value={builder.custom}
                onChange={(e) => setBuilder({ ...builder, custom: e.target.value })} placeholder="0 6 * * *" />
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setActive((v) => !v)}
            className={`toggle ${active ? 'toggle-on' : ''}`}
            aria-pressed={active}
            aria-label="Schedule active"
          />
          <span className="text-sm text-ink-body">Active</span>
          <span className="ml-2 text-sm text-ink-dim">cron:</span>
          <code className="rounded bg-panel-raised px-2 py-1 font-mono text-xs text-mint-300">{cron}</code>
          {info?.next_run && (
            <span className="text-xs text-ink-faint">next run: {fmt(info.next_run)}</span>
          )}
          <button className="btn-primary ml-auto" onClick={saveSchedule}>Save schedule</button>
        </div>
      </div>
    </div>
  )
}
