// Status pill for dashboard / script / service states. Every status leads with
// a coloured dot; RUNNING pulses a mint halo to read as live.
const STYLES = {
  RUNNING: 'badge-mint',
  SUCCESS: 'badge-mint',
  READY: 'badge-mint',
  BUILDING: 'badge-amber',
  STOPPED: 'badge-neutral',
  MISSING: 'badge-neutral',
  FAILED: 'badge-red',
  ERROR: 'badge-red',
  UNKNOWN: 'badge-amber',
}

export default function StatusBadge({ status }) {
  const key = (status || 'UNKNOWN').toUpperCase()
  const live = key === 'RUNNING'
  return (
    <span className={`badge ${STYLES[key] || STYLES.UNKNOWN}`}>
      <span className={live ? 'dot-pulse' : 'dot'} />
      {key}
    </span>
  )
}
