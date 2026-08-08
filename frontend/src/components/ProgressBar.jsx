import Icon from './Icon'

/**
 * Thin upload/download progress bar.
 * Props: dir ('up' | 'down'), name (label), pct (0-100 or null for indeterminate).
 */
export default function ProgressBar({ dir, name, pct }) {
  const known = typeof pct === 'number'
  return (
    <div className="my-3">
      <div className="mb-1.5 flex justify-between gap-2 text-xs text-ink-muted">
        <span className="flex min-w-0 items-center gap-1.5">
          <Icon name={dir === 'up' ? 'upload' : 'download'} size={13} className="text-mint-400" />
          <span className="truncate">{dir === 'up' ? 'Uploading' : 'Downloading'} {name}</span>
        </span>
        <span className="font-mono text-ink-dim">{known ? `${pct}%` : '…'}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-panel-raised">
        <div
          className={`h-full rounded-full bg-mint transition-[width] duration-150 ${
            known ? '' : 'w-1/3 animate-pulse'
          }`}
          style={known ? { width: `${pct}%` } : undefined}
        />
      </div>
    </div>
  )
}
