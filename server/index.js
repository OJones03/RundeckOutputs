import express from 'express'
import fs from 'fs'
import path from 'path'
import { createReadStream } from 'fs'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const app = express()
const OUTPUTS_DIR = process.env.OUTPUTS_DIR || '/outputs'
const PORT        = process.env.PORT || 3001
const STATIC_DIR  = process.env.STATIC_DIR || path.join(process.cwd(), 'public')

// ── Auth configuration ────────────────────────────────────────────────────────
const JWT_SECRET  = process.env.JWT_SECRET
const JWT_EXPIRY  = process.env.JWT_EXPIRY || '8h'
const BCRYPT_ROUNDS = 10

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET env var is not set. Refusing to start.')
  process.exit(1)
}

// ── User store ────────────────────────────────────────────────────────────────
const DATA_DIR   = process.env.DATA_DIR || '/data'
const USERS_FILE = path.join(DATA_DIR, 'users.json')

function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'))
  } catch {
    return null
  }
}

function saveUsers(users) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))
}

// Bootstrap initial admin from env vars if no users file exists yet
async function bootstrap() {
  if (loadUsers()) return
  const username = process.env.AUTH_USERNAME || process.env.APP_USERNAME || 'admin'
  const password = process.env.AUTH_PASSWORD || process.env.APP_PASSWORD || 'admin'
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  saveUsers([{ username, passwordHash: hash, role: 'admin' }])
  console.log(`Bootstrapped users file with admin user "${username}"`)
}

await bootstrap()

app.use(express.json())

// ── Auth middleware ───────────────────────────────────────────────────────────
function authenticate(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
  next()
}

// ── POST /api/login ───────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body ?? {}
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }

  const users = loadUsers() ?? []
  const user  = users.find(u => u.username === username)

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid username or password' })
  }

  const token = jwt.sign({ sub: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRY })
  res.json({ token })
})

// ── User management endpoints (admin only) ────────────────────────────────────

// List users
app.get('/api/users', authenticate, requireAdmin, (req, res) => {
  const users = loadUsers() ?? []
  res.json(users.map(({ username, role }) => ({ username, role })))
})

// Create user
app.post('/api/users', authenticate, requireAdmin, async (req, res) => {
  const { username, password, role } = req.body ?? {}
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }
  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: "Role must be 'admin' or 'user'" })
  }
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(username)) {
    return res.status(400).json({ error: 'Username may only contain letters, numbers, hyphens and underscores (max 64 chars)' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  const users = loadUsers() ?? []
  if (users.find(u => u.username === username)) {
    return res.status(409).json({ error: 'Username already exists' })
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  users.push({ username, passwordHash, role })
  saveUsers(users)
  res.status(201).json({ username, role })
})

// Delete user
app.delete('/api/users/:username', authenticate, requireAdmin, (req, res) => {
  const { username } = req.params
  if (username === req.user.sub) {
    return res.status(400).json({ error: 'Cannot delete your own account' })
  }

  const users = loadUsers() ?? []
  const idx   = users.findIndex(u => u.username === username)
  if (idx === -1) return res.status(404).json({ error: 'User not found' })

  users.splice(idx, 1)
  saveUsers(users)
  res.sendStatus(204)
})

// Change password (admin can change anyone's; user can change their own)
app.put('/api/users/:username/password', authenticate, async (req, res) => {
  const { username } = req.params
  const { password }  = req.body ?? {}

  if (req.user.role !== 'admin' && req.user.sub !== username) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  const users = loadUsers() ?? []
  const user  = users.find(u => u.username === username)
  if (!user) return res.status(404).json({ error: 'User not found' })

  user.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  saveUsers(users)
  res.sendStatus(204)
})

// ── Security: path resolution helpers ────────────────────────────────────────
function safeName(name) {
  return path.basename(decodeURIComponent(name))
}

function resolveContainerPath(containerId) {
  if (containerId === '__root__') return path.resolve(OUTPUTS_DIR)
  const safe     = safeName(containerId)
  const resolved = path.resolve(OUTPUTS_DIR, safe)
  const root     = path.resolve(OUTPUTS_DIR)
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null
  return resolved
}

// Resolve a subpath (e.g. "a/b/c") within a container, rejecting traversal.
function resolveSubPath(containerId, subpath) {
  const containerPath = resolveContainerPath(containerId)
  if (!containerPath) return null
  if (!subpath) return containerPath

  let current = containerPath
  for (const seg of subpath.split('/').filter(Boolean)) {
    current = path.resolve(current, path.basename(seg))
    if (!current.startsWith(path.resolve(OUTPUTS_DIR) + path.sep) &&
         current !== path.resolve(OUTPUTS_DIR)) return null
  }
  return current
}

function resolveFilePath(containerId, subpath, filename) {
  const dirPath = resolveSubPath(containerId, subpath)
  if (!dirPath) return null
  const resolved = path.resolve(dirPath, path.basename(filename))
  if (!resolved.startsWith(path.resolve(OUTPUTS_DIR) + path.sep)) return null
  return resolved
}

// ── MIME type map ─────────────────────────────────────────────────────────────
function getMime(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  const map = {
    log: 'text/plain', txt: 'text/plain', md: 'text/plain',
    json: 'application/json', xml: 'application/xml',
    yaml: 'text/yaml', yml: 'text/yaml',
    csv: 'text/csv',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    zip: 'application/zip',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    js: 'text/javascript', ts: 'text/plain',
    py: 'text/x-python', sh: 'text/x-sh',
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', gif: 'image/gif', svg: 'image/svg+xml',
  }
  return map[ext] ?? 'application/octet-stream'
}

// ── GET /api/health ───────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', dataDir: OUTPUTS_DIR })
})

// ── All /api/containers/* routes require a valid JWT ─────────────────────────
app.use('/api/containers', authenticate)

// ── GET /api/containers ───────────────────────────────────────────────────────
app.get('/api/containers', (_req, res) => {
  try {
    const entries = fs.readdirSync(OUTPUTS_DIR, { withFileTypes: true })
    const containers = []

    const rootFiles = entries.filter(e => e.isFile())
    if (rootFiles.length > 0) {
      containers.push({ id: '__root__', name: path.basename(OUTPUTS_DIR), fileCount: rootFiles.length })
    }

    entries.filter(e => e.isDirectory()).forEach(e => {
      let fileCount = 0
      try {
        fileCount = fs
          .readdirSync(path.join(OUTPUTS_DIR, e.name), { withFileTypes: true })
          .filter(f => f.isFile()).length
      } catch { /* unreadable subdirectory — skip count */ }
      containers.push({ id: e.name, name: e.name, fileCount })
    })

    res.json(containers)
  } catch (err) {
    console.error('GET /api/containers:', err.message)
    res.status(500).json({ error: 'Could not read data directory' })
  }
})

// ── GET /api/containers/:id/files ────────────────────────────────────────────
app.get('/api/containers/:id/files', (req, res) => {
  const subpath  = req.query.subpath || ''
  const dirPath  = resolveSubPath(req.params.id, subpath)
  if (!dirPath || !fs.existsSync(dirPath)) {
    return res.status(404).json({ error: 'Container not found' })
  }

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    const pathLabel = subpath ? `/${subpath}/` : '/'

    const dirs = entries
      .filter(e => e.isDirectory())
      .map(e => {
        const stat = fs.statSync(path.join(dirPath, e.name))
        return {
          id:          e.name,
          name:        e.name,
          isDirectory: true,
          modified:    stat.mtime.toISOString(),
          path:        pathLabel,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))

    const files = entries
      .filter(e => e.isFile())
      .map(e => {
        const stat = fs.statSync(path.join(dirPath, e.name))
        return {
          id:       e.name,
          name:     e.name,
          type:     getMime(e.name),
          size:     stat.size,
          modified: stat.mtime.toISOString(),
          path:     pathLabel,
        }
      })
      .sort((a, b) => new Date(b.modified) - new Date(a.modified))

    res.json([...dirs, ...files])
  } catch (err) {
    console.error(`GET /api/containers/${req.params.id}/files:`, err.message)
    res.status(500).json({ error: 'Could not read container' })
  }
})

// ── GET /api/containers/:id/files/:filename/download ─────────────────────────
app.get('/api/containers/:id/files/:filename/download', (req, res) => {
  const filePath = resolveFilePath(req.params.id, req.query.subpath || '', req.params.filename)
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' })
  }

  const stat     = fs.statSync(filePath)
  const filename = path.basename(filePath)

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Content-Type', getMime(filename))
  res.setHeader('Content-Length', stat.size)

  createReadStream(filePath).pipe(res)
})

// ── GET /api/containers/:id/files/:filename/view ─────────────────────────────
app.get('/api/containers/:id/files/:filename/view', (req, res) => {
  const filePath = resolveFilePath(req.params.id, req.query.subpath || '', req.params.filename)
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' })
  }

  const stat     = fs.statSync(filePath)
  const filename = path.basename(filePath)

  res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
  res.setHeader('Content-Type', getMime(filename))
  res.setHeader('Content-Length', stat.size)

  createReadStream(filePath).pipe(res)
})

// ── Serve React static build (must be AFTER all /api/ routes) ────────────────
if (fs.existsSync(STATIC_DIR)) {
  app.use(express.static(STATIC_DIR))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(STATIC_DIR, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Rundeck Outputs  —  port ${PORT}  —  outputs: ${OUTPUTS_DIR}  —  data: ${DATA_DIR}`)
})
