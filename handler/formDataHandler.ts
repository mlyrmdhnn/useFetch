/**
    Reactive object + file to FormData and auto-generate preview URL if needed.
 */

/**
 *
 * @param reactiveObj
 * @param fileName
 * @param fileValue
 * @param preview
 */

export function documentHandler(
  reactiveObj: Record<string, any>,
  fileName: string,
  fileValue: File | Blob | null,
  preview?: false,
): FormData

export function documentHandler(
  reactiveObj: Record<string, any>,
  fileName: string,
  fileValue: File | Blob | null,
  preview: true,
): { formData: FormData; previewValue: string }

export function documentHandler(
  reactiveObj: Record<string, any>,
  fileName: string,
  fileValue: File | Blob | null,
  preview: boolean = false,
): any {
  const formData = new FormData()

  for (const key in reactiveObj) {
    if (Object.prototype.hasOwnProperty.call(reactiveObj, key)) {
      const value = reactiveObj[key]
      if (value !== undefined && value !== null) {
        formData.append(
          key,
          typeof value === 'object' && !(value instanceof Blob)
            ? JSON.stringify(value)
            : String(value),
        )
      }
    }
  }

  if (fileValue) {
    formData.append(fileName, fileValue)
  }

  if (!preview) {
    return formData
  }

  return {
    formData,
    previewValue: fileValue ? URL.createObjectURL(fileValue) : '',
  }
}
