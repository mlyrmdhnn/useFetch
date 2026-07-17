import { reactive } from 'vue'

export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  mode: 'dark' | 'light'
}

export const toastState = reactive<{ toasts: Toast[] }>({
  toasts: [],
})

export const toast = {
  add(
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    mode: 'dark' | 'light' = 'dark',
  ) {
    const id = Date.now()
    toastState.toasts.push({ id, message, type, mode })
    setTimeout(() => this.remove(id), 3000)
  },
  remove(id: number) {
    toastState.toasts = toastState.toasts.filter((t) => t.id !== id)
  },
  success(msg: string, mode: 'dark' | 'light' = 'dark') {
    this.add(msg, 'success', mode)
  },
  error(msg: string, mode: 'dark' | 'light' = 'dark') {
    this.add(msg, 'error', mode)
  },
  info(msg: string, mode: 'dark' | 'light' = 'dark') {
    this.add(msg, 'info', mode)
  },
  warning(msg: string, mode: 'dark' | 'light' = 'dark') {
    this.add(msg, 'warning', mode)
  },
}
