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

export const resolvePaginationLabel = (
  label: string,
  active: boolean,
  config: PaginationConfig,
) => {
  const prev = label.includes('&laquo') || label.toLowerCase().includes('previous')
  const next = label.includes('&raquo') || label.toLowerCase().includes('next')
  let cleanLabel = label
  if (prev) cleanLabel = 'Previous'
  if (next) cleanLabel = 'Next'
  let computedClass = prev || next ? (config.navButton ?? '') : (config.numberButton ?? '')
  if (active && config.active) {
    computedClass = `${computedClass} ${config.active}`
  }
  if (cleanLabel === '...') {
    computedClass = `${config.numberButton} cursor-not-allowed`
  } else {
    computedClass = 'cursor-pointer ' + computedClass
  }
  return {
    label: cleanLabel,
    className: computedClass.trim(),
    isNav: prev || next,
  }
}
