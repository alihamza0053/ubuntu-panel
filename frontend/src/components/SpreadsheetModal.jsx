import { useEffect, useMemo, useState } from 'react'
import api, { errorMessage } from '../api/client'
import Icon from './Icon'

const MAX_ROWS = 2000 // cap rendered rows so huge sheets don't freeze the browser

// SheetJS is self-hosted (frontend/public/vendor/) and loaded on demand — no npm
// dependency and no CDN, so it works fully offline. Resolves window.XLSX.
let _xlsxPromise = null
function loadXLSX() {
  if (window.XLSX) return Promise.resolve(window.XLSX)
  if (_xlsxPromise) return _xlsxPromise
  _xlsxPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = '/vendor/xlsx.full.min.js'
    s.onload = () => resolve(window.XLSX)
    s.onerror = () => { _xlsxPromise = null; reject(new Error('Failed to load the spreadsheet viewer')) }
    document.head.appendChild(s)
  })
  return _xlsxPromise
}

/**
 * Read-only viewer for spreadsheet files (.csv, .xlsx, .xls). Downloads the file
 * bytes via the global file API and parses them in the browser with SheetJS, so
 * no server-side pandas/Excel dependency is needed.
 *
 * Props: entry ({ name, path }), onClose()
 */
export default function SpreadsheetModal({ entry, onClose }) {
  const [xlsx, setXlsx] = useState(null)
  const [workbook, setWorkbook] = useState(null)
  const [active, setActive] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!entry) return
    setLoading(true)
    setError('')
    Promise.all([
      loadXLSX(),
      api.get('/files/download', { params: { path: entry.path }, responseType: 'arraybuffer' }),
    ])
      .then(([XLSX, res]) => {
        const wb = XLSX.read(new Uint8Array(res.data), { type: 'array' })
        setXlsx(XLSX)
        setWorkbook(wb)
        setActive(wb.SheetNames[0] || '')
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [entry])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function download() {
    api
      .get('/files/download', { params: { path: entry.path }, responseType: 'blob' })
      .then((res) => {
        const url = URL.createObjectURL(res.data)
        const a = document.createElement('a')
        a.href = url
        a.download = entry.name
        a.click()
        URL.revokeObjectURL(url)
      })
      .catch((err) => setError(errorMessage(err)))
  }

  // Convert the active sheet to an array-of-arrays (header row + data rows).
  const rows = useMemo(() => {
    if (!xlsx || !workbook || !active) return []
    const sheet = workbook.Sheets[active]
    return xlsx.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' })
  }, [xlsx, workbook, active])

  const truncated = rows.length > MAX_ROWS + 1
  const shown = truncated ? rows.slice(0, MAX_ROWS + 1) : rows
  const header = shown[0] || []
  const body = shown.slice(1)

  if (!entry) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-panel-ink/85 p-4 backdrop-blur-sm">
      <div className="mb-3 flex animate-fade-up items-center gap-3 rounded-card border border-panel-border/70
                      bg-panel-card/85 px-4 py-2.5 shadow-card">
        <Icon name="table" size={16} className="text-aqua" />
        <span className="truncate font-mono text-[13px] text-ink-secondary">{entry.name}</span>
        {error && (
          <span className="badge badge-red shrink-0">
            <Icon name="alert" size={12} /> {error}
          </span>
        )}
        <div className="ml-auto flex shrink-0 gap-2">
          <button className="btn-secondary btn-sm" onClick={download}>
            <Icon name="download" size={14} /> Download
          </button>
          <button className="btn-secondary btn-sm" onClick={onClose}>
            Close <span className="kbd ml-1">Esc</span>
          </button>
        </div>
      </div>

      {/* Sheet tabs (multi-sheet workbooks) */}
      {workbook && workbook.SheetNames.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {workbook.SheetNames.map((name) => (
            <button
              key={name}
              onClick={() => setActive(name)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                name === active
                  ? 'bg-mint-500/15 text-mint-300 ring-1 ring-inset ring-mint-400/30'
                  : 'bg-panel-raised/70 text-ink-muted hover:text-ink-secondary'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto rounded-card border border-panel-border/70 bg-panel-card shadow-card">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-ink-faint">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-ink-faint">Empty sheet</div>
        ) : (
          <table className="border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-panel-card">
              <tr>
                <th className="border border-panel-border/60 bg-panel-bg px-2.5 py-1.5 text-ink-faint">#</th>
                {header.map((cell, i) => (
                  <th
                    key={i}
                    className="whitespace-nowrap border border-panel-border/60 px-2.5 py-1.5 text-left
                               text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-dim"
                  >
                    {String(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, r) => (
                <tr key={r} className="transition-colors hover:bg-mint-400/[0.04]">
                  <td className="border border-panel-border/50 bg-panel-bg px-2.5 py-1.5 text-ink-faint">{r + 1}</td>
                  {header.map((_, c) => (
                    <td key={c} className="whitespace-nowrap border border-panel-border/50 px-2.5 py-1.5 text-ink-body">
                      {row[c] !== undefined && row[c] !== null ? String(row[c]) : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {truncated && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-300">
          <Icon name="info" size={13} />
          Showing first {MAX_ROWS.toLocaleString()} rows — download the file to see all of it.
        </p>
      )}
    </div>
  )
}
