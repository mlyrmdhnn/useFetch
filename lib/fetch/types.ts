export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface HttpHeaders {
  Authorization?: string;
  Accept?: string;
  "Content-Type"?: string;
  "X-CSRF-TOKEN"?: string;
  "X-XSRF-TOKEN"?: string;
  "X-Requested-With"?: string;
  "X-API-KEY"?: string;
  "Accept-Language"?: string;
  "Cache-Control"?: string;
  [key: string]: string | undefined;
}

export interface HttpOptions {
  method?: HttpMethod;
  params?: Record<string, any>;
  payload?: any;
  immediate?: boolean;
  pagination?: boolean;
  paginationKey?: PaginationOptions;
  watchParams?: boolean;
  credentials?: boolean;
  baseURL?: string;
  pick?: string;
  transform?: (data: any) => any;
  timeout?: number;
  cache?: boolean;
  cacheKey?: string;
  cacheRevalidate?: boolean;
  cacheDescription?: string;
  retry?: number;
  retryDelay?: number;
  onBeforeRequest?: (payload: any) => void;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  onFinally?: () => void;
  headers?: HttpHeaders;
  xsrfCookieName?: string;
  xsrfHeaderName?: string;
  dedup?: boolean;
  skipInterceptor?: boolean;
}

export interface ResponseContext {
  data: any;
  status: number;
  statusText: string;
  headers: Headers;
}

export type RequestInterceptorFn = (
  config: RequestInit,
) => RequestInit | Promise<RequestInit>;
export type ResponseInterceptorFn = (
  response: ResponseContext,
) => ResponseContext | Promise<ResponseContext>;
export type ErrorInterceptorFn = (error: any) => any | Promise<any>;

export interface InterceptorHandler<T> {
  id: number;
  fn: T;
}

export interface PaginationOptions {
  dataKey?: string;
  totalKey?: string;
  currentPageKey?: string;
  perPageKey?: string;
  linksKey?: string;
  fromKey?: string;
  toKey?: string;
}
