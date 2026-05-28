# useFetch

A lightweight, flexible HTTP composable for Vue 3.5+ inspired by Nuxt's `useFetch`. Built with TypeScript, designed for real-world use cases including Laravel pagination, request retries, caching, and more.

---

## Features

- Full **TypeScript** support
- **Auto-execute** on mount with `immediate`
- **Retry** failed requests with configurable delay
- **Laravel pagination** support out of the box
- **Reactive params** watcher
- **Session cache** with custom cache key
- **Timeout** & **AbortController** support
- **Pick** & **transform** response data
- **Credentials** / cookie support
- Lifecycle callbacks: `onBeforeRequest`, `onSuccess`, `onError`, `onFinally`
- FormData auto-detection (no manual `Content-Type` needed)

---

## Requirements

- Vue `3.5+`
- TypeScript
- Vite (uses `import.meta.env.VITE_API_URL`)

---

## Installation

Just copy `useFetch.ts` into your project's composables folder:

```
src/
└── composables/
    └── useFetch.ts
```

Then set your base API URL in your `.env` file:

```env
VITE_API_URL=https://your-api.com/api
```

---

## Basic Usage

```ts
import { useFetch } from "@/composables/useFetch";

const { data, pending, error } = useFetch<User[]>("/users");
```

---

## API

### Parameters

```ts
useFetch<T>(endpoint: string, options?: HttpOptions)
```

### Options

| Option            | Type                  | Default        | Description                       |
| ----------------- | --------------------- | -------------- | --------------------------------- |
| `method`          | `HttpMethod`          | `'GET'`        | HTTP method                       |
| `params`          | `Record<string, any>` | `{}`           | URL query parameters              |
| `payload`         | `any`                 | `null`         | Request body                      |
| `immediate`       | `boolean`             | `true`         | Auto-execute on call              |
| `pagination`      | `boolean`             | `false`        | Enable Laravel pagination mode    |
| `watchParams`     | `boolean`             | `false`        | Re-fetch when params change       |
| `credentials`     | `boolean`             | `false`        | Include cookies/credentials       |
| `baseURL`         | `string`              | `VITE_API_URL` | Override base API URL             |
| `pick`            | `string`              | `''`           | Pick a specific key from response |
| `transform`       | `(data: any) => any`  | -              | Transform response data           |
| `timeout`         | `number`              | `10000`        | Request timeout in ms             |
| `cache`           | `boolean`             | `false`        | Enable sessionStorage cache       |
| `cacheKey`        | `string`              | `endpoint`     | Custom cache key                  |
| `retry`           | `number`              | `0`            | Number of retry attempts          |
| `retryDelay`      | `number`              | `1000`         | Delay between retries in ms       |
| `headers`         | `HttpHeaders`         | `{}`           | Custom request headers            |
| `onBeforeRequest` | `(payload) => void`   | -              | Callback before request           |
| `onSuccess`       | `(data) => void`      | -              | Callback on success               |
| `onError`         | `(error) => void`     | -              | Callback on error                 |
| `onFinally`       | `() => void`          | -              | Callback after request completes  |

### Return Values

| Value         | Type                                               | Description                    |
| ------------- | -------------------------------------------------- | ------------------------------ |
| `data`        | `Ref<T \| null>`                                   | Response data                  |
| `error`       | `Ref<any>`                                         | Error object if request failed |
| `pending`     | `Ref<boolean>`                                     | Loading state                  |
| `status`      | `Ref<'idle' \| 'pending' \| 'success' \| 'error'>` | Request status                 |
| `links`       | `Ref<any[]>`                                       | Pagination links (Laravel)     |
| `from`        | `Ref<number>`                                      | Pagination from (Laravel)      |
| `to`          | `Ref<number>`                                      | Pagination to (Laravel)        |
| `total`       | `Ref<number>`                                      | Total records (Laravel)        |
| `currentPage` | `Ref<number>`                                      | Current page (Laravel)         |
| `execute`     | `() => Promise`                                    | Manually trigger the request   |
| `refresh`     | `() => Promise`                                    | Re-execute the request         |
| `clear`       | `() => void`                                       | Reset data, error, and status  |
| `abort`       | `() => void`                                       | Cancel the active request      |

---

## Examples

### GET Request

```ts
const { data, pending, error } = useFetch<Product[]>("/products");
```

---

### POST Request

```ts
const { execute, pending } = useFetch("/products", {
  method: "POST",
  payload: {
    name: "New Product",
    price: 50000,
  },
  immediate: false,
  onSuccess(data) {
    console.log("Created:", data);
  },
  onError(err) {
    console.error("Failed:", err);
  },
});

// Trigger manually
await execute();
```

---

### With Query Params

```ts
const { data } = useFetch<Order[]>("/orders", {
  params: {
    status: "active",
    limit: 10,
  },
});
```

---

### Reactive Params (Auto Re-fetch)

```ts
import { reactive } from "vue";

const params = reactive({ page: 1, search: "" });

const { data } = useFetch<User[]>("/users", {
  params,
  watchParams: true,
});

// Changing params will automatically re-fetch
params.page = 2;
params.search = "john";
```

---

### Laravel Pagination

```ts
const { data, total, currentPage, links } = useFetch("/invoices", {
  pagination: true,
  params: { page: 1 },
});
```

Expects this response structure from Laravel:

```json
{
  "result": {
    "data": [...],
    "links": [...],
    "from": 1,
    "to": 10,
    "total": 100,
    "current_page": 1
  }
}
```

---

### Pick Specific Key

```ts
// Response: { status: true, result: [...] }
const { data } = useFetch<User[]>("/users", {
  pick: "result",
});
// data.value = [...]
```

---

### Transform Response

```ts
const { data } = useFetch<string[]>("/users", {
  transform: (res) => res.map((user: User) => user.name),
});
```

---

### Upload FormData

```ts
const form = new FormData();
form.append("file", file);
form.append("name", "document.pdf");

const { execute } = useFetch("/upload", {
  method: "POST",
  payload: form,
  immediate: false,
});
```

> `Content-Type` is automatically omitted for `FormData` so the browser sets the correct boundary.

---

### With Auth Header

```ts
const { data } = useFetch<Profile>("/profile", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

---

### Retry on Failure

```ts
const { data, error } = useFetch("/unstable-endpoint", {
  retry: 3,
  retryDelay: 2000, // wait 2s between each retry
});
```

---

### Session Cache

```ts
const { data } = useFetch("/static-config", {
  cache: true,
  cacheKey: "app-config",
});
```

> Cached in `sessionStorage`. Clears when the browser tab is closed.

---

### Manual Execute + Abort

```ts
const { execute, abort, pending } = useFetch("/long-request", {
  immediate: false,
});

execute();

// Cancel if needed
abort();
```

---

## HTTP Methods Supported

```ts
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
```

---

## License

MIT
