import { useCallback, useEffect, useState } from 'react'
import api, { errorMessage } from '../../api/client'
import Icon from '../../components/Icon'

/** Visual cron builder → cron expression. */
const FREQUENCIES = [
  { key: 'minutely', label: 'Every N minutes' },
  { key: 'hourly', label: 'Hourly' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'custom', label: 'Custom expression' },
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function buildCron(b) {
  const m = String(b.minute).padStart(1, '0')
  const h = String(b.hour)
  switch (b.frequency) {
    case 'minutely': return `*/${b.interval} * * * *`
    case 'hourly': return `${m} * * * *`
    case 'daily': return `${m} ${h} * * *`
    case 'weekly': return `${m} ${h} * * ${b.weekday}`
    case 'monthly': return `${m} ${h} ${b.day} * *`
    case 'custom': return b.custom
    default: return '0 * * * *'
  }
}

function formatTime(iso) {
  if (!iso) return '—'
  // next_run from APScheduler is tz-aware ISO; last_run is naive UTC
  return new Date(iso).toLocaleString()
}

/** Scheduler tab: cron builder + list of this project's schedules. */
export default function SchedulerTab({ project }) {
  const [scripts, setScripts] = useState([])
  const [schedules, setSchedules] = useState([])
  const [builder, setBuilder] = useState({
    scriptId: '', frequency: 'daily', interval: 5, minute: 0, hour: 9, weekday: 1, day: 1, custom: '0 9 * * *',
  })
  const [error, setError] = useState('')

  const refresh = useCallback(() => {
    api.get(`/projects/${project.id}/scripts`).then((res) => setScripts(res.data))
    api.get('/schedules').then((res) => {
      const ids = new Set()
      api.get(`/projects/${project.id}/scripts`).then((r) => {
        r.data.forEach((s) => ids.add(s.id))
        setSchedules(res.data.filter((sc) => ids.has(sc.script_id)))
      })
    })
  }, [project.id])

  useEffect(() => {
    refresh()
  }, [refresh])

  const cron = buildCron(builder)

  async function create() {
    setError('')
    if (!builder.scriptId) {
      setError('Pick a script first')
      return
    }
    try {
      await api.post('/schedules', {
        script_id: Number(builder.scriptId),
        cron_expression: cron,
        is_active: true,
      })
      refresh()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function toggle(id) {
    await api.post(`/schedules/${id}/toggle`)
    refresh()
  }

  async function remove(id) {
    if (!window.confirm('Delete this schedule?')) return
    await api.delete(`/schedules/${id}`)
    refresh()
  }

  async function stopRun(scriptId) {
    try {
      await api.post(`/scripts/${scriptId}/stop`)
      refresh()
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  return (
    <div className="space-y-4">
      {/* Builder */}
      <div className="card">
        <h3 className="sec-title mb-4">New Schedule</h3>
        {error && (
          <p className="mb-3 flex items-center gap-1.5 text-sm text-red-400">
            <Icon name="alert" size={14} /> {error}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Script</label>
            <select className="input" value={builder.scriptId}
              onChange={(e) => setBuilder({ ...builder, scriptId: e.target.value })}>
              <option value="">— select —</option>
              {scripts.map((s) => <option key={s.id} value={s.id}>{s.folder}/{s.filename}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Frequency</label>
            <select className="input" value={builder.frequency}
              onChange={(e) => setBuilder({ ...builder, frequency: e.target.value })}>
              {FREQUENCIES.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>

          {builder.frequency === 'minutely' && (
            <div>
              <label className="label">Every N minutes</label>
              <input type="number" min="1" max="59" className="input" value={builder.interval}
                onChange={(e) => setBuilder({ ...builder, interval: e.target.value })} />
            </div>
          )}
          {['hourly', 'daily', 'weekly', 'monthly'].includes(builder.frequency) && (
            <div>
              <label className="label">Minute</label>
              <input type="number" min="0" max="59" className="input" value={builder.minute}
                onChange={(e) => setBuilder({ ...builder, minute: e.target.value })} />
            </div>
          )}
          {['daily', 'weekly', 'monthly'].includes(builder.frequency) && (
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
          {builder.frequency === 'monthly' && (
            <div>
              <label className="label">Day of month</label>
              <input type="number" min="1" max="31" className="input" value={builder.day}
                onChange={(e) => setBuilder({ ...builder, day: e.target.value })} />
            </div>
          )}
          {builder.frequency === 'custom' && (
            <div className="sm:col-span-2">
              <label className="label">Cron expression</label>
              <input className="input font-mono" value={builder.custom}
                onChange={(e) => setBuilder({ ...builder, custom: e.target.value })} placeholder="0 9 * * 1-5" />
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="text-sm text-ink-dim">Resulting cron:</span>
          <code className="rounded bg-panel-raised px-2 py-1 font-mono text-xs text-mint-300">{cron}</code>
          <button className="btn-primary ml-auto" onClick={create}>
            <Icon name="plus" size={14} /> Add schedule
          </button>
        </div>
      </div>

      {/* Existing schedules */}
      <div className="card">
        <h3 className="sec-title mb-4">Scheduled Scripts</h3>
        {schedules.length === 0 ? (
          <div className="empty">
            <Icon name="calendar" size={26} />
            <p>No schedules for this project yet.</p>
          </div>
        ) : (
          <div className="table-panel">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Script</th><th>Cron</th><th>Next run</th><th>Last run</th><th>Active</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className={`icon-tile ${s.is_active ? 'tile-mint' : ''}`}>
                          <Icon name="clock" size={16} />
                        </span>
                        <span className="truncate font-mono text-[13px] text-ink-primary">{s.script_name}</span>
                      </div>
                    </td>
                    <td><code className="font-mono text-xs text-ink-muted">{s.cron_expression}</code></td>
                    <td className="whitespace-nowrap text-ink-muted">{formatTime(s.next_run)}</td>
                    <td className="whitespace-nowrap text-ink-muted">
                      {s.last_run ? formatTime(s.last_run + 'Z') : '—'}
                    </td>
                    <td>
                      <button
                        onClick={() => toggle(s.id)}
                        className={`toggle ${s.is_active ? 'toggle-on' : ''}`}
                        aria-pressed={s.is_active}
                        aria-label={s.is_active ? 'Active — click to pause' : 'Paused — click to activate'}
                        title={s.is_active ? 'Active — click to pause' : 'Paused — click to activate'}
                      />
                    </td>
                    <td className="col-actions">
                      <div className="inline-flex items-center gap-1">
                        {s.last_status === 'RUNNING' && (
                          <button onClick={() => stopRun(s.script_id)} className="btn-icon" title="Stop run">
                            <Icon name="stop" size={14} />
                          </button>
                        )}
                        <button onClick={() => remove(s.id)} className="btn-icon-danger" title="Delete schedule">
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </td>
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
