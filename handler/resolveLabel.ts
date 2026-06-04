export interface PaginationConfig {
  /**
   * Css class for navigation button.
   * Example (Previous and Next)
   */
  navButton?: string
  /**
   * Css class for number button(1,2,3).
   */
  numberButton?: string
  /**
   * Is the button on current page.
   */
  active?: string
}

/**
   * Resolve Laravel pagination link into clean label and contextual CSS classes.
   * 
   * @example
   * ```ts
   * import { resolvePaginationLink } from './resolvePagination'
   * 
   * const pageStyles = {
   *   navButton: 'px-4 py-2 bg-gray-100 text-gray-700 rounded-lg',
   *   numberButton: 'px-3 py-2 bg-white text-gray-600 border rounded-md',
   *   active: 'bg-blue-600 text-white font-bold'
   * }
   * 
   * // Example for Number Button
   * const result = resolvePaginationLink('1', false, pageStyles)
   * // Returns: { label: '1', className: 'px-3 py-2 bg-white text-gray-600 border rounded-md', isNav: false }
   * 
   * // Example for Next Button
   * const nextResult = resolvePaginationLink('Next &raquo;', false, pageStyles)
   * // Returns: { label: 'Next', className: 'px-4 py-2 bg-gray-100 text-gray-700 rounded-lg', isNav: true }
   *
/**
 * Resolve Laravel paginaton.
 */

export const resolvePaginationLink = (label: string, active: boolean, config: PaginationConfig) => {
  const isPrev = label.includes('&laquo') || label.toLowerCase().includes('previous')
  const isNext = label.includes('&raquo') || label.toLowerCase().includes('next')

  let cleanLabel = label
  if (isPrev) cleanLabel = 'Previous'
  if (isNext) cleanLabel = 'Next'

  let computedClass = isPrev || isNext ? (config.navButton ?? '') : (config.numberButton ?? '')

  if (active && config.active) {
    computedClass = `${computedClass} ${config.active}`
  }
  return {
    label: cleanLabel,
    className: computedClass.trim(),
    isNav: isPrev || isNext,
  }
}
