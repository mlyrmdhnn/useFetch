/**
    Reactive object + file to FormData and auto-generate preview URL if needed.
 */

/**
 *
 * @param reactiveObj
 * @param fileName
 * @param fileValue
 * @param preview
 * @returns
 */
export const documentHandler = (
  reactiveObj: Record<string, any>,
  fileName: string,
  fileValue: File | Blob | null,
  preview: boolean = false,
) => {
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

  const previewValue = fileValue ? URL.createObjectURL(fileValue) : ''

  return {
    formData,
    previewValue,
  }
}
