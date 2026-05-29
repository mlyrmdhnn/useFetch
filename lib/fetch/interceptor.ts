const requestInterceptors: Function[] = []
const responseInterceptors: Function[] = []

export const fetchInterceptor = {
  request: {
    use(callback: Function) {
      requestInterceptors.push(callback)
    },
  },

  response: {
    use(callback: Function) {
      responseInterceptors.push(callback)
    },
  },
}

export { requestInterceptors, responseInterceptors }
