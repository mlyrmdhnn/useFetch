import { sleep, buildQueryString } from "./helpers";
import { globalConfig } from "./config";
import { runStatusHooks } from "./statusHooks";
import {
  buildDedupKey,
  getDedupRequest,
  setDedupRequest,
  deleteDedupRequest,
} from "./dedup";
import type { FetchConfigInstance } from "./config";
import {
  requestInterceptors,
  responseInterceptors,
  errorInterceptors,
} from "./interceptor";
import type {
  InterceptorHandler,
  RequestInterceptorFn,
  ResponseInterceptorFn,
  ErrorInterceptorFn,
  ResponseContext,
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
    skipInterceptor = false,
  } = options;

  const reqInterceptors = [
    ...requestInterceptors,
    ...(instanceRequestInterceptors ?? []),
  ];
  const resInterceptors = [
    ...responseInterceptors,
    ...(instanceResponseInterceptors ?? []),
  ];
  const errInterceptors = [
    ...errorInterceptors,
    ...(instanceErrorInterceptors ?? []),
  ];

  const queryString = buildQueryString(params);
  /**
   * Core fetch logic extracted so dedup can wrap it.
   */

  if (!endpoint || endpoint.trim() === "") {
    return console.error(
      `[useFetch] Warning: endpoint is empty.\n\n` +
        `This may cause requests to fail. Please provide a valid endpoint.`,
    );
  }

  if (
    !baseURL &&
    !endpoint.startsWith("http://") &&
    !endpoint.startsWith("https://")
  ) {
    return console.error(
      `[useFetch] Warning: baseURL is not set and endpoint is not absolute URL.\n\n` +
        `  endpoint: ${endpoint}\n\n` +
        `This may cause requests to fail. Please set a baseURL or use absolute URLs.`,
    );
  }

  const joinPath = (base: string, path: string) => {
    if (base.endsWith("/") && path.startsWith("/")) {
      return base + path.slice(1);
    }
    return base + path;
  };

  let url = joinPath(baseURL, endpoint);

  const runFetch = async (): Promise<any> => {
    let attempts = 0;

    while (attempts <= retry) {
      try {
        const resolvedPayload =
          typeof payload === "function" ? await payload() : payload;
        const isFormData = resolvedPayload instanceof FormData;

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

        if (!skipInterceptor) {
          for (const interceptor of reqInterceptors) {
            fetchConfig = await interceptor.fn(fetchConfig);
          }
        }

        const response = await fetch(
          `${url}${queryString ? `?${queryString}` : ""}`,
          fetchConfig,
        );
        const statusCode = response.status;

        clearTimeout(timeoutId);
        const contentType = response.headers.get("content-type");
        let result;
        if (contentType && contentType.includes("application/json")) {
          result = await response.json();
        } else {
          result = await response.text();
        }

        let responseContext: ResponseContext = {
          data: result,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        };

        if (!skipInterceptor) {
          for (const interceptor of resInterceptors) {
            responseContext = await interceptor.fn(responseContext);
          }
        }

        // Extract data after interceptors
        result = responseContext.data;

        if (!response.ok) {
          await runStatusHooks(response.status, result);
          const instanceHooks = instanceConfig?.statusHooks ?? [];
          for (const hook of instanceHooks) {
            if (hook.status === response.status) {
              await hook.fn(result);
            }
          }
          const error = new Error(
            typeof result === "string" ? result : JSON.stringify(result),
          );
          (error as any).statusCode = response.status;
          (error as any).data = result;
          throw error;
        }

        // if (cache) setCache(cacheKey, result)

        return { data: result, statusCode };
      } catch (err) {
        attempts++;
        if (attempts <= retry) {
          await sleep(retryDelay);
          continue;
        }

        let finalError = err;
        if (!skipInterceptor) {
          for (const interceptor of errInterceptors) {
            finalError = await interceptor.fn(finalError);
          }
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
