import { ref } from "vue";
import type { HttpOptions, HttpHeaders } from "../lib/fetch/types";
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

export interface UseFetchStatic {
  baseURL: (url: string) => void;
  headers: (headers: HttpHeaders) => void;
  onError: (status: number, fn: (error: any) => void) => void;
  interceptor: {
    request: {
      use: (fn: RequestInterceptorFn) => number;
      eject: (id: number) => void;
    };
    response: {
      use: (fn: ResponseInterceptorFn) => number;
      eject: (id: number) => void;
    };
    error: {
      use: (fn: ErrorInterceptorFn) => number;
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

// core composable logic extracted so both useFetch and instances share it
function buildUseFetch<T>(
  endpoint: string,
  options: HttpOptions = {},
  instanceConfig?: FetchConfigInstance,
  instanceInterceptors?: ReturnType<typeof createInterceptor>,
) {
  const {
    immediate = true,
    watchParams = false,
    pagination = false,
    pick = "",
    transform,
    cacheKey = endpoint,
    onBeforeRequest,
    onSuccess,
    onError,
    onFinally,
    skipInterceptor,
    ...rest
  } = options;

  const data = ref<T | null>(null);
  const error = ref<any>(null);
  const pending = ref(false);
  const status = ref<"idle" | "pending" | "success" | "error">("idle");
  const links = ref<any[]>([]);
  const from = ref(0);
  const to = ref(0);
  const total = ref(0);
  const currentPage = ref(1);
  let controller = new AbortController();

  const execute = async () => {
    try {
      pending.value = true;
      status.value = "pending";
      error.value = null;
      onBeforeRequest?.(options.payload);

      const result = await fetchCore({
        endpoint,
        controller,
        options: { ...rest, endpoint, cacheKey, skipInterceptor },
        instanceConfig,
        instanceRequestInterceptors: instanceInterceptors?.requestInterceptors,
        instanceResponseInterceptors:
          instanceInterceptors?.responseInterceptors,
        instanceErrorInterceptors: instanceInterceptors?.errorInterceptors,
      });

      if (pagination) {
        data.value = result.result.data;
        links.value = result.result.links;
        from.value = result.result.from;
        to.value = result.result.to;
        total.value = result.result.total;
        currentPage.value = result.result.current_page;
        status.value = "success";
        onSuccess?.(result);
        return result;
      }

      let resolvedData = pick ? result[pick] : result;
      if (transform) resolvedData = transform(resolvedData);

      data.value = resolvedData;
      status.value = "success";
      onSuccess?.(resolvedData);
      return resolvedData;
    } catch (err: any) {
      status.value = "error";
      error.value = err;
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
  };
  const abort = () => controller.abort();

  if (immediate) execute();
  if (watchParams) createWatcher(options.params, () => execute());

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
    instanceConfig.statusHooks.push({ status, fn }); // add this
  };
  instance.interceptor = instanceInterceptors.interceptor;

  return instance;
};

export { _useFetch as useFetch };
