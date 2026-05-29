export const getCache = (key: string) => {
  const data = sessionStorage.getItem(key)

  return data ? JSON.parse(data) : null
}

export const setCache = (key: string, value: any) => {
  sessionStorage.setItem(key, JSON.stringify(value))
}
