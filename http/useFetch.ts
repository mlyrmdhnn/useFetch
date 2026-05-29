import { ref } from "vue";

import type { HttpOptions } from "@/lib/fetch/types";

import { fetchCore } from "@/lib/fetch/core";
import { createWatcher } from "@/lib/fetch/watcher";

export function useFetch<T>(endpoint: string, options: HttpOptions = {}) {
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

        options: {
          ...rest,

          endpoint,

          cacheKey,
        },
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

      if (transform) {
        resolvedData = transform(resolvedData);
      }

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

  const abort = () => {
    controller.abort();
  };

  if (immediate) {
    execute();
  }

  if (watchParams) {
    createWatcher(options.params, () => {
      execute();
    });
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
