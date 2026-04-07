import { useState, useEffect } from 'react'
import { getFileCategory, getFileExt, formatFileSize, formatDate, getFileTypeLabel } from '../utils/fileUtils'
import { IconClose, IconDownload, IconEye, IconLink } from './Icons'
import { authFetch, downloadWithAuth, openWithAuth } from '../utils/authFetch'
import './FilePreview.css'

const TEXT_CATEGORIES = new Set(['log', 'text', 'code', 'data'])

export default function FilePreview({ file, containerId, token, onClose, onUnauthorized }) {
  const [content, setContent] = useState(null)
  const [loadingContent, setLoadingContent] = useState(false)

  const ext      = getFileExt(file.name)
  const category = getFileCategory(file.name)
  const canPreview = TEXT_CATEGORIES.has(category)

  useEffect(() => {
    if (!canPreview) { setContent(null); return }
    setLoadingContent(true)
    setContent(null)
    const url = `/api/containers/${encodeURIComponent(containerId)}/files/${encodeURIComponent(file.name)}/view`
    authFetch(url, token)
      .then(r => {
        if (r.status === 401) { onUnauthorized?.(); return null }
        return r.text()
      })
      .then(text => text !== null && setContent(text))
      .catch(() => setContent(null))
      .finally(() => setLoadingContent(false))
  }, [file.name, containerId, canPreview, token])

  function handleDownload() {
    const url = `/api/containers/${encodeURIComponent(containerId)}/files/${encodeURIComponent(file.name)}/download`
    downloadWithAuth(url, file.name, token).catch(() => {})
  }

  function handleOpen() {
    const url = `/api/containers/${encodeURIComponent(containerId)}/files/${encodeURIComponent(file.name)}/view`
    openWithAuth(url, token).catch(() => {})
  }

  function handleCopyUrl() {
    const url = `${window.location.origin}/api/containers/${encodeURIComponent(containerId)}/files/${encodeURIComponent(file.name)}/download`
    navigator.clipboard.writeText(url).then(() => alert('URL copied to clipboard'))
  }

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
            <IconEye /> Open in tab
          </button>
          <button className="preview-btn" onClick={handleCopyUrl}>
            <IconLink /> Copy URL
          </button>
        </div>

        {canPreview && (
          <>
            <hr className="preview-divider" />
            <div className="preview-content">
              {loadingContent && <p className="preview-content-loading">Loading…</p>}
              {!loadingContent && content !== null && (
                <pre className="preview-content-text">{content}</pre>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
