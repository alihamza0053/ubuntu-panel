import FolderBrowser from '../../components/FolderBrowser'
import Icon from '../../components/Icon'

/**
 * Data Files tab: browse the project's data/ folder and its subfolders — open
 * folders and spreadsheets, and upload (button or drag-and-drop) / download /
 * delete files at any level.
 */
export default function DataFilesTab({ project }) {
  return (
    <div className="card">
      <div className="mb-4 flex items-center gap-3">
        <span className="icon-tile tile-amber"><Icon name="table" size={17} /></span>
        <div className="min-w-0">
          <h3 className="sec-title">Data Files</h3>
          <p className="hint mt-0.5">
            Files in the project’s <span className="font-mono text-ink-secondary">data/</span> folder — used by
            your scripts. Click a spreadsheet to open it.
          </p>
        </div>
      </div>
      <FolderBrowser
        rootPath={`${project.folder_path}/data`}
        accept=".xlsx,.xls,.csv"
        emptyHint="No data files yet"
      />
    </div>
  )
}
