import { useCallback, useEffect, useRef, useState } from 'react'
import api, { errorMessage } from '../api/client'
import EditorModal from '../components/EditorModal'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'

const EDITABLE = ['.py', '.txt', '.json', '.yaml', '.yml', '.csv', '.md', '.html', '.htm',
  '.css', '.js', '.jsx', '.ts', '.tsx', '.php', '.sql', '.conf', '.cfg', '.ini', '.toml',
  '.env', '.sh', '.log', '.xml']

function isEditable(name) {
  return EDITABLE.some((ext) => name.toLowerCase().endsWith(ext))
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z') // backend sends UTC
  return isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

/** Global server file manager confined to the panel-managed roots under /srv. */
export default function Files() {
  const [path, setPath] = useState('') // '' = roots listing
  const [data, setData] = useState({ entries: [], parent: null })
  const [editorPath, setEditorPath] = useState(null)
  const [error, setError] = useState('')
  const inputRef = useRef(null)
  const browseRequest = useRef(0)

  const browse = useCallback((target) => {
    const requestId = ++browseRequest.current
    setError('')
    api
      .get('/files/browse', { params: { path: target } })
      .then((res) => {
        if (requestId !== browseRequest.current) return
        setData(res.data)
        setPath(res.data.path)
      })
      .catch((err) => {
        // Ignore an older request that finished after the user navigated away.
        if (requestId === browseRequest.current) setError(errorMessage(err))
      })
  }, [])

  useEffect(() => {
    browse('')
  }, [browse])

  function open(entry) {
    if (entry.is_dir) browse(entry.path)
    else if (isEditable(entry.name)) setEditorPath(entry.path)
  }

  async function upload(files) {
    if (!path) {
      alert('Open a folder first')
      return
    }
    const form = new FormData()
    for (const f of files) form.append('files', f)
    try {
      await api.post('/files/upload', form, { params: { path } })
      browse(path)
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  async function mkdir() {
    const name = prompt('New folder name:')
    if (!name) return
    try {
      await api.post('/files/mkdir', { path: `${path}/${name}` })
      browse(path)
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  async function rename(entry) {
    const newName = prompt('Rename to:', entry.name)
    if (!newName || newName === entry.name) return
    try {
      await api.post('/files/rename', { path: entry.path, new_name: newName })
      browse(path)
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  async function remove(entry) {
    if (!window.confirm(`Delete ${entry.name}${entry.is_dir ? '/ (and contents)' : ''}?`)) return
    try {
      await api.delete('/files/delete', { data: { path: entry.path } })
      browse(path)
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  function download(entry) {
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
      .catch((err) => alert(errorMessage(err)))
  }

  return (
    <div>
      <PageHeader
        title="File Manager"
        crumbs={[{ label: 'ServerHub', to: '/dashboard' }, { label: 'Files' }]}
        lead="Browse, edit, upload and download inside the panel-managed roots under /srv."
      />

      <div className="card">
        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button className="btn-secondary btn-sm" onClick={() => browse('')}>
            <Icon name="home" size={13} /> Roots
          </button>
          <button className="btn-secondary btn-sm" onClick={() => browse('/opt')}>
            <Icon name="folder" size={13} /> /opt
          </button>
          {data.parent !== null && (
            <button className="btn-secondary btn-sm" onClick={() => browse(data.parent)}>
              <Icon name="arrow-up" size={13} /> Up
            </button>
          )}
          <span className="truncate font-mono text-[13px] text-ink-muted">
            {path || '/srv (managed roots)'}
          </span>
          <div className="ml-auto flex gap-2">
            {path && (
              <button className="btn-secondary btn-sm" onClick={mkdir}>
                <Icon name="folder-plus" size={13} /> New folder
              </button>
            )}
            {path && (
              <button className="btn-primary btn-sm" onClick={() => inputRef.current?.click()}>
                <Icon name="upload" size={13} /> Upload
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                upload([...e.target.files])
                e.target.value = ''
              }}
            />
          </div>
        </div>

        {error && (
          <p className="mb-3 flex items-center gap-1.5 text-sm text-red-400">
            <Icon name="alert" size={14} /> {error}
          </p>
        )}

        {/* Listing */}
        {data.entries.length === 0 ? (
          <div className="empty">
            <Icon name="folder" size={26} />
            <p>This folder is empty.</p>
          </div>
        ) : (
          <div className="table-panel">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Size</th>
                  <th>Modified</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => {
                  const editable = !entry.is_dir && isEditable(entry.name)
                  return (
                    <tr key={entry.path}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className={`icon-tile ${entry.is_dir ? 'tile-mint' : editable ? 'tile-violet' : ''}`}>
                            <Icon name={entry.is_dir ? 'folder' : editable ? 'file-text' : 'file'} size={16} />
                          </span>
                          <div className="min-w-0">
                            <button onClick={() => open(entry)}
                              className="block max-w-full truncate text-left font-mono text-[13px] text-ink-primary
                                         transition-colors hover:text-mint-300">
                              {entry.name}
                            </button>
                            <span className="text-[11px] text-ink-faint">
                              {entry.is_dir ? 'folder' : editable ? 'editable' : 'file'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="text-ink-muted">{entry.is_dir ? '—' : formatSize(entry.size)}</td>
                      <td className="whitespace-nowrap text-ink-muted">{formatDate(entry.modified)}</td>
                      <td className="col-actions">
                        <div className="inline-flex items-center gap-1">
                          {!entry.is_dir && (
                            <button onClick={() => download(entry)} className="btn-icon" title="Download">
                              <Icon name="download" size={15} />
                            </button>
                          )}
                          <button onClick={() => rename(entry)} className="btn-icon" title="Rename">
                            <Icon name="edit" size={15} />
                          </button>
                          <button onClick={() => remove(entry)} className="btn-icon-danger" title="Delete">
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
        )}
      </div>

      <EditorModal
        path={editorPath}
        onClose={() => {
          setEditorPath(null)
        }}
      />
    </div>
  )
}
