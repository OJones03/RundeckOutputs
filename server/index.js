import express from 'express'
import fs from 'fs'
import path from 'path'
import { createReadStream } from 'fs'
import { timingSafeEqual, createHash } from 'crypto'
import jwt from 'jsonwebtoken'

const app = express()
const DATA_DIR   = '/outputs'
const PORT       = process.env.PORT || 3001
const STATIC_DIR = process.env.STATIC_DIR || path.join(process.cwd(), 'public')

// ── Auth configuration ────────────────────────────────────────────────────────
const JWT_SECRET   = process.env.JWT_SECRET
const APP_USERNAME = process.env.APP_USERNAME || 'admin'
const APP_PASSWORD = process.env.APP_PASSWORD

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET env var is not set. Refusing to start.')
  process.exit(1)
}
if (!APP_PASSWORD) {
  console.error('FATAL: APP_PASSWORD env var is not set. Refusing to start.')
  process.exit(1)
}

// Constant-time string comparison to resist timing attacks
function safeEqual(a, b) {
  const bufA = createHash('sha256').update(a).digest()
  const bufB = createHash('sha256').update(b).digest()
  return timingSafeEqual(bufA, bufB)
}

// ── POST /api/login ───────────────────────────────────────────────────────────
app.post('/api/login', express.json(), (req, res) => {
  const { username, password } = req.body ?? {}
  if (
    typeof username === 'string' && typeof password === 'string' &&
    safeEqual(username, APP_USERNAME) && safeEqual(password, APP_PASSWORD)
  ) {
    const token = jwt.sign({ sub: username }, JWT_SECRET, { expiresIn: '8h' })
    return res.json({ token })
  }
  res.status(401).json({ error: 'Invalid credentials' })
})

// ── JWT authentication middleware ─────────────────────────────────────────────
function authenticate(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    jwt.verify(auth.slice(7), JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

// ── Security: strip path traversal characters from any user-supplied segment ──
function safeName(name) {
  return path.basename(decodeURIComponent(name))
}

function resolveContainerPath(containerId) {
  if (containerId === '__root__') return path.resolve(DATA_DIR)
  const safe = safeName(containerId)
  const resolved = path.resolve(DATA_DIR, safe)
  // Ensure the resolved path stays inside DATA_DIR
  if (!resolved.startsWith(path.resolve(DATA_DIR) + path.sep) &&
       resolved !== path.resolve(DATA_DIR)) {
    return null
  }
  return resolved
}

function resolveFilePath(containerId, filename) {
  const containerPath = resolveContainerPath(containerId)
  if (!containerPath) return null
  const safeFile = safeName(filename)
  const resolved = path.resolve(containerPath, safeFile)
  if (!resolved.startsWith(containerPath + path.sep)) return null
  return resolved
}

// ── MIME type map ──────────────────────────────────────────────────────────────
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

// ── GET /api/health ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', dataDir: DATA_DIR })
})

// ── All /api/containers/* routes require a valid JWT ──────────────────────────
app.use('/api/containers', authenticate)

// ── GET /api/containers ────────────────────────────────────────────────────────
app.get('/api/containers', (_req, res) => {
  try {
    const entries = fs.readdirSync(DATA_DIR, { withFileTypes: true })
    const containers = []

    // Files directly in DATA_DIR → expose as a root container
    const rootFiles = entries.filter(e => e.isFile())
    if (rootFiles.length > 0) {
      containers.push({ id: '__root__', name: path.basename(DATA_DIR), fileCount: rootFiles.length })
    }

    // Subdirectories as additional containers
    entries.filter(e => e.isDirectory()).forEach(e => {
      let fileCount = 0
      try {
        fileCount = fs
          .readdirSync(path.join(DATA_DIR, e.name), { withFileTypes: true })
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

// ── GET /api/containers/:id/files ─────────────────────────────────────────────
app.get('/api/containers/:id/files', (req, res) => {
  const containerPath = resolveContainerPath(req.params.id)
  if (!containerPath || !fs.existsSync(containerPath)) {
    return res.status(404).json({ error: 'Container not found' })
  }

  try {
    const entries = fs.readdirSync(containerPath, { withFileTypes: true })
    const files = entries
      .filter(e => e.isFile())
      .map(e => {
        const stat = fs.statSync(path.join(containerPath, e.name))
        return {
          id:       e.name,
          name:     e.name,
          type:     getMime(e.name),
          size:     stat.size,
          modified: stat.mtime.toISOString(),
          path:     '/',
        }
      })
      .sort((a, b) => new Date(b.modified) - new Date(a.modified))

    res.json(files)
  } catch (err) {
    console.error(`GET /api/containers/${req.params.id}/files:`, err.message)
    res.status(500).json({ error: 'Could not read container' })
  }
})

// ── GET /api/containers/:id/files/:filename/download ──────────────────────────
app.get('/api/containers/:id/files/:filename/download', (req, res) => {
  const filePath = resolveFilePath(req.params.id, req.params.filename)
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' })
  }

  const stat = fs.statSync(filePath)
  const filename = path.basename(filePath)

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Content-Type', getMime(filename))
  res.setHeader('Content-Length', stat.size)

  createReadStream(filePath).pipe(res)
})

// ── GET /api/containers/:id/files/:filename/view ─────────────────────────────
app.get('/api/containers/:id/files/:filename/view', (req, res) => {
  const filePath = resolveFilePath(req.params.id, req.params.filename)
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' })
  }

  const stat = fs.statSync(filePath)
  const filename = path.basename(filePath)

  res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
  res.setHeader('Content-Type', getMime(filename))
  res.setHeader('Content-Length', stat.size)

  createReadStream(filePath).pipe(res)
})

// ── Serve React static build (must be AFTER all /api/ routes) ────────────────
if (fs.existsSync(STATIC_DIR)) {
  app.use(express.static(STATIC_DIR))
  // SPA fallback — any unmatched GET returns index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(STATIC_DIR, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Storage Viewer  —  port ${PORT}  —  data: ${DATA_DIR}  —  static: ${STATIC_DIR}`)
})
