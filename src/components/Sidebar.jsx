import { IconDatabase } from './Icons'
import './Sidebar.css'

export default function Sidebar({ containers, containersError, selectedContainer, onContainerSelect }) {
  return (
    <aside className="sidebar">
      <nav className="sidebar-section">
        <div className="sidebar-section-header">Containers</div>
        {containersError ? (
          <p className="sidebar-error">Could not connect to API</p>
        ) : containers.length === 0 ? (
          <p className="sidebar-empty">No containers found</p>
        ) : (
          <ul className="sidebar-list">
            {containers.map(container => (
              <li key={container.id}>
                <button
                  className={`sidebar-item ${selectedContainer?.id === container.id ? 'active' : ''}`}
                  onClick={() => onContainerSelect(container)}
                >
                  <span className="sidebar-item-icon"><IconDatabase /></span>
                  <span className="sidebar-item-name">{container.name}</span>
                  <span className="sidebar-item-count">{container.fileCount}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-footer-text">v0.1.0</span>
      </div>
    </aside>
  )
}
