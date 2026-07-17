import { useFetch } from '../http/useFetch'
import type { HttpOptions } from '../lib/fetch/types'
interface HttpAuthOptions extends HttpOptions {
  csrf?: boolean
  csrfUrl?: string
  csrfBaseUrl?: string
}

let isAuthCached: any = null
const useAuth = () => {}

let redirectIfUnauth = ''

useAuth.redirectIfUnauthenticated = (url: string = '/') => {
  redirectIfUnauth = url
}

const baseAuth = (url: string, options: HttpAuthOptions = {}) => {
  return useFetch(url, { ...options })
}

useAuth.setAuthStatus = (status: boolean | null) => {
  isAuthCached = status
}

useAuth.login = (url: string, options: HttpAuthOptions = {}) => {
  const fetchInstance = baseAuth(url, options)

  const originalExecute = fetchInstance.execute

  fetchInstance.execute = async () => {
    if (options.csrf) {
      await useFetch(options.csrfUrl ?? '', {
        credentials: true,
        skipInterceptor: true,
        baseURL: options.csrfBaseUrl?.trim() ? options.csrfBaseUrl : '',
      }).execute()
    }

    return originalExecute()
  }

  return fetchInstance
}

useAuth.checkAuth = async (url: string, options: HttpAuthOptions = {}) => {
  if (isAuthCached !== null) {
    return {
      isAuthenticated: isAuthCached,
      path: isAuthCached ? null : redirectIfUnauth || '/',
    }
  }

  const fetcher = baseAuth(url, { ...options, skipInterceptor: true, immediate: false })
  await fetcher.execute()
  if (fetcher.statusCode.value === 200) {
    isAuthCached = true

    return { isAuthenticated: true, path: null }
  } else {
    isAuthCached = false
    return { isAuthenticated: false, path: redirectIfUnauth || '/' }
  }
}
export default useAuth
