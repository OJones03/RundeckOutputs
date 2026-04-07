/**
 * Wrapper around fetch() that injects the Authorization header.
 */
export function authFetch(url, token, options = {}) {
  const headers = {
    ...(options.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  return fetch(url, { ...options, headers })
}

/**
 * Fetch a file with auth and trigger a browser download via a blob URL.
 */
export async function downloadWithAuth(url, filename, token) {
  const res = await authFetch(url, token)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000)
}

/**
 * Fetch a file with auth and open it in a new browser tab via a blob URL.
 */
export async function openWithAuth(url, token) {
  const res = await authFetch(url, token)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  window.open(blobUrl, '_blank', 'noopener,noreferrer')
  setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000)
}
