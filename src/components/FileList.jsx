import { Fragment } from 'react'
import FileItem from './FileItem'
import './FileList.css'

export default function FileList({
  files,
  loading,
  error,
  selectedFile,
  onFileSelect,
  onFolderClick,
  currentPath,
  onPathChange,
  selectedContainer,
  viewMode,
  searchQuery,
}) {
  const fileCount = files.filter(f => !f.isDirectory).length
  if (!selectedContainer) {
    return (
      <main className="file-list">
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true" />
          <h2 className="empty-state-title">Select a Container</h2>
          <p className="empty-state-body">
            Choose a storage container from the sidebar to browse its files.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="file-list">
      <div className="file-list-toolbar">
        <nav className="breadcrumb" aria-label="Path">
          <button
            className="breadcrumb-item"
            onClick={() => onPathChange([])}
          >
            {selectedContainer.name}
          </button>
          {currentPath.map((segment, i) => (
            <Fragment key={segment}>
              <span className="breadcrumb-sep" aria-hidden="true">›</span>
              <button
                className="breadcrumb-item"
                onClick={() => onPathChange(currentPath.slice(0, i + 1))}
              >
                {segment}
              </button>
            </Fragment>
          ))}
        </nav>
        <span className="file-count">
          {!loading && !error && `${fileCount} ${fileCount === 1 ? 'file' : 'files'}${searchQuery ? ` matching "${searchQuery}"` : ''}`}
        </span>
      </div>

      {loading ? (
        <div className="file-list-status">
          <div className="spinner" aria-label="Loading files" />
          <p>Loading files…</p>
        </div>
      ) : error ? (
        <div className="file-list-status error">
          <p>Failed to load files</p>
          <p className="status-detail">{error}</p>
        </div>
      ) : files.length === 0 ? (
        <div className="file-list-no-results">
          {searchQuery
            ? <p>No files match <strong>"{searchQuery}"</strong>.</p>
            : <p>This container is empty.</p>
          }
        </div>
      ) : (
        <div className={`file-list-content ${viewMode === 'grid' ? 'grid-view' : 'list-view'}`}>
          {viewMode === 'list' && (
            <div className="list-header" aria-hidden="true">
              <span />
              <span>Name</span>
              <span>Size</span>
              <span>Modified</span>
            </div>
          )}
          {files.map(file => (
            <FileItem
              key={file.id}
              file={file}
              viewMode={viewMode}
              isSelected={!file.isDirectory && selectedFile?.id === file.id}
              onClick={() => file.isDirectory
                ? onFolderClick(file.name)
                : onFileSelect(selectedFile?.id === file.id ? null : file)
              }
            />
          ))}
        </div>
      )}
    </main>
  )
}
