import { useState, useEffect } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import FileList from './components/FileList'
import FilePreview from './components/FilePreview'
import Login from './components/Login'
import UserManager from './components/UserManager'
import { authFetch } from './utils/authFetch'
import './App.css'

function decodeJwtPayload(token) {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'))
  const [userManagerOpen, setUserManagerOpen] = useState(false)

  const [containers, setContainers]           = useState([])
  const [containersError, setContainersError] = useState(null)

  const [selectedContainer, setSelectedContainer] = useState(null)
  const [currentPath, setCurrentPath]             = useState([])
  const [selectedFile, setSelectedFile]           = useState(null)
  const [viewMode, setViewMode]                   = useState('list')
  const [searchQuery, setSearchQuery]             = useState('')

  const [files, setFiles]               = useState([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [filesError, setFilesError]     = useState(null)

  const payload     = token ? decodeJwtPayload(token) : null
  const currentUser = payload?.sub ?? null
  const isAdmin     = payload?.role === 'admin'

  function handleLogin(newToken) {
    localStorage.setItem('auth_token', newToken)
    setToken(newToken)
  }

  function handleLogout() {
    localStorage.removeItem('auth_token')
    setToken(null)
    setContainers([])
    setContainersError(null)
    setSelectedContainer(null)
    setFiles([])
    setSelectedFile(null)
    setUserManagerOpen(false)
  }

  // Fetch container list on mount / token change
  useEffect(() => {
    if (!token) return
    authFetch('/api/containers', token)
      .then(r => {
        if (r.status === 401) { handleLogout(); return null }
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
        return r.json()
      })
      .then(data => data && setContainers(data))
      .catch(err => setContainersError(err.message))
  }, [token])

  // Fetch files whenever selected container changes
  useEffect(() => {
    if (!selectedContainer || !token) return
    setFilesLoading(true)
    setFilesError(null)
    setFiles([])
    authFetch(`/api/containers/${encodeURIComponent(selectedContainer.id)}/files`, token)
      .then(r => {
        if (r.status === 401) { handleLogout(); return null }
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
        return r.json()
      })
      .then(data => { if (data) { setFiles(data); setFilesLoading(false) } })
      .catch(err => { setFilesError(err.message); setFilesLoading(false) })
  }, [selectedContainer, token])

  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function handleContainerSelect(container) {
    setSelectedContainer(container)
    setCurrentPath([])
    setSelectedFile(null)
    setSearchQuery('')
  }

  if (!token) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <>
      <div className="app">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onLogout={handleLogout}
          isAdmin={isAdmin}
          onManageUsers={() => setUserManagerOpen(true)}
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
              token={token}
              onClose={() => setSelectedFile(null)}
              onUnauthorized={handleLogout}
            />
          )}
        </div>
      </div>
      {userManagerOpen && (
        <UserManager
          token={token}
          currentUser={currentUser}
          onClose={() => setUserManagerOpen(false)}
        />
      )}
    </>
  )
}

export default App
