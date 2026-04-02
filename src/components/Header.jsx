import { IconSearch, IconClose, IconList, IconGrid } from './Icons'
import logo from '../assets/elementlogo.png'
import './Header.css'

export default function Header({ searchQuery, onSearchChange, viewMode, onViewModeChange }) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="header-logo">
          <img src={logo} alt="Element logo" className="header-logo-img" />
          <span className="header-logo-text">Storage Viewer</span>
        </div>
      </div>

      <div className="header-center">
        <div className="search-container">
          <span className="search-icon"><IconSearch /></span>
          <input
            className="search-input"
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            aria-label="Search files"
          />
          {searchQuery && (
            <button
              className="search-clear"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              <IconClose />
            </button>
          )}
        </div>
      </div>

      <div className="header-right">
        <div className="view-toggle" role="group" aria-label="View mode">
          <button
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => onViewModeChange('list')}
            title="List view"
            aria-pressed={viewMode === 'list'}
          >
            <IconList />
          </button>
          <button
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => onViewModeChange('grid')}
            title="Grid view"
            aria-pressed={viewMode === 'grid'}
          >
            <IconGrid />
          </button>
        </div>
      </div>
    </header>
  )
}
