import { ref } from "vue";
import type { HttpOptions, HttpHeaders, StreamMode } from "../lib/fetch/types";
import type {
  RequestInterceptorFn,
  ResponseInterceptorFn,
  ErrorInterceptorFn,
} from "../lib/fetch/types";
import { fetchCore } from "../lib/fetch/core";
import { fetchConfig, createConfig } from "../lib/fetch/config";
import { fetchInterceptor, createInterceptor } from "../lib/fetch/interceptor";
import { createWatcher } from "../lib/fetch/watcher";
import type { FetchConfigInstance } from "../lib/fetch/config";
import extractPagination from "../handler/extractPagination";
import {
  getCache,
  isEqualCache,
  setCache,
  clearCacheByKey,
} from "../lib/fetch/cache";

export interface UseFetchStatic {
  baseURL: (url: string) => void;
  headers: (headers: HttpHeaders) => void;
  onError: (status: number, fn: (error: any) => void) => void;
  interceptor: {
    request: {
      use: (fn: RequestInterceptorFn) => number;
      push: (fn: RequestInterceptorFn) => number;
      eject: (id: number) => void;
    };
    response: {
      use: (fn: ResponseInterceptorFn) => number;
      push: (fn: ResponseInterceptorFn) => number;
      eject: (id: number) => void;
    };
    error: {
      use: (fn: ErrorInterceptorFn) => number;
      push: (fn: ErrorInterceptorFn) => number;
      eject: (id: number) => void;
    };
  };
  create: (config: Partial<FetchConfigInstance>) => UseFetchInstance;
}

export type UseFetchInstance = {
  <T>(
    endpoint: string,
    options?: HttpOptions,
  ): ReturnType<typeof buildUseFetch<T>>;
  baseURL: (url: string) => void;
  headers: (headers: HttpHeaders) => void;
  onError: (status: number, fn: (error: any) => void) => void;
  interceptor: UseFetchStatic["interceptor"];
};

function buildUseFetch<T>(
  endpoint: string,
  options: HttpOptions = {},
  instanceConfig?: FetchConfigInstance,
  instanceInterceptors?: ReturnType<typeof createInterceptor>,
) {
  let {
    immediate = true,
    method = "GET",
    watchParams = false,
    pagination = false,
    paginationKey = {},
    pick = "",
    transform,
    cache = false,
    cacheKey = endpoint,
    cacheRevalidate = false,
    cacheDescription = "",
    onBeforeRequest,
    onSuccess,
    onError,
    onFinally,
    skipInterceptor,
    stream = false,
    streamMode = "text" as StreamMode,
    onChunk,
    ...rest
  } = options;

  const data = ref<T | null>(null);
  const error = ref<any>(null);
  const pending = ref(false);
  const streaming = ref(false);
  const status = ref<"idle" | "pending" | "success" | "error">("idle");
  const links = ref<any[]>([]);
  const from = ref(0);
  const to = ref(0);
  const total = ref(0);
  const currentPage = ref(1);
  const statusCode = ref(0);
  let controller = new AbortController();

  const resolvePath = (obj: any, path: string) => {
    if (!path) return obj;
    return path.split(".").reduce((acc, key) => acc?.[key], obj);
  };

  const resolvePayload = (payload: any) => {
    return typeof payload === "function" ? payload() : payload;
  };

  //#region SWR: revalidate
  const revalidateInBackground = async (cachedData: any, key: string) => {
    try {
      const { data: freshResult } = await fetchCore({
        endpoint,
        controller: new AbortController(),
        options: {
          ...rest,
          method,
          cache: false,
          cacheKey,
          skipInterceptor,
        },
        instanceConfig,
        instanceRequestInterceptors: instanceInterceptors?.requestInterceptors,
        instanceResponseInterceptors:
          instanceInterceptors?.responseInterceptors,
        instanceErrorInterceptors: instanceInterceptors?.errorInterceptors,
      });

      //#region pagination branch
      if (pagination) {
        const pg = extractPagination(freshResult, paginationKey, pick);

        let resolvedData = pg.data;

        if (transform) {
          resolvedData = transform(resolvedData);
        }

        const freshPayload = {
          data: resolvedData,
          links: pg.links,
          from: pg.from,
          to: pg.to,
          total: pg.total,
          currentPage: pg.current_page,
        };

        if (!isEqualCache(cachedData, freshPayload)) {
          clearCacheByKey(cacheKey);
          setCache(key, freshPayload, cacheDescription);

          data.value = freshPayload.data;
          links.value = freshPayload.links;
          from.value = freshPayload.from;
          to.value = freshPayload.to;
          total.value = freshPayload.total;
          currentPage.value = freshPayload.currentPage;
        }

        return;
      }

      // #region normal branch
      let resolvedFresh = resolvePath(freshResult, pick);

      if (transform) {
        resolvedFresh = transform(resolvedFresh);
      }

      if (!isEqualCache(cachedData, resolvedFresh)) {
        setCache(key, resolvedFresh, cacheDescription);

        data.value = resolvedFresh;
      }
    } catch (err) {
      console.warn(`Background revalidate failed for ${key}`, err);
    }
  };

  const execute = async () => {
    try {
      pending.value = true;
      status.value = "pending";
      error.value = null;

      const resolvedPayload = resolvePayload(options.payload);
      onBeforeRequest?.(resolvedPayload);

      //#region Cache Key
      const key = endpoint + JSON.stringify(options.params ?? {}) + cacheKey;

      // ✅ Cache: return early but properly reset pending
      // (streams are never cached — skip this branch entirely for them)
      if (cache && !stream) {
        const cachedData = getCache(key);
        if (cachedData !== null) {
          if (
            pagination &&
            typeof cachedData === "object" &&
            "data" in cachedData
          ) {
            data.value = cachedData.data;
            links.value = cachedData.links || [];
            from.value = cachedData.from || 0;
            to.value = cachedData.to || 0;
            total.value = cachedData.total || 0;
            currentPage.value = cachedData.currentPage || 1;
          } else {
            data.value = cachedData;
          }

          status.value = "success";
          pending.value = false;

          if (cacheRevalidate) {
            revalidateInBackground(cachedData, key);
          }
          return cachedData;
        }
      }

      // Reset data before a stream starts so consumers don't see stale
      // content while the new stream is filling in.
      if (stream) {
        streaming.value = true;
        data.value = (streamMode === "text" ? "" : []) as unknown as T;
      }

      const { data: result, statusCode: responseStatusCode } = await fetchCore({
        endpoint,
        controller,
        options: {
          ...rest,
          method,
          endpoint,
          cacheKey,
          skipInterceptor,
          cache: false,
          stream,
          streamMode,
          onStreamChunk: (chunk: any, raw: string) => {
            if (streamMode === "text") {
              data.value = (((data.value as any) ?? "") +
                chunk) as unknown as T;
            } else {
              (data.value as any[]).push(chunk);
            }
            onChunk?.(chunk, raw);
          },
          onStreamDone: () => {
            streaming.value = false;
          },
        },
        instanceConfig,
        instanceRequestInterceptors: instanceInterceptors?.requestInterceptors,
        instanceResponseInterceptors:
          instanceInterceptors?.responseInterceptors,
        instanceErrorInterceptors: instanceInterceptors?.errorInterceptors,
      });

      statusCode.value = responseStatusCode;

      // Streaming already built `data` incrementally via onStreamChunk —
      // don't let pagination/pick/transform stomp on it afterward.
      if (!stream) {
        if (pagination) {
          const pg = extractPagination(result, paginationKey, pick);
          let resolvedData = pg.data;
          if (transform) resolvedData = transform(resolvedData);

          const cachePayload = {
            data: resolvedData,
            links: pg.links,
            from: pg.from,
            to: pg.to,
            total: pg.total,
            currentPage: pg.current_page,
          };

          if (cache) {
            setCache(key, cachePayload, cacheDescription);
          }

          data.value = resolvedData;
          links.value = pg.links;
          from.value = pg.from;
          to.value = pg.to;
          total.value = pg.total;
          currentPage.value = pg.current_page;
        } else {
          let resolvedData = resolvePath(result, pick);
          if (transform) resolvedData = transform(resolvedData);

          if (cache) {
            setCache(key, resolvedData, cacheDescription);
          }
          data.value = resolvedData;
        }
      }

      status.value = "success";
      onSuccess?.(result);
      return data.value;
    } catch (err: any) {
      status.value = "error";
      error.value = err;
      statusCode.value = err?.statusCode || 0;
      streaming.value = false;
      onError?.(err);
    } finally {
      pending.value = false;
      onFinally?.();
    }
  };

  const refresh = () => execute();

  const clear = () => {
    data.value = null;
    error.value = null;
    status.value = "idle";
    links.value = [];
    from.value = 0;
    to.value = 0;
    total.value = 0;
    currentPage.value = 1;
    statusCode.value = 0;
    streaming.value = false;
  };

  const abort = () => {
    controller.abort();
    controller = new AbortController();
    streaming.value = false;
  };

  if (method !== "GET") {
    immediate = false;
  }
  if (immediate) {
    status.value = "pending";
    execute();
  }
  if (watchParams) createWatcher(options.params, () => execute());

  return {
    data,
    error,
    pending,
    streaming,
    status,
    links,
    from,
    to,
    total,
    currentPage,
    statusCode,
    execute,
    refresh,
    clear,
    abort,
  };
}

function useFetch<T>(endpoint: string, options: HttpOptions = {}) {
  return buildUseFetch<T>(endpoint, options);
}

const _useFetch = useFetch as typeof useFetch & UseFetchStatic;

_useFetch.baseURL = fetchConfig.baseURL;
_useFetch.headers = fetchConfig.headers;
_useFetch.interceptor = fetchInterceptor;
_useFetch.onError = fetchConfig.onError;

_useFetch.create = (
  initial: Partial<FetchConfigInstance>,
): UseFetchInstance => {
  const instanceConfig = createConfig(initial);
  const instanceInterceptors = createInterceptor();

  const instance = <T>(endpoint: string, options: HttpOptions = {}) =>
    buildUseFetch<T>(endpoint, options, instanceConfig, instanceInterceptors);

  instance.baseURL = (url: string) => {
    instanceConfig.baseURL = url;
  };
  instance.headers = (headers: HttpHeaders) => {
    instanceConfig.headers = { ...instanceConfig.headers, ...headers };
  };
  instance.onError = (status: number, fn: (error: any) => void) => {
    instanceConfig.statusHooks.push({ status, fn });
  };
  instance.interceptor = instanceInterceptors.interceptor;

  return instance;
};

export { _useFetch as useFetch };
