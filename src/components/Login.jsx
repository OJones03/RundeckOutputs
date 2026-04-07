import { useState } from 'react'
import logo from '../assets/elementlogo.png'
import './Login.css'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password }),
      })
      if (res.status === 401) {
        setError('Invalid username or password.')
        return
      }
      if (!res.ok) {
        setError(`Server error: ${res.status} ${res.statusText}`)
        return
      }
      const { token } = await res.json()
      onLogin(token)
    } catch (err) {
      setError('Could not reach the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img src={logo} alt="Element logo" className="login-logo-img" />
          <span className="login-logo-text">Storage Viewer</span>
        </div>

        <h1 className="login-title">Sign in</h1>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label className="login-label" htmlFor="login-username">Username</label>
            <input
              id="login-username"
              className="login-input"
              type="text"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className="login-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {error && <p className="login-error" role="alert">{error}</p>}

          <button className="login-btn" type="submit" disabled={loading || !username || !password}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
