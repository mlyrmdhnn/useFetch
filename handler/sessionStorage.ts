export const getAllSessionStorageKey = () => {
  for (let i = 0; i < sessionStorage.length; i++) {
    if (sessionStorage.length == 0) {
      console.log('session storage is still empty')
      return
    }
    const key = sessionStorage.key(i)
    console.log(`Session Storage Key : ${key}`)
  }
}

export const getAllSessionStorageInfo = () => {
  interface SessionStorage {
    data?: any
    desc: string
    timestamp?: any
    lastUpdated?: any
  }
  for (let i = 0; i < sessionStorage.length; i++) {
    if (sessionStorage.length == 0) {
      console.log('session storage is still empty')
      return
    }
    const key = sessionStorage.key(i)
    const parsed: SessionStorage = JSON.parse(sessionStorage.getItem(key ?? '') ?? '')
  }
}

const getStorageSize = (value: any) => {
  const bytes = new Blob([JSON.stringify(value)]).size
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const getValueType = (raw: string): string => {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return 'array'
    if (parsed !== null && typeof parsed === 'object') return 'object'
    return typeof parsed
  } catch {
    return 'string'
  }
}

const getEntryCount = (raw: string): number | null => {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.length
    if (parsed !== null && typeof parsed === 'object') return Object.keys(parsed).length
    return null
  } catch {
    return null
  }
}

export const getAllSessionStorage = () => {
  const result = []
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (!key) continue
    const raw = sessionStorage.getItem(key) ?? ''
    result.push({
      key,
      value: raw,
      size: getStorageSize(raw),
      type: getValueType(raw),
      entryCount: getEntryCount(raw),
      capturedAt: new Date().toISOString(),
    })
  }
  return result
}
