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
  StreamMode,
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
    retryDelay = 1000,
    cache = false,
    cacheKey,
    baseURL = config.baseURL,
    dedup = false,
    skipInterceptor = false,
    stream = false,
    streamMode = "text" as StreamMode,
    onStreamChunk,
    onStreamDone,
  } = options;

  // Streams shouldn't silently retry — partial chunks would already have
  // been emitted downstream, so a retry means duplicate data.
  let retry = stream ? 0 : (options.retry ?? 0);

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

  /**
   * Parses a raw SSE/NDJSON buffer chunk by chunk, calling onStreamChunk
   * for each complete frame and returning the leftover partial buffer.
   */
  const consumeBuffer = (buffer: string, mode: StreamMode): string => {
    if (mode === "sse") {
      const parts = buffer.split("\n\n");
      const rest = parts.pop() ?? "";
      for (const part of parts) {
        const line = part.replace(/^data:\s*/, "").trim();
        if (!line || line === "[DONE]") continue;
        try {
          onStreamChunk?.(JSON.parse(line), line);
        } catch {
          onStreamChunk?.(line, line);
        }
      }
      return rest;
    }

    if (mode === "ndjson") {
      const lines = buffer.split("\n");
      const rest = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          onStreamChunk?.(JSON.parse(line), line);
        } catch {
          onStreamChunk?.(line, line);
        }
      }
      return rest;
    }

    // "text" mode: nothing to buffer, chunk is passed straight through
    // by the caller before consumeBuffer is invoked.
    return "";
  };

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

        // For streams we don't want the timeout aborting a long-lived
        // connection once bytes are already flowing.
        if (!stream) clearTimeout(timeoutId);

        // ---------- Streaming branch ----------
        if (stream) {
          if (!response.ok) {
            clearTimeout(timeoutId);
            let errText = "";
            try {
              errText = await response.text();
            } catch {
              // ignore
            }
            await runStatusHooks(response.status, errText);
            const instanceHooks = instanceConfig?.statusHooks ?? [];
            for (const hook of instanceHooks) {
              if (hook.status === response.status) {
                await hook.fn(errText);
              }
            }
            const error = new Error(errText || "Stream request failed");
            (error as any).statusCode = response.status;
            (error as any).data = errText;
            throw error;
          }

          if (!response.body) {
            clearTimeout(timeoutId);
            throw new Error(
              "[useFetch] Stream requested but response has no body.",
            );
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let fullText = "";
          let buffer = "";

          clearTimeout(timeoutId);

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunkText = decoder.decode(value, { stream: true });
            fullText += chunkText;

            if (streamMode === "text") {
              onStreamChunk?.(chunkText, chunkText);
            } else {
              buffer += chunkText;
              buffer = consumeBuffer(buffer, streamMode);
            }
          }

          // flush any trailing partial frame
          if (streamMode !== "text" && buffer.trim()) {
            consumeBuffer(buffer + "\n\n", streamMode);
          }

          onStreamDone?.();

          let responseContext: ResponseContext = {
            data: fullText,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          };

          if (!skipInterceptor) {
            for (const interceptor of resInterceptors) {
              responseContext = await interceptor.fn(responseContext);
            }
          }

          return { data: responseContext.data, statusCode: response.status };
        }

        // ---------- Normal (non-stream) branch ----------
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
   * Deduplication — only for GET requests, and never for streams
   * (a second caller would just get the already-resolved final value,
   * not live chunks, which defeats the point of streaming).
   */
  if (dedup && method === "GET" && !stream) {
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
