import type {
  RequestInterceptorFn,
  ResponseInterceptorFn,
  ErrorInterceptorFn,
  InterceptorHandler,
} from './types'

let idCounter = 0

export const createInterceptor = () => {
  const requestInterceptors: InterceptorHandler<RequestInterceptorFn>[] = []
  const responseInterceptors: InterceptorHandler<ResponseInterceptorFn>[] = []
  const errorInterceptors: InterceptorHandler<ErrorInterceptorFn>[] = []

  const interceptor = {
    request: {
      use(fn: RequestInterceptorFn): number {
        const id = ++idCounter
        requestInterceptors.push({ id, fn })
        return id
      },
      eject(id: number): void {
        const index = requestInterceptors.findIndex((i) => i.id === id)
        if (index !== -1) requestInterceptors.splice(index, 1)
      },
    },
    response: {
      use(fn: ResponseInterceptorFn): number {
        const id = ++idCounter
        responseInterceptors.push({ id, fn })
        return id
      },
      eject(id: number): void {
        const index = responseInterceptors.findIndex((i) => i.id === id)
        if (index !== -1) responseInterceptors.splice(index, 1)
      },
    },
    error: {
      use(fn: ErrorInterceptorFn): number {
        const id = ++idCounter
        errorInterceptors.push({ id, fn })
        return id
      },
      eject(id: number): void {
        const index = errorInterceptors.findIndex((i) => i.id === id)
        if (index !== -1) errorInterceptors.splice(index, 1)
      },
    },
  }

  return {
    interceptor,
    requestInterceptors,
    responseInterceptors,
    errorInterceptors,
  }
}

// global instance interceptors
export const {
  interceptor: fetchInterceptor,
  requestInterceptors,
  responseInterceptors,
  errorInterceptors,
} = createInterceptor()
