import { onUnmounted } from 'vue'

export function useDebounceFn<T extends (...args: any[]) => any>(fn: T, delay = 300) {
  let timer: ReturnType<typeof setTimeout> | null = null

  const debouncedFn = (...args: Parameters<T>) => {
    clearTimeout(timer!)
    timer = setTimeout(() => {
      fn(...args)
    }, delay)
  }

  debouncedFn.cancel = () => {
    clearTimeout(timer!)
    timer = null
  }

  onUnmounted(debouncedFn.cancel)

  return debouncedFn
}
