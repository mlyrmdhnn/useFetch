import { isReactive, isRef, watch } from 'vue'

export const createWatcher = (params: any, callback: () => void) => {
  if (!params) return

  if (isRef(params)) {
    watch(params, callback, {
      deep: true,
    })

    return
  } else if (isReactive(params)) {
    watch(params, callback, {
      deep: true,
    })

    return
  } else {
    watch(() => params, callback, {
      deep: true,
    })
  }
}
