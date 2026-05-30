# useFetch

A lightweight, modular, zero-dependency HTTP composable for Vue 3.5+, inspired by Nuxt's `useFetch`. Built with TypeScript, works with both **JavaScript** and **TypeScript** Vue projects.

---

## Features

- Full **TypeScript** support — works with JS too
- **Modular architecture** — core, cache, interceptors, watcher, dedup all separated
- **Auto-execute** on mount with `immediate`
- **Retry** failed requests with configurable delay
- **Laravel pagination** support out of the box
- **Reactive params** watcher (`ref`, `reactive`, or plain object)
- **Session cache** with custom cache key
- **Timeout** & **AbortController** support
- **Pick** & **transform** response data
- **Global interceptors** — request, response, and error with `eject` support
- **Status hooks** — global HTTP status code error handling
- **Request deduplication** — prevent duplicate in-flight requests
- **Multiple instances** — isolated configs per API service
- **Credentials** / cookie support
- **FormData** auto-detection
- Lifecycle callbacks: `onBeforeRequest`, `onSuccess`, `onError`, `onFinally`
- **Zero dependencies**

---

## Requirements

- Vue `3.5+`
- Vite (uses `import.meta.env.VITE_API_URL` as default base URL)

---

## Installation

```bash
npm install @mlyrmdhnn/usefetch
```

---

## Setup

Set your base API URL in `.env`:

```env
VITE_API_URL=https://your-api.com/api/
```

Or set it manually in `main.ts` / `main.js`:

```ts
import { useFetch } from "@mlyrmdhnn/usefetch";

useFetch.baseURL("https://your-api.com/api/");
```

---

## Basic Usage

### JavaScript

```js
import { useFetch } from "@mlyrmdhnn/usefetch";

const { data, pending, error } = useFetch("/users");
```

### TypeScript

```ts
import { useFetch } from "@mlyrmdhnn/usefetch";

const { data, pending, error } = useFetch<User[]>("/users");
```

---

## API

### Signature

```ts
useFetch<T>(endpoint: string, options?: HttpOptions)
```

### Options

| Option            | Type                  | Default        | Description                       |
| ----------------- | --------------------- | -------------- | --------------------------------- |
| `method`          | `HttpMethod`          | `'GET'`        | HTTP method                       |
| `params`          | `Record<string, any>` | `{}`           | URL query parameters              |
| `payload`         | `any`                 | `null`         | Request body                      |
| `immediate`       | `boolean`             | `true`         | Auto-execute on composable call   |
| `pagination`      | `boolean`             | `false`        | Enable Laravel pagination mode    |
| `watchParams`     | `boolean`             | `false`        | Re-fetch when params change       |
| `credentials`     | `boolean`             | `false`        | Include cookies/credentials       |
| `baseURL`         | `string`              | `VITE_API_URL` | Override base URL per request     |
| `pick`            | `string`              | `''`           | Pick a specific key from response |
| `transform`       | `(data: any) => any`  | -              | Transform response data           |
| `timeout`         | `number`              | `10000`        | Request timeout in ms             |
| `cache`           | `boolean`             | `false`        | Enable sessionStorage cache       |
| `cacheKey`        | `string`              | `endpoint`     | Custom cache key                  |
| `retry`           | `number`              | `0`            | Number of retry attempts          |
| `retryDelay`      | `number`              | `1000`         | Delay between retries in ms       |
| `dedup`           | `boolean`             | `false`        | Enable request deduplication      |
| `headers`         | `HttpHeaders`         | `{}`           | Custom request headers            |
| `onBeforeRequest` | `(payload) => void`   | -              | Callback before request fires     |
| `onSuccess`       | `(data) => void`      | -              | Callback on success               |
| `onError`         | `(error) => void`     | -              | Callback on error                 |
| `onFinally`       | `() => void`          | -              | Callback after request completes  |

### Return Values

| Value         | Type                                               | Description                       |
| ------------- | -------------------------------------------------- | --------------------------------- |
| `data`        | `Ref<T \| null>`                                   | Response data                     |
| `error`       | `Ref<any>`                                         | Error object if request failed    |
| `pending`     | `Ref<boolean>`                                     | Loading state                     |
| `status`      | `Ref<'idle' \| 'pending' \| 'success' \| 'error'>` | Request status                    |
| `links`       | `Ref<any[]>`                                       | Pagination links (Laravel)        |
| `from`        | `Ref<number>`                                      | Pagination from (Laravel)         |
| `to`          | `Ref<number>`                                      | Pagination to (Laravel)           |
| `total`       | `Ref<number>`                                      | Total records (Laravel)           |
| `currentPage` | `Ref<number>`                                      | Current page (Laravel)            |
| `execute`     | `() => Promise`                                    | Manually trigger request          |
| `refresh`     | `() => Promise`                                    | Alias for execute                 |
| `clear`       | `() => void`                                       | Reset data, error, status to idle |
| `abort`       | `() => void`                                       | Cancel the active request         |

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

await execute();
```

---

### PUT / PATCH / DELETE

```ts
// PUT
const { execute } = useFetch("/products/1", {
  method: "PUT",
  payload: { name: "Updated" },
  immediate: false,
});

// PATCH
const { execute } = useFetch("/products/1", {
  method: "PATCH",
  payload: { price: 60000 },
  immediate: false,
});

// DELETE
const { execute } = useFetch("/products/1", {
  method: "DELETE",
  immediate: false,
});
```

---

### With Query Params

```ts
const { data } = useFetch("/orders", {
  params: {
    status: "active",
    limit: 10,
  },
});
```

> `null` and `undefined` param values are automatically stripped from the query string.

---

### Reactive Params (Auto Re-fetch)

```ts
import { reactive } from "vue";

const params = reactive({ page: 1, search: "" });

const { data } = useFetch("/users", {
  params,
  watchParams: true,
});

// changing params will automatically re-fetch
params.page = 2;
params.search = "john";
```

Supports `ref`, `reactive`, and plain objects.

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
    "data": [],
    "links": [],
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
const { data } = useFetch("/users", {
  pick: "result",
});
// data.value → [...]
```

---

### Transform Response

```ts
const { data } = useFetch("/users", {
  transform: (res) => res.map((user) => user.name),
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

> `Content-Type` is automatically omitted for `FormData` so the browser sets the correct multipart boundary.

---

### Session Cache

```ts
const { data } = useFetch("/config", {
  cache: true,
  cacheKey: "app-config",
});
```

> Cached in `sessionStorage`. Clears when the browser tab is closed.

---

### Retry on Failure

```ts
const { data } = useFetch("/unstable-endpoint", {
  retry: 3,
  retryDelay: 2000, // wait 2s between each retry
});
```

---

### Request Deduplication

Prevents the same request from firing multiple times simultaneously. Useful when multiple components mount at the same time and need the same data.

```ts
// ComponentA.vue
const { data } = useFetch("/user/profile", { dedup: true });

// ComponentB.vue — mounts at the same time
const { data } = useFetch("/user/profile", { dedup: true });

// Result: only ONE actual HTTP request fires, both components get the same result ✅
```

> Deduplication only applies to `GET` requests.

---

### Manual Execute + Abort

```ts
const { execute, abort } = useFetch("/long-request", {
  immediate: false,
});

execute();
abort(); // cancel anytime
```

---

## Global Configuration

Set once in `main.ts` or `main.js`, applies to every request automatically.

### Base URL

```ts
useFetch.baseURL("https://api.example.com/api/");
```

### Default Headers

```ts
useFetch.headers({
  "X-API-KEY": "your-api-key",
  "Accept-Language": "id",
});
```

> Per-request headers always override global headers.

---

## Global Interceptors

### Request Interceptor

Runs before every request. Useful for injecting auth tokens globally.

```ts
const id = useFetch.interceptor.request.use(async (config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// remove later if needed
useFetch.interceptor.request.eject(id);
```

### Response Interceptor

Runs after every successful response.

```ts
const id = useFetch.interceptor.response.use(async (result) => {
  console.log("Response received:", result);
  return result;
});

useFetch.interceptor.response.eject(id);
```

### Error Interceptor

Runs when a request throws or response is not ok.

```ts
const id = useFetch.interceptor.error.use(async (error) => {
  console.error("Request failed:", error);
  return error;
});

useFetch.interceptor.error.eject(id);
```

---

## Status Hooks

Handle specific HTTP status codes globally — no need to repeat error handling in every component.

```ts
// main.ts / main.js
useFetch.onError(401, () => {
  router.push("/login");
});

useFetch.onError(403, () => {
  toast.error("You are not authorized!");
});

useFetch.onError(404, () => {
  toast.error("Resource not found!");
});

useFetch.onError(500, () => {
  toast.error("Server error, please try again later");
});
```

---

## Multiple Instances

Create isolated instances with their own base URL, headers, interceptors, and status hooks. Perfect for projects that communicate with multiple APIs.

```ts
// main.ts / main.js
import { useFetch } from "@mlyrmdhnn/usefetch";

// global instance
useFetch.baseURL("https://api.example.com/api/");

// isolated instance for payment service
export const paymentApi = useFetch.create({
  baseURL: "https://payment.example.com/api/",
  headers: { "X-API-KEY": "payment-key" },
});

// isolated instance for reporting service
export const reportApi = useFetch.create({
  baseURL: "https://report.example.com/api/",
});
```

Each instance has its own `baseURL`, `headers`, `interceptor`, and `onError`:

```ts
// instance specific interceptor
paymentApi.interceptor.request.use(async (config) => {
  config.headers["X-Signature"] = generateSignature();
  return config;
});

// instance specific status hook
paymentApi.onError(422, (err) => {
  toast.error("Payment validation failed");
});
```

Then use anywhere:

```ts
// global instance
const { data } = useFetch("/users");

// payment instance
const { data } = paymentApi("/transactions");

// report instance
const { data } = reportApi("/summary");
```

---

## HTTP Methods

```ts
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
```

---

## TypeScript Support

All types are exported and available:

```ts
import type {
  HttpOptions,
  HttpHeaders,
  HttpMethod,
  RequestInterceptorFn,
  ResponseInterceptorFn,
  ErrorInterceptorFn,
  InterceptorHandler,
} from "@mlyrmdhnn/usefetch";
```

---

## License

MIT
