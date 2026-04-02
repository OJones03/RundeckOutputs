import { getFileCategory, getFileExt, formatFileSize, formatDate } from '../utils/fileUtils'
import './FileItem.css'

export default function FileItem({ file, viewMode, isSelected, onClick }) {
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
