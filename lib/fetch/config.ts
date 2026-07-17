import type { HttpHeaders } from './types'
import { registerStatusHook } from './statusHooks'
type StatusHookFn = (error: any) => void | Promise<void>

export interface FetchConfigInstance {
  baseURL: string
  headers: HttpHeaders
  statusHooks: { status: number; fn: StatusHookFn }[]
}

export const globalConfig: FetchConfigInstance = {
  baseURL: import.meta.env.VITE_API_URL ?? '',
  headers: {},
  statusHooks: [],
}

export const createConfig = (initial?: Partial<FetchConfigInstance>): FetchConfigInstance => ({
  baseURL: initial?.baseURL ?? import.meta.env.VITE_API_URL ?? '',
  headers: initial?.headers ?? {},
  statusHooks: [],
})

export const fetchConfig = {
  baseURL(url: string) {
    globalConfig.baseURL = url
  },
  getBaseURL() {
    return globalConfig.baseURL
  },
  headers(headers: HttpHeaders) {
    globalConfig.headers = {
      ...globalConfig.headers,
      ...headers,
    }
  },
  getHeaders() {
    return globalConfig.headers
  },
  onError(status: number, fn: StatusHookFn) {
    registerStatusHook(status, fn)
  },
}
