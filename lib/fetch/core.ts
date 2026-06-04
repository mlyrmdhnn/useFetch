import { sleep, buildQueryString } from './helpers'
import { getCache, setCache } from './cache'
import { globalConfig } from './config'
import { runStatusHooks } from './statusHooks'
import { buildDedupKey, getDedupRequest, setDedupRequest, deleteDedupRequest } from './dedup'
import type { FetchConfigInstance } from './config'
import { requestInterceptors, responseInterceptors, errorInterceptors } from './interceptor'
import type {
  InterceptorHandler,
  RequestInterceptorFn,
  ResponseInterceptorFn,
  ErrorInterceptorFn,
} from './types'

interface FetchCoreParams {
  endpoint: string
  options: any
  controller: AbortController
  instanceConfig?: FetchConfigInstance
  instanceRequestInterceptors?: InterceptorHandler<RequestInterceptorFn>[]
  instanceResponseInterceptors?: InterceptorHandler<ResponseInterceptorFn>[]
  instanceErrorInterceptors?: InterceptorHandler<ErrorInterceptorFn>[]
}

export const fetchCore = async ({
  endpoint,
  options,
  controller,
  instanceConfig,
  instanceRequestInterceptors,
  instanceResponseInterceptors,
  instanceErrorInterceptors,
}: FetchCoreParams) => {
  const config = instanceConfig ?? globalConfig

  const {
    method = 'GET',
    params = {},
    payload = null,
    credentials = false,
    headers = {},
    timeout = 10000,
    retry = 0,
    retryDelay = 1000,
    cache = false,
    cacheKey,
    baseURL = config.baseURL,
    dedup = false,
    skipInterceptor = false,
  } = options

  const reqInterceptors = [...requestInterceptors, ...(instanceRequestInterceptors ?? [])]
  const resInterceptors = [...responseInterceptors, ...(instanceResponseInterceptors ?? [])]
  const errInterceptors = [...errorInterceptors, ...(instanceErrorInterceptors ?? [])]

  const queryString = buildQueryString(params)

  /**
   * Core fetch logic extracted so dedup can wrap it.
   */

  if (!endpoint || endpoint.trim() === '') {
    throw new Error(
      `[useFetch] endpoint is required.\n\n` + `Example:\n\n` + `  useFetch('/users')\n`,
    )
  }

  if (!baseURL && !endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    throw new Error(
      `[useFetch] baseURL is not set.\n\n` +
        `Set it in main.ts:\n\n` +
        `  useFetch.baseURL('https://your-api.com/api/')\n\n` +
        `or pass it per request:\n\n` +
        `  useFetch('/users', { baseURL: 'https://your-api.com/api/' })\n`,
    )
  }

  let url = ''
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    url = endpoint
  } else {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
    try {
      url = new URL(normalizedEndpoint, baseURL).toString()
    } catch {
      throw new Error(
        `[useFetch] Failed to build URL.\n\n` +
          `  baseURL : ${baseURL}\n` +
          `  endpoint: ${endpoint}\n`,
      )
    }
  }

  const runFetch = async (): Promise<any> => {
    let attempts = 0

    while (attempts <= retry) {
      try {
        const resolvedPayload = typeof payload === 'function' ? await payload() : payload
        const isFormData = resolvedPayload instanceof FormData

        const cachedData = cache && getCache(cacheKey)
        if (cachedData) return cachedData

        controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        let fetchConfig: RequestInit = {
          method,
          headers: {
            Accept: 'application/json',
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            'X-Requested-With': 'XMLHttpRequest',
            ...globalConfig.headers,
            ...config.headers,
            ...headers,
          },
          credentials: credentials ? 'include' : 'same-origin',
          signal: controller.signal,
          body:
            method !== 'GET'
              ? isFormData
                ? resolvedPayload
                : JSON.stringify(resolvedPayload)
              : undefined,
        }

        if (!skipInterceptor) {
          for (const interceptor of reqInterceptors) {
            fetchConfig = await interceptor.fn(fetchConfig)
          }
        }

        const response = await fetch(`${url}${queryString ? `?${queryString}` : ''}`, fetchConfig)

        clearTimeout(timeoutId)

        let result = await response.json()

        for (const interceptor of resInterceptors) {
          result = await interceptor.fn(result)
        }

        if (!response.ok) {
          await runStatusHooks(response.status, result)
          const instanceHooks = instanceConfig?.statusHooks ?? []
          for (const hook of instanceHooks) {
            if (hook.status === response.status) {
              await hook.fn(result)
            }
          }
          throw result
        }

        if (cache) setCache(cacheKey, result)

        return result
      } catch (err) {
        attempts++

        if (attempts <= retry) {
          await sleep(retryDelay)
          continue
        }

        let finalError = err
        if (!skipInterceptor) {
          for (const interceptor of errInterceptors) {
            finalError = await interceptor.fn(finalError)
          }
        }

        throw finalError
      }
    }
  }

  /**
   * Deduplication — only for GET requests.
   * If same request is already in-flight, return existing promise.
   */
  if (dedup && method === 'GET') {
    const dedupKey = buildDedupKey(endpoint, method, params)
    const existing = getDedupRequest(dedupKey)

    if (existing) {
      return existing
    }

    const promise = runFetch().finally(() => deleteDedupRequest(dedupKey))
    setDedupRequest(dedupKey, promise)
    return promise
  }

  return runFetch()
}
