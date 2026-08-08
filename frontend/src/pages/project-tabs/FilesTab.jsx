import FolderBrowser from '../../components/FolderBrowser'
import Icon from '../../components/Icon'

// Project folders shown in the Files tab. Each is now a full browser: navigate
// subfolders, upload (button + drag-and-drop), download, delete, open
// spreadsheets, and edit text files — including onedrivefiles/ (portal uploads).
const FOLDERS = [
  { name: 'code', hint: 'Python scripts', tile: 'tile-mint', icon: 'code' },
  { name: 'allscripts', hint: 'Helper scripts', tile: 'tile-aqua', icon: 'terminal' },
  { name: 'data', hint: 'Excel / CSV data', tile: 'tile-amber', icon: 'table' },
  { name: 'dashboard', hint: 'Streamlit app (app.py)', tile: 'tile-violet', icon: 'monitor' },
  { name: 'onedrivefiles', hint: 'Uploaded via the upload portal', tile: '', icon: 'cloud' },
]

export default function FilesTab({ project, onChanged }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {FOLDERS.map((folder) => (
        <div key={folder.name} className="card">
          <div className="mb-4 flex items-center gap-3">
            <span className={`icon-tile ${folder.tile}`}><Icon name={folder.icon} size={17} /></span>
            <div className="min-w-0">
              <h4 className="font-mono text-sm font-semibold text-ink-primary">{folder.name}/</h4>
              <p className="hint">{folder.hint}</p>
            </div>
          </div>
          <FolderBrowser
            rootPath={`${project.folder_path}/${folder.name}`}
            editable
            onChanged={onChanged}
            emptyHint="This folder is empty"
          />
        </div>
      ))}
    </div>
  )
}
