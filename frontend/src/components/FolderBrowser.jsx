import { useCallback, useEffect, useRef, useState } from 'react'
import api, { errorMessage } from '../api/client'
import EditorModal from './EditorModal'
import Icon from './Icon'
import ProgressBar from './ProgressBar'
import SpreadsheetModal from './SpreadsheetModal'

const EDITABLE_EXT = ['.py', '.txt', '.json', '.yaml', '.yml', '.md', '.toml', '.cfg', '.ini', '.log', '.sh', '.js', '.html', '.css', '.xml', '.sql', '.php', '.conf']
function isEditable(name) {
  const n = name.toLowerCase()
  return EDITABLE_EXT.some((ext) => n.endsWith(ext))
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatTime(iso) {
  return iso ? new Date(iso + 'Z').toLocaleString() : '—'
}

const SPREADSHEET_EXT = ['.csv', '.xlsx', '.xls']
function isSpreadsheet(name) {
  const n = name.toLowerCase()
  return SPREADSHEET_EXT.some((ext) => n.endsWith(ext))
}

/** Icon + tile tint for one entry, by kind. */
function tileFor(entry) {
  if (entry.is_dir) return { icon: 'folder', tint: 'tile-mint' }
  if (isSpreadsheet(entry.name)) return { icon: 'table', tint: 'tile-aqua' }
  if (isEditable(entry.name)) return { icon: 'file-text', tint: 'tile-violet' }
  return { icon: 'file', tint: '' }
}

/**
 * Reusable file browser rooted at a fixed server folder: navigate subfolders,
 * upload (button + drag-and-drop), make folders, download/delete, and open
 * spreadsheets in a viewer. Navigation is capped at rootPath (no climbing above).
 *
 * Props:
 *   rootPath  absolute server path this browser is rooted at
 *   accept    optional file-input accept filter (e.g. ".xlsx,.xls,.csv")
 *   viewer    open csv/xlsx/xls in the SpreadsheetModal (default true)
 *   emptyHint text shown when a folder is empty
 */
export default function FolderBrowser({ rootPath, accept, viewer = true, editable = false, onChanged, emptyHint = 'This folder is empty' }) {
  const [data, setData] = useState({ path: rootPath, parent: null, entries: [] })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [viewing, setViewing] = useState(null)
  const [editing, setEditing] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [transfer, setTransfer] = useState(null)   // { dir, name, pct }
  const inputRef = useRef(null)

  const path = data.path
  const atRoot = path === rootPath
  const rootName = rootPath.split('/').filter(Boolean).pop() || ''
  const rel = path.startsWith(rootPath) ? path.slice(rootPath.length).replace(/^\/+/, '') : ''

  const browse = useCallback((target) => {
    setErr('')
    api.get('/files/browse', { params: { path: target } })
      .then((res) => setData(res.data))
      .catch((e) => setErr(errorMessage(e)))
  }, [])

  // Ensure the root folder exists (portal/data folders may not yet), then browse.
  useEffect(() => {
    api.post('/files/mkdir', { path: rootPath })
      .catch(() => {})
      .finally(() => browse(rootPath))
  }, [browse, rootPath])

  async function upload(fileList) {
    if (!fileList.length) return
    const form = new FormData()
    for (const f of fileList) form.append('files', f)
    const name = fileList.length > 1 ? `${fileList.length} files` : fileList[0].name
    setBusy(true)
    setTransfer({ dir: 'up', name, pct: 0 })
    try {
      await api.post('/files/upload', form, {
        params: { path },
        onUploadProgress: (e) => {
          if (e.total) setTransfer((t) => t && { ...t, pct: Math.round((e.loaded / e.total) * 100) })
        },
      })
      browse(path)
      onChanged && onChanged()
    } catch (e) { alert(errorMessage(e)) } finally { setBusy(false); setTransfer(null) }
  }

  function download(entry) {
    setTransfer({ dir: 'down', name: entry.name, pct: 0 })
    api.get('/files/download', {
      params: { path: entry.path },
      responseType: 'blob',
      onDownloadProgress: (e) => {
        if (e.total) setTransfer((t) => t && { ...t, pct: Math.round((e.loaded / e.total) * 100) })
      },
    })
      .then((res) => {
        const url = URL.createObjectURL(res.data)
        const a = document.createElement('a')
        a.href = url
        a.download = entry.name
        a.click()
        URL.revokeObjectURL(url)
      })
      .catch((e) => alert(errorMessage(e)))
      .finally(() => setTransfer(null))
  }

  async function remove(entry) {
    if (!window.confirm(`Delete ${entry.name}${entry.is_dir ? '/ and its contents' : ''}?`)) return
    try {
      await api.delete('/files/delete', { data: { path: entry.path } })
      browse(path)
      onChanged && onChanged()
    } catch (e) { alert(errorMessage(e)) }
  }

  async function mkdir() {
    const name = prompt('New folder name:')
    if (!name || !name.trim()) return
    try {
      await api.post('/files/mkdir', { path: `${path}/${name.trim()}` })
      browse(path)
      onChanged && onChanged()
    } catch (e) { alert(errorMessage(e)) }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const files = [...(e.dataTransfer?.files || [])]
    if (files.length) upload(files)
  }

  /** Click target for an entry name — folders navigate, files open where possible. */
  function activate(entry) {
    if (entry.is_dir) return () => browse(entry.path)
    if (viewer && isSpreadsheet(entry.name)) return () => setViewing(entry)
    if (editable && isEditable(entry.name)) return () => setEditing(entry.path)
    return null
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button className="btn-secondary btn-sm" onClick={() => browse(rootPath)}>
          <Icon name="home" size={13} /> {rootName}
        </button>
        {!atRoot && (
          <button className="btn-secondary btn-sm" onClick={() => browse(data.parent)}>
            <Icon name="arrow-up" size={13} /> Up
          </button>
        )}
        {rel && <span className="truncate font-mono text-xs text-ink-muted">/{rel}</span>}
        <div className="ml-auto flex gap-2">
          <button className="btn-secondary btn-sm" onClick={mkdir}>
            <Icon name="folder-plus" size={13} /> New folder
          </button>
          <button className="btn-primary btn-sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            <Icon name="upload" size={13} /> {busy ? 'Uploading…' : 'Upload'}
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => { upload([...e.target.files]); e.target.value = '' }}
        />
      </div>

      {err && (
        <p className="mb-2 flex items-center gap-1.5 text-sm text-red-400">
          <Icon name="alert" size={14} /> {err}
        </p>
      )}

      {transfer && <ProgressBar dir={transfer.dir} name={transfer.name} pct={transfer.pct} />}

      {/* Drop zone wraps the listing */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-card border border-dashed transition duration-150 ${
          dragOver ? 'border-mint-400/70 bg-mint-500/[0.07]' : 'border-transparent'
        }`}
      >
        {dragOver && (
          <p className="flex items-center justify-center gap-2 py-8 text-sm text-mint-300">
            <Icon name="upload" size={16} />
            Drop files to upload to /{rel || rootName}
          </p>
        )}
        {!dragOver && (
          data.entries.length === 0 ? (
            <div className="empty">
              <Icon name="folder" size={26} />
              <p>{emptyHint}</p>
              <p className="text-xs text-ink-faint">Drag files here or use the Upload button</p>
            </div>
          ) : (
            <div className="table-panel">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Size</th>
                    <th>Last modified</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry) => {
                    const { icon, tint } = tileFor(entry)
                    const onOpen = activate(entry)
                    return (
                      <tr key={entry.path}>
                        <td>
                          <div className="flex items-center gap-3">
                            <span className={`icon-tile ${tint}`}><Icon name={icon} size={16} /></span>
                            <div className="min-w-0">
                              {onOpen ? (
                                <button
                                  onClick={onOpen}
                                  className="block max-w-full truncate font-mono text-[13px] text-ink-primary
                                             transition-colors hover:text-mint-300"
                                >
                                  {entry.name}
                                </button>
                              ) : (
                                <span className="block max-w-full truncate font-mono text-[13px] text-ink-secondary">
                                  {entry.name}
                                </span>
                              )}
                              <span className="text-[11px] text-ink-faint">
                                {entry.is_dir ? 'folder' : (entry.name.split('.').pop() || 'file')}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="text-ink-muted">{entry.is_dir ? '—' : formatSize(entry.size)}</td>
                        <td className="whitespace-nowrap text-ink-muted">{formatTime(entry.modified)}</td>
                        <td className="col-actions">
                          <div className="inline-flex items-center gap-1">
                            {viewer && !entry.is_dir && isSpreadsheet(entry.name) && (
                              <button className="btn-icon" onClick={() => setViewing(entry)} title="Open">
                                <Icon name="table" size={15} />
                              </button>
                            )}
                            {editable && !entry.is_dir && !isSpreadsheet(entry.name) && isEditable(entry.name) && (
                              <button className="btn-icon" onClick={() => setEditing(entry.path)} title="Edit">
                                <Icon name="edit" size={15} />
                              </button>
                            )}
                            {!entry.is_dir && (
                              <button className="btn-icon" onClick={() => download(entry)} title="Download">
                                <Icon name="download" size={15} />
                              </button>
                            )}
                            <button className="btn-icon-danger" onClick={() => remove(entry)} title="Delete">
                              <Icon name="trash" size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {viewing && <SpreadsheetModal entry={viewing} onClose={() => setViewing(null)} />}
      {editing && (
        <EditorModal
          path={editing}
          onClose={() => { setEditing(null); browse(path); onChanged && onChanged() }}
        />
      )}
    </div>
  )
}
