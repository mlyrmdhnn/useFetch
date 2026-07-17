import { type PaginationOptions } from '../lib/fetch/types'
const resolvePath = (obj: any, path: string) => {
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}
const extractPagination = (result: any, config: PaginationOptions, pick: string = '') => {
  const { dataKey, totalKey, currentPageKey, linksKey, fromKey, toKey } = config

  const rawData = result[pick]

  return {
    data: resolvePath(rawData, dataKey || 'data'),
    from: resolvePath(rawData, fromKey ?? 'from'),
    to: resolvePath(rawData, toKey ?? 'to'),
    total: resolvePath(rawData, totalKey ?? 'total'),
    links: resolvePath(rawData, linksKey ?? 'links'),
    current_page: resolvePath(rawData, currentPageKey ?? 'current_page'),
  }
}

export default extractPagination
