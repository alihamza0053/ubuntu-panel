import Editor from '@monaco-editor/react'
import { useEffect, useState } from 'react'
import api, { errorMessage } from '../../api/client'
import Icon from '../../components/Icon'
import LiveLog from '../../components/LiveLog'
import { MONACO_THEME, defineMonacoTheme } from '../../monacoTheme'

// Map file extension → Monaco language id
const LANGUAGES = {
  py: 'python', js: 'javascript', jsx: 'javascript', ts: 'typescript',
  json: 'json', yaml: 'yaml', yml: 'yaml', html: 'html', css: 'css',
  md: 'markdown', sql: 'sql', php: 'php', sh: 'shell', toml: 'ini',
  cfg: 'ini', ini: 'ini', conf: 'ini', txt: 'plaintext', csv: 'plaintext',
  log: 'plaintext',
}

function languageFor(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  return LANGUAGES[ext] || 'plaintext'
}

/**
 * Code Editor tab: file tree (left) + Monaco (right) + Save / Run.
 *
 * initialFile: { folder, filename } passed when a file was clicked on the
 * Files tab so it opens immediately.
 */
export default function EditorTab({ project, files, initialFile }) {
  const [current, setCurrent] = useState(null) // { folder, filename, path }
  const [content, setContent] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [runWsPath, setRunWsPath] = useState(null)

  // Absolute path on the server (Linux-style; folder_path comes from the API)
  function absPath(folder, filename) {
    return `${project.folder_path}/${folder}/${filename}`
  }

  async function openFile(folder, filename) {
    if (dirty && !window.confirm('Discard unsaved changes?')) return
    try {
      const res = await api.get('/files/read', { params: { path: absPath(folder, filename) } })
      setCurrent({ folder, filename, path: res.data.path })
      setContent(res.data.content)
      setDirty(false)
      setMessage('')
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  // Open the file handed over from the Files tab
  useEffect(() => {
    if (initialFile) openFile(initialFile.folder, initialFile.filename)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile])

  async function save() {
    if (!current) return
    setSaving(true)
    try {
      await api.post('/files/write', { path: current.path, content })
      setDirty(false)
      setMessage(`Saved ${current.filename}`)
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function runCurrent() {
    // Look up the script id, then stream the run over WebSocket
    try {
      const res = await api.get(`/projects/${project.id}/scripts`)
      const script = res.data.find(
        (s) => s.folder === current.folder && s.filename === current.filename,
      )
      if (!script) {
        alert('Only .py files in code/ or allscripts/ can be run')
        return
      }
      setRunWsPath(null) // reset so re-running the same script reconnects
      setTimeout(() => setRunWsPath(`/ws/script/${script.id}/run`), 0)
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  // Ctrl+S to save
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, content])

  const isPython = current?.filename.endsWith('.py')
  const canRun = isPython && ['code', 'allscripts'].includes(current?.folder)

  return (
    <div className="flex flex-col gap-4 lg:flex-row" style={{ minHeight: '60vh' }}>
      {/* File tree */}
      <aside className="card w-full shrink-0 overflow-y-auto lg:w-56">
        <h4 className="label">Project files</h4>
        {files ? (
          Object.entries(files.folders).map(([folder, list]) => (
            <div key={folder} className="mb-4">
              <p className="mb-1 font-mono text-[11px] text-ink-faint">{folder}/</p>
              <ul className="space-y-0.5">
                {list.map((file) => {
                  const active = current?.folder === folder && current?.filename === file.name
                  return (
                    <li key={file.name}>
                      <button
                        onClick={() => openFile(folder, file.name)}
                        className={`list-item font-mono text-[13px] ${active ? 'list-item-active' : ''}`}
                      >
                        {file.name}
                      </button>
                    </li>
                  )
                })}
                {list.length === 0 && <li className="px-2.5 text-[11px] text-ink-faint">empty</li>}
              </ul>
            </div>
          ))
        ) : (
          <p className="text-sm text-ink-faint">Loading…</p>
        )}
      </aside>

      {/* Editor area */}
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="truncate font-mono text-[13px] text-ink-secondary">
            {current ? `${current.folder}/${current.filename}` : 'No file open'}
          </span>
          {dirty && <span className="badge badge-amber">unsaved</span>}
          {message && (
            <span className="badge badge-mint"><Icon name="check" size={12} /> {message}</span>
          )}
          <div className="ml-auto flex gap-2">
            {canRun && (
              <button className="btn-secondary btn-sm" onClick={runCurrent}>
                <Icon name="play" size={13} /> Run this file
              </button>
            )}
            <button className="btn-primary btn-sm" onClick={save} disabled={!current || !dirty || saving}>
              <Icon name="save" size={13} />
              {saving ? 'Saving…' : 'Save'}
              <span className="kbd ml-1 bg-black/15 text-onmint/70">Ctrl S</span>
            </button>
          </div>
        </div>

        {current ? (
          <div className="overflow-hidden rounded-card border border-panel-border/70 shadow-card">
            <Editor
              height="55vh"
              theme={MONACO_THEME}
              beforeMount={defineMonacoTheme}
              language={languageFor(current.filename)}
              value={content}
              onChange={(value) => {
                setContent(value ?? '')
                setDirty(true)
              }}
              options={{ minimap: { enabled: false }, fontSize: 13, padding: { top: 14 } }}
            />
          </div>
        ) : (
          <div className="empty h-[55vh]">
            <Icon name="file-text" size={26} />
            <p>Select a file from the tree to start editing.</p>
          </div>
        )}

        {/* Live output when running the open .py file */}
        <LiveLog path={runWsPath} onClose={() => {}} />
      </div>
    </div>
  )
}
