import { sleep, buildQueryString } from "./helpers";
import { getCache, setCache } from "./cache";
import { globalConfig } from "./config";
import { runStatusHooks } from "./statusHooks";
import {
  buildDedupKey,
  getDedupRequest,
  setDedupRequest,
  deleteDedupRequest,
} from "./dedup";
import type { FetchConfigInstance } from "./config";
import type {
  InterceptorHandler,
  RequestInterceptorFn,
  ResponseInterceptorFn,
  ErrorInterceptorFn,
} from "./types";

interface FetchCoreParams {
  endpoint: string;
  options: any;
  controller: AbortController;
  instanceConfig?: FetchConfigInstance;
  instanceRequestInterceptors?: InterceptorHandler<RequestInterceptorFn>[];
  instanceResponseInterceptors?: InterceptorHandler<ResponseInterceptorFn>[];
  instanceErrorInterceptors?: InterceptorHandler<ErrorInterceptorFn>[];
}

export const fetchCore = async ({
  endpoint,
  options,
  controller,
  instanceConfig,
  instanceRequestInterceptors,
  instanceResponseInterceptors,
  instanceErrorInterceptors,
}: FetchCoreParams) => {
  const config = instanceConfig ?? globalConfig;

  const {
    method = "GET",
    params = {},
    payload = null,
    credentials = false,
    headers = {},
    timeout = 10000,
    retry = 0,
    retryDelay = 1000,
    cache = false,
    cacheKey,
    baseURL = config.baseURL,
    dedup = false,
  } = options;

  const reqInterceptors = instanceRequestInterceptors ?? [];
  const resInterceptors = instanceResponseInterceptors ?? [];
  const errInterceptors = instanceErrorInterceptors ?? [];
  const queryString = buildQueryString(params);

  /**
   * Core fetch logic extracted so dedup can wrap it.
   */
  const runFetch = async (): Promise<any> => {
    let attempts = 0;

    while (attempts <= retry) {
      try {
        const resolvedPayload =
          typeof payload === "function" ? await payload() : payload;
        const isFormData = resolvedPayload instanceof FormData;

        const cachedData = cache && getCache(cacheKey);
        if (cachedData) return cachedData;

        controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        let fetchConfig: RequestInit = {
          method,
          headers: {
            Accept: "application/json",
            ...(isFormData ? {} : { "Content-Type": "application/json" }),
            "X-Requested-With": "XMLHttpRequest",
            ...globalConfig.headers,
            ...config.headers,
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
        };

        for (const interceptor of reqInterceptors) {
          fetchConfig = await interceptor.fn(fetchConfig);
        }

        let url = "";
        try {
          const normalizedEndpoint = endpoint.startsWith("/")
            ? endpoint.slice(1)
            : endpoint;
          url = new URL(normalizedEndpoint, baseURL).toString();
        } catch (err) {
          throw new Error(`
            [useFetch] Failed to create URL.
            Base URL : ${baseURL}
            Endpoint : ${endpoint}
            Example valid:
            baseURL  -> http://localhost:8080/api/
            endpoint -> /users
          `);
        }

        const response = await fetch(
          `${url}${queryString ? `?${queryString}` : ""}`,
          fetchConfig
        );

        clearTimeout(timeoutId);

        let result = await response.json();

        for (const interceptor of resInterceptors) {
          result = await interceptor.fn(result);
        }

        if (!response.ok) {
          await runStatusHooks(response.status, result);
          const instanceHooks = instanceConfig?.statusHooks ?? [];
          for (const hook of instanceHooks) {
            if (hook.status === response.status) {
              await hook.fn(result);
            }
          }
          throw result;
        }

        if (cache) setCache(cacheKey, result);

        return result;
      } catch (err) {
        attempts++;

        if (attempts <= retry) {
          await sleep(retryDelay);
          continue;
        }

        let finalError = err;
        for (const interceptor of errInterceptors) {
          finalError = await interceptor.fn(finalError);
        }

        throw finalError;
      }
    }
  };

  /**
   * Deduplication — only for GET requests.
   * If same request is already in-flight, return existing promise.
   */
  if (dedup && method === "GET") {
    const dedupKey = buildDedupKey(endpoint, method, params);
    const existing = getDedupRequest(dedupKey);

    if (existing) {
      return existing;
    }

    const promise = runFetch().finally(() => deleteDedupRequest(dedupKey));
    setDedupRequest(dedupKey, promise);
    return promise;
  }

  return runFetch();
};
