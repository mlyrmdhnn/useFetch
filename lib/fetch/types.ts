export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface HttpHeaders {
  Authorization?: string
  Accept?: string
  'Content-Type'?: string
  'X-CSRF-TOKEN'?: string
  'X-XSRF-TOKEN'?: string
  'X-Requested-With'?: string
  'X-API-KEY'?: string
  'Accept-Language'?: string
  'Cache-Control'?: string

  [key: string]: string | undefined
}

export interface HttpOptions {
  method?: HttpMethod

  params?: Record<string, any>

  payload?: any

  immediate?: boolean

  pagination?: boolean

  watchParams?: boolean

  credentials?: boolean

  baseURL?: string

  pick?: string

  transform?: (data: any) => any

  timeout?: number

  cache?: boolean

  cacheKey?: string

  retry?: number

  retryDelay?: number

  onBeforeRequest?: (payload: any) => void

  onSuccess?: (data: any) => void

  onError?: (error: any) => void

  onFinally?: () => void

  headers?: HttpHeaders

  xsrfCookieName?: string

  xsrfHeaderName?: string
}
