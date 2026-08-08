import { useCallback, useEffect, useRef, useState } from 'react'
import api, { errorMessage } from '../api/client'
import Icon from '../components/Icon'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'

/** MySQL manager: list/create/drop databases, import/export, query runner. */
export default function Databases() {
  const [databases, setDatabases] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', user: '', password: '' })
  const [queryDb, setQueryDb] = useState('')
  const [sql, setSql] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const importRef = useRef(null)
  const [importTarget, setImportTarget] = useState(null)
  const [browseDb, setBrowseDb] = useState('')

  const refresh = useCallback(() => {
    api.get('/databases').then((res) => setDatabases(res.data)).catch((err) => setError(errorMessage(err)))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function create(e) {
    e.preventDefault()
    try {
      await api.post('/databases', form)
      setShowCreate(false)
      setForm({ name: '', user: '', password: '' })
      refresh()
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  async function drop(name) {
    if (!window.confirm(`DROP DATABASE ${name}? This permanently deletes all its data.`)) return
    if (!window.confirm(`Really drop "${name}"? This cannot be undone.`)) return
    try {
      await api.delete(`/databases/${name}`)
      refresh()
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  async function runQuery() {
    setError('')
    setResult(null)
    try {
      const res = await api.post('/databases/query', { database: queryDb, sql })
      setResult(res.data)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function exportDb(name) {
    api
      .get(`/databases/${name}/export`, { responseType: 'blob' })
      .then((res) => {
        const url = URL.createObjectURL(res.data)
        const a = document.createElement('a')
        a.href = url
        a.download = `${name}.sql`
        a.click()
        URL.revokeObjectURL(url)
      })
      .catch((err) => alert(errorMessage(err)))
  }

  async function importDb(file) {
    if (!file || !importTarget) return
    const form = new FormData()
    form.append('file', file)
    try {
      await api.post(`/databases/${importTarget}/import`, form)
      alert(`Imported into ${importTarget}`)
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  return (
    <div>
      <PageHeader
        title="Databases"
        crumbs={[{ label: 'ServerHub', to: '/dashboard' }, { label: 'Databases' }]}
        lead="MySQL databases on this server — create, browse, query, import and export."
        actions={
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Icon name="plus" size={14} /> New Database
          </button>
        }
      />

      {error && (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-red-400">
          <Icon name="alert" size={14} /> {error}
        </p>
      )}

      {/* DB list */}
      {databases.length === 0 ? (
        <div className="empty">
          <Icon name="database" size={26} />
          <p>No databases yet.</p>
          <button className="btn-primary mt-2" onClick={() => setShowCreate(true)}>
            <Icon name="plus" size={14} /> New Database
          </button>
        </div>
      ) : (
        <div className="table-panel">
          <table className="tbl">
            <thead>
              <tr>
                <th>Database</th>
                <th>Linked website</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {databases.map((d) => (
                <tr key={d.name}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="icon-tile tile-mint"><Icon name="database" size={16} /></span>
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[13px] text-ink-primary">{d.name}</p>
                        <p className="text-[11px] text-ink-faint">MySQL schema</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-ink-muted">{d.linked_website || '—'}</td>
                  <td className="col-actions">
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => setBrowseDb(d.name)} className="btn-icon" title="Browse tables">
                        <Icon name="table" size={15} />
                      </button>
                      <button onClick={() => setQueryDb(d.name)} className="btn-icon" title="Query">
                        <Icon name="terminal" size={15} />
                      </button>
                      <button onClick={() => exportDb(d.name)} className="btn-icon" title="Export .sql">
                        <Icon name="download" size={15} />
                      </button>
                      <button onClick={() => { setImportTarget(d.name); importRef.current?.click() }}
                        className="btn-icon" title="Import .sql">
                        <Icon name="upload" size={15} />
                      </button>
                      <button onClick={() => drop(d.name)} className="btn-icon-danger" title="Drop database">
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

      <input
        ref={importRef}
        type="file"
        accept=".sql"
        className="hidden"
        onChange={(e) => { importDb(e.target.files[0]); e.target.value = '' }}
      />

      {/* Database browser */}
      <div className="mt-6">
        <DbBrowser databases={databases} db={browseDb} setDb={setBrowseDb} />
      </div>

      {/* Query runner */}
      <div className="card mt-6">
        <h3 className="sec-title mb-4">Query Runner</h3>
        <div className="mb-3 flex flex-wrap gap-2">
          <select className="input max-w-xs" value={queryDb} onChange={(e) => setQueryDb(e.target.value)}>
            <option value="">— select database —</option>
            {databases.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>
          <button className="btn-primary" onClick={runQuery} disabled={!queryDb || !sql.trim()}>
            <Icon name="play" size={13} /> Run
          </button>
        </div>
        <textarea
          className="input h-28 font-mono text-[13px]"
          placeholder="SELECT * FROM users LIMIT 10;"
          value={sql}
          onChange={(e) => setSql(e.target.value)}
        />
        {result && (
          <div className="mt-4">
            <p className="label">{result.message}</p>
            {result.columns?.length > 0 && (
              <div className="table-panel">
                <table className="tbl text-xs">
                  <thead>
                    <tr>{result.columns.map((c) => <th key={c}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j} className="whitespace-nowrap font-mono">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <Modal
          as="form"
          onSubmit={create}
          onClose={() => setShowCreate(false)}
          title="New Database"
          subtitle="Optionally create a dedicated user with full access to it."
          footer={
            <>
              <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Create database</button>
            </>
          }
        >
          <div>
            <label className="label">Database name</label>
            <input className="input font-mono" placeholder="my_app" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus required />
          </div>
          <div>
            <label className="label">Username (optional)</label>
            <input className="input font-mono" placeholder="my_app_user" value={form.user}
              onChange={(e) => setForm({ ...form, user: e.target.value })} />
          </div>
          <div>
            <label className="label">Password (optional)</label>
            <input className="input font-mono" type="password" placeholder="••••••••" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
        </Modal>
      )}
    </div>
  )
}

/**
 * Visual database browser: pick a database → see its tables → click a table to
 * see its columns and a preview of its rows.
 */
function DbBrowser({ databases, db, setDb }) {
  const [tables, setTables] = useState([])
  const [table, setTable] = useState(null)
  const [info, setInfo] = useState(null)
  const [view, setView] = useState('columns') // 'columns' | 'data'
  const [error, setError] = useState('')
  const [editIdx, setEditIdx] = useState(-1)   // which data row is being edited
  const [editVals, setEditVals] = useState([]) // working copy of that row's cells

  // The primary-key column lets us safely UPDATE/DELETE a specific row
  const pkColumn = info?.columns?.find((c) => c.key === 'PRI')?.name || null
  const pkIndex = pkColumn ? (info?.preview?.columns?.indexOf(pkColumn) ?? -1) : -1

  function startEdit(rowIdx, row) {
    setEditIdx(rowIdx)
    setEditVals([...row])
  }

  function cancelEdit() {
    setEditIdx(-1)
    setEditVals([])
  }

  async function saveEdit(originalRow) {
    const cols = info.preview.columns
    const changes = {}
    cols.forEach((c, i) => {
      if (editVals[i] !== originalRow[i]) changes[c] = editVals[i]
    })
    if (Object.keys(changes).length === 0) { cancelEdit(); return }
    try {
      await api.post(`/databases/${db}/tables/${table}/update-row`, {
        pk_column: pkColumn,
        pk_value: originalRow[pkIndex],
        changes,
      })
      cancelEdit()
      openTable(table) // reload fresh data
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  async function deleteRow(originalRow) {
    if (!window.confirm('Delete this row? This cannot be undone.')) return
    try {
      await api.post(`/databases/${db}/tables/${table}/delete-row`, {
        pk_column: pkColumn,
        pk_value: originalRow[pkIndex],
      })
      openTable(table)
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  // Load tables when the selected database changes
  useEffect(() => {
    setTable(null)
    setInfo(null)
    if (!db) {
      setTables([])
      return
    }
    setError('')
    api.get(`/databases/${db}/tables`)
      .then((res) => setTables(res.data))
      .catch((err) => setError(errorMessage(err)))
  }, [db])

  function openTable(name) {
    setTable(name)
    setInfo(null)
    setEditIdx(-1)
    api.get(`/databases/${db}/tables/${name}`, { params: { limit: 100 } })
      .then((res) => setInfo(res.data))
      .catch((err) => setError(errorMessage(err)))
  }

  return (
    <div className="card">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h3 className="sec-title">Database Browser</h3>
        <select className="input max-w-xs" value={db} onChange={(e) => setDb(e.target.value)}>
          <option value="">— select database —</option>
          {databases.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
        </select>
        {error && <span className="badge badge-red"><Icon name="alert" size={12} /> {error}</span>}
      </div>

      {!db ? (
        <div className="empty">
          <Icon name="table" size={26} />
          <p>Pick a database to explore its tables.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row" style={{ minHeight: '40vh' }}>
          {/* Tables list */}
          <aside className="w-full shrink-0 overflow-y-auto border-panel-border/60 lg:w-60 lg:border-r lg:pr-4"
                 style={{ maxHeight: '60vh' }}>
            <p className="label">Tables ({tables.length})</p>
            <ul className="space-y-0.5">
              {tables.map((t) => (
                <li key={t.name}>
                  <button
                    onClick={() => openTable(t.name)}
                    className={`list-item flex items-center justify-between gap-2 ${
                      table === t.name ? 'list-item-active' : ''
                    }`}
                  >
                    <span className="truncate font-mono text-[13px]">{t.name}</span>
                    <span className="shrink-0 text-[11px] text-ink-faint">{t.rows ?? '?'}</span>
                  </button>
                </li>
              ))}
              {tables.length === 0 && <li className="px-2.5 text-xs text-ink-faint">No tables</li>}
            </ul>
          </aside>

          {/* Table detail */}
          <div className="min-w-0 flex-1">
            {!table ? (
              <p className="text-sm text-ink-faint">Select a table on the left.</p>
            ) : !info ? (
              <p className="text-sm text-ink-faint">Loading {table}…</p>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className="font-mono text-sm text-mint-300">{table}</span>
                  <span className="text-xs text-ink-faint">
                    {info.columns.length} columns · {info.row_count} rows
                  </span>
                  <div className="tabs ml-auto border-0">
                    <button className={`tab ${view === 'columns' ? 'tab-active' : ''}`}
                      onClick={() => setView('columns')}>Columns</button>
                    <button className={`tab ${view === 'data' ? 'tab-active' : ''}`}
                      onClick={() => setView('data')}>Data</button>
                  </div>
                </div>

                <div className="table-panel" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                  {view === 'columns' ? (
                    <table className="tbl text-xs">
                      <thead>
                        <tr>
                          {['Column', 'Type', 'Null', 'Key', 'Default', 'Extra'].map((h) => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {info.columns.map((c) => (
                          <tr key={c.name}>
                            <td className="font-mono text-mint-300">{c.name}</td>
                            <td className="font-mono text-ink-body">{c.type}</td>
                            <td className="text-ink-muted">{c.null}</td>
                            <td>
                              {c.key === 'PRI'
                                ? <span className="badge badge-amber"><Icon name="key" size={11} /> PRI</span>
                                : <span className="text-ink-muted">{c.key}</span>}
                            </td>
                            <td className="text-ink-muted">{c.default}</td>
                            <td className="text-ink-muted">{c.extra}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="tbl text-xs">
                      <thead>
                        <tr>
                          {info.preview.columns.map((c) => (
                            <th key={c} className="font-mono">
                              {c}{c === pkColumn && <Icon name="key" size={11} className="ml-1 inline text-amber-300" />}
                            </th>
                          ))}
                          <th className="w-px text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {info.preview.rows.map((row, i) => (
                          <tr key={i}>
                            {row.map((cell, j) => (
                              <td key={j} className="whitespace-nowrap font-mono">
                                {editIdx === i ? (
                                  <input
                                    className="input min-w-[6rem] px-2 py-1 text-xs"
                                    value={editVals[j] ?? ''}
                                    onChange={(e) => {
                                      const v = [...editVals]; v[j] = e.target.value; setEditVals(v)
                                    }}
                                  />
                                ) : cell === 'NULL' ? (
                                  <span className="italic text-ink-faint">NULL</span>
                                ) : cell}
                              </td>
                            ))}
                            <td className="col-actions">
                              {!pkColumn ? (
                                <span className="text-ink-faint" title="Editing needs a single primary-key column">—</span>
                              ) : editIdx === i ? (
                                <div className="inline-flex items-center gap-1">
                                  <button className="btn-icon" title="Save" onClick={() => saveEdit(row)}>
                                    <Icon name="check" size={14} />
                                  </button>
                                  <button className="btn-icon" title="Cancel" onClick={cancelEdit}>
                                    <Icon name="x" size={14} />
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1">
                                  <button className="btn-icon" title="Edit row" onClick={() => startEdit(i, row)}>
                                    <Icon name="edit" size={14} />
                                  </button>
                                  <button className="btn-icon-danger" title="Delete row" onClick={() => deleteRow(row)}>
                                    <Icon name="trash" size={14} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                        {info.preview.rows.length === 0 && (
                          <tr>
                            <td className="py-6 text-center text-ink-faint"
                              colSpan={(info.preview.columns.length || 1) + 1}>
                              (no rows)
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>

                {view === 'data' && !pkColumn && info.preview.rows.length > 0 && (
                  <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-300/90">
                    <Icon name="alert" size={13} className="mt-0.5" />
                    This table has no single primary key — rows can't be safely edited here. Use the Query Runner.
                  </p>
                )}
                {view === 'data' && info.row_count > info.preview.rows.length && (
                  <p className="mt-3 text-xs text-ink-faint">
                    Showing first {info.preview.rows.length} of {info.row_count} rows. Use the Query Runner for more.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
