import { useState, useEffect } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import FileList from './components/FileList'
import FilePreview from './components/FilePreview'
import './App.css'

function App() {
  const [containers, setContainers]           = useState([])
  const [containersError, setContainersError] = useState(null)

  const [selectedContainer, setSelectedContainer] = useState(null)
  const [currentPath, setCurrentPath]             = useState([])
  const [selectedFile, setSelectedFile]           = useState(null)
  const [viewMode, setViewMode]                   = useState('list')
  const [searchQuery, setSearchQuery]             = useState('')

  const [files, setFiles]           = useState([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [filesError, setFilesError]     = useState(null)

  // Fetch container list on mount
  useEffect(() => {
    fetch('/api/containers')
      .then(r => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
        return r.json()
      })
      .then(setContainers)
      .catch(err => setContainersError(err.message))
  }, [])

  // Fetch files whenever selected container changes
  useEffect(() => {
    if (!selectedContainer) return
    setFilesLoading(true)
    setFilesError(null)
    setFiles([])
    fetch(`/api/containers/${encodeURIComponent(selectedContainer.id)}/files`)
      .then(r => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
        return r.json()
      })
      .then(data => { setFiles(data); setFilesLoading(false) })
      .catch(err => { setFilesError(err.message); setFilesLoading(false) })
  }, [selectedContainer])

  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function handleContainerSelect(container) {
    setSelectedContainer(container)
    setCurrentPath([])
    setSelectedFile(null)
    setSearchQuery('')
  }

  return (
    <div className="app">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      <div className="app-body">
        <Sidebar
          containers={containers}
          containersError={containersError}
          selectedContainer={selectedContainer}
          onContainerSelect={handleContainerSelect}
        />
        <FileList
          files={filteredFiles}
          loading={filesLoading}
          error={filesError}
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
          currentPath={currentPath}
          onPathChange={setCurrentPath}
          selectedContainer={selectedContainer}
          viewMode={viewMode}
          searchQuery={searchQuery}
        />
        {selectedFile && (
          <FilePreview
            file={selectedFile}
            containerId={selectedContainer?.id}
            onClose={() => setSelectedFile(null)}
          />
        )}
      </div>
    </div>
  )
}

export default App
