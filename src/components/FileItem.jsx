import { getFileCategory, getFileExt, formatFileSize, formatDate } from '../utils/fileUtils'
import './FileItem.css'

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true">
      <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z"/>
    </svg>
  )
}

export default function FileItem({ file, viewMode, isSelected, onClick }) {
  if (file.isDirectory) {
    if (viewMode === 'grid') {
      return (
        <button className="file-card folder-card" onClick={onClick} title={file.name}>
          <div className="file-card-icon folder-icon"><FolderIcon /></div>
          <div className="file-card-name">{file.name}</div>
          <div className="file-card-size">Folder</div>
        </button>
      )
    }
    return (
      <button className="file-row folder-row" onClick={onClick} title={file.name}>
        <span className="folder-badge"><FolderIcon /></span>
        <span className="file-row-name">{file.name}</span>
        <span className="file-row-size">—</span>
        <span className="file-row-date">{formatDate(file.modified)}</span>
      </button>
    )
  }

  const ext      = getFileExt(file.name)
  const category = getFileCategory(file.name)

  if (viewMode === 'grid') {
    return (
      <button
        className={`file-card ${isSelected ? 'selected' : ''}`}
        onClick={onClick}
        title={file.name}
      >
        <div className={`file-card-icon type-badge type-${category}`}>{ext}</div>
        <div className="file-card-name">{file.name}</div>
        <div className="file-card-size">{formatFileSize(file.size)}</div>
      </button>
    )
  }

  return (
    <button
      className={`file-row ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      title={file.name}
    >
      <span className={`type-badge type-${category}`}>{ext}</span>
      <span className="file-row-name">{file.name}</span>
      <span className="file-row-size">{formatFileSize(file.size)}</span>
      <span className="file-row-date">{formatDate(file.modified)}</span>
    </button>
  )
}
