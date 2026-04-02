export function getFileCategory(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  const map = {
    log:  'log',
    txt:  'text', md: 'text',
    json: 'code', xml: 'code', yaml: 'code', yml: 'code',
    js:   'code', ts: 'code', py: 'code', sh: 'code',
    csv:  'data', xls: 'data', xlsx: 'data',
    pdf:  'doc', doc: 'doc', docx: 'doc', ppt: 'doc', pptx: 'doc',
    zip:  'archive', tar: 'archive', gz: 'archive',
    jpg:  'image', jpeg: 'image', png: 'image', gif: 'image', svg: 'image',
  }
  return map[ext] ?? 'default'
}

export function getFileExt(filename) {
  return filename.split('.').pop().toUpperCase()
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    year:   'numeric',
    month:  'short',
    day:    'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

export function getFileTypeLabel(mimeType, filename) {
  const ext = filename.split('.').pop().toUpperCase()
  const labels = {
    'text/plain':       `${ext} Text File`,
    'text/csv':         'CSV Spreadsheet',
    'application/json': 'JSON Document',
    'application/pdf':  'PDF Document',
    'application/gzip': 'GZip Archive',
    'application/zip':  'ZIP Archive',
    'application/vnd.ms-excel': 'Excel Spreadsheet',
    'application/vnd.openxmlformats': 'Excel Spreadsheet',
  }
  return labels[mimeType] ?? `${ext} File`
}
