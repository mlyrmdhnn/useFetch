import { isReactive, isRef, ref, watch } from "vue";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Custom Header Interface.
 *
 * Inspired by Nuxt/ofetch headers.
 */
interface HttpHeaders {
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

/**
 * Configuration options for useFetch composable.
 */
interface HttpOptions {
  method?: HttpMethod;

  /**
   * Query params.
   */
  params?: Record<string, any>;

  /**
   * Request body payload.
   */
  payload?: any;

  /**
   * Auto execute request.
   */
  immediate?: boolean;

  /**
   * Enable Laravel pagination mode.
   */
  pagination?: boolean;

  /**
   * Watch params changes.
   */
  watchParams?: boolean;

  /**
   * Include credentials/cookie.
   */
  credentials?: boolean;

  /**
   * Base API URL.
   */
  baseURL?: string;

  /**
   * Pick specific response property.
   */
  pick?: string;

  /**
   * Transform response data.
   */
  transform?: (data: any) => any;

  /**
   * Request timeout.
   */
  timeout?: number;

  /**
   * Enable request cache.
   */
  cache?: boolean;

  /**
   * Custom cache key.
   */
  cacheKey?: string;

  /**
   * Retry failed request.
   */
  retry?: number;

  /**
   * Delay between retries.
   */
  retryDelay?: number;

  /**
   * Callback executed before request.
   */
  onBeforeRequest?: (payload: any) => void;

  /**
   * Callback executed after request success.
   */
  onSuccess?: (data: any) => void;

  /**
   * Callback executed after request failed.
   */
  onError?: (error: any) => void;

  /**
   * Callback after request completed.
   */
  onFinally?: () => void;

  /**
   * Custom request headers.
   */
  headers?: HttpHeaders;

  /**
   * XSRF cookie name.
   */
  xsrfCookieName?: string;

  /**
   * XSRF header name.
   */
  xsrfHeaderName?: string;
}

/**
 * Generic HTTP composable inspired by Nuxt useFetch.
 */
export function useFetch<T>(endpoint: string, options: HttpOptions = {}) {
  const {
    method = "GET",
    params = {},
    payload = null,

    immediate = true,
    pagination = false,
    watchParams = false,
    credentials = false,

    baseURL = import.meta.env.VITE_API_URL,

    pick = "",

    transform,

    timeout = 10000,

    cache = false,
    cacheKey = endpoint,

    retry = 0,
    retryDelay = 1000,

    onSuccess,
    onError,
    onBeforeRequest,
    onFinally,

    xsrfCookieName = "XSRF-TOKEN",
    xsrfHeaderName = "X-XSRF-TOKEN",

    headers = {},
  } = options;

  /**
   * Main response data.
   */
  const data = ref<T | null>(null);

  /**
   * Request error state.
   */
  const error = ref<any>(null);

  /**
   * Loading state.
   */
  const pending = ref(false);

  /**
   * Request status.
   */
  const status = ref<"idle" | "pending" | "success" | "error">("idle");

  /**
   * Pagination state.
   */
  const links = ref<any[]>([]);
  const from = ref(0);
  const to = ref(0);
  const total = ref(0);
  const currentPage = ref(1);

  /**
   * Abort controller.
   */
  let controller = new AbortController();

  /**
   * Sleep helper for retry.
   */
  const sleep = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  /**
   * Execute HTTP request.
   */
  const execute = async () => {
    /**
     * Convert params object to query string.
     */
    const queryString = new URLSearchParams(params).toString();
    let attempts = 0;

    while (attempts <= retry) {
      try {
        pending.value = true;
        status.value = "pending";

        error.value = null;

        /**
         * Trigger before request callback.
         */
        onBeforeRequest?.(payload);

        /**
         * Resolve dynamic payload.
         */
        const resolvedPayload =
          typeof payload === "function" ? await payload() : payload;

        /**
         * Detect FormData automatically.
         */
        const isFormData = resolvedPayload instanceof FormData;

        /**
         * Handle cache.
         */
        if (cache) {
          const cachedData = sessionStorage.getItem(cacheKey);

          if (cachedData) {
            data.value = JSON.parse(cachedData);

            return data.value;
          }
        }

        /**
         * Reset abort controller.
         */
        controller = new AbortController();

        /**
         * Auto timeout request.
         */
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, timeout);

        /**
         * Native fetch request.
         */
        const response = await fetch(
          `${baseURL}${endpoint}${queryString ? `?${queryString}` : ""}`,
          {
            method,

            headers: {
              Accept: "application/json",

              ...(isFormData
                ? {}
                : {
                    "Content-Type": "application/json",
                  }),

              "X-Requested-With": "XMLHttpRequest",

              ...headers,
            },

            credentials: credentials ? "include" : "same-origin",

            signal: controller.signal,

            body:
              method !== "GET"
                ? isFormData
                  ? resolvedPayload
                  : JSON.stringify(resolvedPayload)
                : undefined,
          }
        );

        clearTimeout(timeoutId);

        /**
         * Parse JSON response.
         */
        const result = await response.json();

        /**
         * Handle failed response.
         */
        if (!response.ok) {
          throw result;
        }

        /**
         * Handle Laravel pagination response.
         */
        if (pagination) {
          data.value = result.result.data;

          links.value = result.result.links;
          from.value = result.result.from;
          to.value = result.result.to;
          total.value = result.result.total;
          currentPage.value = result.result.current_page;

          status.value = "success";

          onSuccess?.(result);

          return {
            data,
            links,
            from,
            to,
            total,
            currentPage,
          };
        }

        /**
         * Handle pick response.
         */
        let resolvedData = pick ? result[pick] : result;

        /**
         * Transform response.
         */
        if (transform) {
          resolvedData = transform(resolvedData);
        }

        data.value = resolvedData;

        /**
         * Store cache.
         */
        if (cache) {
          sessionStorage.setItem(cacheKey, JSON.stringify(resolvedData));
        }

        status.value = "success";

        onSuccess?.(resolvedData);

        return resolvedData;
      } catch (err: any) {
        attempts++;

        /**
         * Retry request.
         */
        if (attempts <= retry) {
          await sleep(retryDelay);

          continue;
        }

        status.value = "error";

        error.value = err;

        onError?.(error.value);
      } finally {
        pending.value = false;

        onFinally?.();
      }
    }
  };

  /**
   * Refresh request.
   */
  const refresh = () => execute();

  /**
   * Clear current state.
   */
  const clear = () => {
    data.value = null;
    error.value = null;
    status.value = "idle";
  };

  /**
   * Cancel active request.
   */
  const abort = () => {
    controller.abort();
  };

  /**
   * Auto execute on initialization.
   */
  if (immediate || watchParams) {
    execute();
  }

  /**
   * Auto re-fetch when params changed.
   */
  if (watchParams) {
    if (isRef(params)) {
      watch(params, () => execute(), {
        deep: true,
      });
    } else if (isReactive(params)) {
      watch(
        () => params,
        () => execute(),
        {
          deep: true,
        }
      );
    } else {
      watch(
        () => params,
        () => {
          execute();
        }
      );
    }
  }

  return {
    data,
    error,
    pending,
    status,

    links,
    from,
    to,
    total,
    currentPage,

    execute,
    refresh,
    clear,
    abort,
  };
}
