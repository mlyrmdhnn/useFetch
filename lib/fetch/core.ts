import { sleep, buildQueryString } from './helpers'
import { getCache, setCache } from './cache'
import { requestInterceptors, responseInterceptors } from './interceptor'

export const fetchCore = async ({ endpoint, options, controller }: any) => {
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
    baseURL = import.meta.env.VITE_API_URL,
  } = options

  const queryString = buildQueryString(params)

  let attempts = 0

  while (attempts <= retry) {
    try {
      const resolvedPayload = typeof payload === 'function' ? await payload() : payload

      const isFormData = resolvedPayload instanceof FormData

      const cachedData = cache && getCache(cacheKey)

      if (cachedData) {
        return cachedData
      }

      controller = new AbortController()

      const timeoutId = setTimeout(() => {
        controller.abort()
      }, timeout)

      let config: RequestInit = {
        method,

        headers: {
          Accept: 'application/json',

          ...(isFormData
            ? {}
            : {
                'Content-Type': 'application/json',
              }),

          'X-Requested-With': 'XMLHttpRequest',

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

      /**
       * Request interceptors.
       */
      for (const interceptor of requestInterceptors) {
        config = await interceptor(config)
      }

      let url = ''

      try {
        const normalizedEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint

        url = new URL(normalizedEndpoint, baseURL).toString()
      } catch (err) {
        throw new Error(`
          [useFetch] Failed to create URL.
      
          Base URL : ${baseURL}
          Endpoint : ${endpoint}
      
          Example valid:
          baseURL  -> http://localhost:8080/api/
          endpoint -> /users
        `)
      }
      const response = await fetch(`${url}${queryString ? `?${queryString}` : ''}`, config)

      clearTimeout(timeoutId)

      let result = await response.json()

      /**
       * Response interceptors.
       */
      for (const interceptor of responseInterceptors) {
        result = await interceptor(result)
      }

      if (!response.ok) {
        throw result
      }

      if (cache) {
        setCache(cacheKey, result)
      }

      return result
    } catch (err) {
      attempts++

      if (attempts <= retry) {
        await sleep(retryDelay)

        continue
      }

      throw err
    }
  }
}
