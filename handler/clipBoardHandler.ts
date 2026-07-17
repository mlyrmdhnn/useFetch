import { toast } from './toast'

export const copyToClipboard = async (text: string, message = 'Copied to clipboard') => {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(message)
  } catch {
    toast.error('Failed to copy')
  }
}
