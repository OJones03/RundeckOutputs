import { getFileCategory, getFileExt, formatFileSize, formatDate, getFileTypeLabel } from '../utils/fileUtils'
import { IconClose, IconDownload, IconEye, IconLink, IconTrash } from './Icons'
import './FilePreview.css'

export default function FilePreview({ file, containerId, onClose }) {
  function handleDownload() {
    const url = `/api/containers/${encodeURIComponent(containerId)}/files/${encodeURIComponent(file.name)}/download`
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
  }

  function handleOpen() {
    const url = `/api/containers/${encodeURIComponent(containerId)}/files/${encodeURIComponent(file.name)}/download`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function handleCopyUrl() {
    const url = `${window.location.origin}/api/containers/${encodeURIComponent(containerId)}/files/${encodeURIComponent(file.name)}/download`
    navigator.clipboard.writeText(url).then(() => alert('URL copied to clipboard'))
  }

  function handleDelete() {
    if (window.confirm(`Delete "${file.name}"? This cannot be undone.`)) {
      alert('TODO: implement DELETE /api/containers/:id/files/:filename in server/index.js')
    }
  }

  const ext      = getFileExt(file.name)
  const category = getFileCategory(file.name)

  return (
    <aside className="file-preview" aria-label="File details">
      <div className="preview-header">
        <span className="preview-heading">File Details</span>
        <button className="preview-close" onClick={onClose} aria-label="Close preview">
          <IconClose />
        </button>
      </div>

      <div className="preview-body">
        <div className={`preview-type-badge type-badge type-${category}`}>{ext}</div>
        <p className="preview-filename">{file.name}</p>
        <p className="preview-type-label">{getFileTypeLabel(file.type, file.name)}</p>

        <hr className="preview-divider" />

        <dl className="preview-meta">
          <div className="preview-meta-row">
            <dt>Size</dt>
            <dd>{formatFileSize(file.size)}</dd>
          </div>
          <div className="preview-meta-row">
            <dt>Modified</dt>
            <dd>{formatDate(file.modified)}</dd>
          </div>
          <div className="preview-meta-row">
            <dt>MIME type</dt>
            <dd className="preview-mime">{file.type}</dd>
          </div>
          <div className="preview-meta-row">
            <dt>Path</dt>
            <dd>{file.path}</dd>
          </div>
        </dl>

        <hr className="preview-divider" />

        <div className="preview-actions">
          <button className="preview-btn primary" onClick={handleDownload}>
            <IconDownload /> Download
          </button>
          <button className="preview-btn" onClick={handleOpen}>
            <IconEye /> Open / Preview
          </button>
          <button className="preview-btn" onClick={handleCopyUrl}>
            <IconLink /> Copy URL
          </button>
          <button className="preview-btn danger" onClick={handleDelete}>
            <IconTrash /> Delete
          </button>
        </div>
      </div>
    </aside>
  )
}
