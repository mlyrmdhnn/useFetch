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
- **Skip interceptor** — prevent infinite loops when calling useFetch inside an interceptor
- **Status hooks** — global HTTP status code error handling
- **Request deduplication** — prevent duplicate in-flight requests
- **Multiple instances** — isolated configs per API service
- **Credentials** / cookie support
- **FormData** auto-detection
- **FetchTable** — ready-to-use Vue table component with pagination, search, and loading state
- **formDataHandler** — utility to convert reactive objects + files into FormData
- Lifecycle callbacks: `onBeforeRequest`, `onSuccess`, `onError`, `onFinally`
- **Zero dependencies**

---

## Requirements

- Vue `3.5+`
- Vue Router (required for `FetchTable` component)
- Vite (uses `import.meta.env.VITE_API_URL` as default base URL)

---

## Installation

```bash
npm install @mlyrmdhnn/use-fetch
```

---

## Project Structure

```
components/
└── fetchTable.vue          # Ready-to-use table component
handler/
└── formDataHandler.ts      # Reactive object to FormData utility
http/
└── useFetch.ts             # Main composable entry point
lib/
└── fetch/
    ├── cache.ts            # SessionStorage cache handler
    ├── config.ts           # Global config & instance factory
    ├── core.ts             # Core fetch logic
    ├── dedup.ts            # Request deduplication
    ├── helpers.ts          # Utility functions
    ├── interceptor.ts      # Global & instance interceptors
    ├── statusHooks.ts      # HTTP status code hooks
    ├── types.ts            # TypeScript types & interfaces
    └── watcher.ts          # Reactive params watcher
```

---

## Setup

Set your base API URL in `.env`:

```env
VITE_API_URL=https://your-api.com/api/
```

Or set it manually in `main.ts` / `main.js`:

```ts
import { useFetch } from "@mlyrmdhnn/use-fetch";

useFetch.baseURL("https://your-api.com/api/");
```

> Make sure your baseURL ends with `/` to avoid URL building issues.

---

## Basic Usage

### JavaScript

```js
import { useFetch } from "@mlyrmdhnn/use-fetch";

const { data, pending, error } = useFetch("/users");
```

### TypeScript

```ts
import { useFetch } from "@mlyrmdhnn/use-fetch";

const { data, pending, error } = useFetch<User[]>("/users");
```

---

## API

### Signature

```ts
useFetch<T>(endpoint: string, options?: HttpOptions)
```

### Options

| Option            | Type                  | Default        | Description                            |
| ----------------- | --------------------- | -------------- | -------------------------------------- |
| `method`          | `HttpMethod`          | `'GET'`        | HTTP method                            |
| `params`          | `Record<string, any>` | `{}`           | URL query parameters                   |
| `payload`         | `any`                 | `null`         | Request body                           |
| `immediate`       | `boolean`             | `true`         | Auto-execute on composable call        |
| `pagination`      | `boolean`             | `false`        | Enable Laravel pagination mode         |
| `watchParams`     | `boolean`             | `false`        | Re-fetch when params change            |
| `credentials`     | `boolean`             | `false`        | Include cookies/credentials            |
| `baseURL`         | `string`              | `VITE_API_URL` | Override base URL per request          |
| `pick`            | `string`              | `''`           | Pick a specific key from response      |
| `transform`       | `(data: any) => any`  | -              | Transform response data                |
| `timeout`         | `number`              | `10000`        | Request timeout in ms                  |
| `cache`           | `boolean`             | `false`        | Enable sessionStorage cache            |
| `cacheKey`        | `string`              | `endpoint`     | Custom cache key                       |
| `retry`           | `number`              | `0`            | Number of retry attempts               |
| `retryDelay`      | `number`              | `1000`         | Delay between retries in ms            |
| `dedup`           | `boolean`             | `false`        | Enable request deduplication           |
| `skipInterceptor` | `boolean`             | `false`        | Skip all interceptors for this request |
| `headers`         | `HttpHeaders`         | `{}`           | Custom request headers                 |
| `onBeforeRequest` | `(payload) => void`   | -              | Callback before request fires          |
| `onSuccess`       | `(data) => void`      | -              | Callback on success                    |
| `onError`         | `(error) => void`     | -              | Callback on error                      |
| `onFinally`       | `() => void`          | -              | Callback after request completes       |

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
  retryDelay: 2000,
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

// Result: only ONE actual HTTP request fires, both get the same result ✅
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

### Skip Interceptors

Use `skipInterceptor: true` to bypass all interceptors for a specific request. Useful when calling `useFetch` inside an interceptor to prevent infinite loops.

```ts
useFetch.interceptor.request.use(async (config) => {
  // fetch token without triggering interceptors again
  const { data } = useFetch("/refresh-token", {
    skipInterceptor: true,
  });
  return config;
});
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
import { useFetch } from "@mlyrmdhnn/use-fetch";

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
paymentApi.interceptor.request.use(async (config) => {
  config.headers["X-Signature"] = generateSignature();
  return config;
});

paymentApi.onError(422, (err) => {
  toast.error("Payment validation failed");
});
```

Then use anywhere:

```ts
const { data } = useFetch("/users");
const { data } = paymentApi("/transactions");
const { data } = reportApi("/summary");
```

---

## FetchTable Component

A ready-to-use Vue table component that connects directly to `useFetch` with built-in Laravel pagination, search with debounce, loading skeleton, and fully customizable CSS classes.

### Props

| Prop                | Type                               | Default            | Description                     |
| ------------------- | ---------------------------------- | ------------------ | ------------------------------- |
| `cols`              | `{ label: string, key: string }[]` | `[]`               | Column definitions              |
| `endpoint`          | `string`                           | `''`               | API endpoint to fetch data from |
| `showSearch`        | `boolean`                          | `false`            | Show search input               |
| `searchPlaceholder` | `string`                           | `'Search...'`      | Search input placeholder        |
| `showActions`       | `boolean`                          | `false`            | Show actions column             |
| `pick`              | `string`                           | -                  | Pick specific key from response |
| `notFoundText`      | `string`                           | `'Data Not Found'` | Empty state text                |
| `cssClass`          | `object`                           | `{}`               | CSS classes for each element    |

### CSS Class Options

| Key                   | Description                        |
| --------------------- | ---------------------------------- |
| `divCss`              | Wrapper div                        |
| `tableCss`            | Table element                      |
| `theadCss`            | Table head                         |
| `tbodyCss`            | Table body                         |
| `thCss`               | Table header cell                  |
| `trCss`               | Table row                          |
| `tdCss`               | Table data cell                    |
| `searchCss`           | Search input                       |
| `navCss`              | Pagination nav                     |
| `navButton`           | Pagination button                  |
| `activeButton`        | Active pagination button           |
| `tdCssLoading`        | Loading skeleton cell              |
| `navCssButtonLoading` | Loading skeleton pagination button |
| `notFoundCss`         | Not found row                      |

### Slots

| Slot          | Props     | Description                    |
| ------------- | --------- | ------------------------------ |
| `thead`       | -         | Override entire table header   |
| `[col.label]` | `{ row }` | Custom cell content per column |
| `actions`     | `{ row }` | Actions column content         |

### Basic Usage

```vue
<script setup>
import FetchTable from "@mlyrmdhnn/use-fetch/components/fetchTable.vue";

const cols = [
  { label: "Name", key: "name" },
  { label: "Email", key: "email" },
  { label: "Role", key: "role.name" }, // supports dot notation for nested keys
];
</script>

<template>
  <FetchTable
    :cols="cols"
    endpoint="/users"
    :show-search="true"
    :show-actions="true"
  >
    <template #actions="{ row }">
      <button @click="edit(row)">Edit</button>
      <button @click="remove(row)">Delete</button>
    </template>
  </FetchTable>
</template>
```

### With Custom CSS (Tailwind example)

```vue
<template>
  <FetchTable
    :cols="cols"
    endpoint="/users"
    :show-search="true"
    :show-actions="true"
    :css-class="{
      divCss: 'w-full overflow-x-auto',
      tableCss: 'w-full text-sm text-left',
      theadCss: 'text-xs uppercase bg-gray-50',
      thCss: 'font-semibold text-gray-600',
      trCss: 'border-b hover:bg-gray-50',
      tdCss: 'px-6 py-4',
      searchCss: 'border rounded px-3 py-2 mb-4 w-full',
      navCss: 'flex gap-2 mt-4',
      navButton: 'px-3 py-1 border rounded',
      activeButton: 'px-3 py-1 border rounded bg-blue-500 text-white',
      tdCssLoading: 'px-6 py-4 bg-gray-100 animate-pulse',
      notFoundCss: 'text-gray-500',
    }"
  />
</template>
```

### Custom Cell Content

```vue
<template>
  <FetchTable :cols="cols" endpoint="/users">
    <!-- custom cell per column label -->
    <template #Status="{ row }">
      <span :class="row.active ? 'text-green-500' : 'text-red-500'">
        {{ row.active ? "Active" : "Inactive" }}
      </span>
    </template>
  </FetchTable>
</template>
```

> `FetchTable` automatically syncs with Vue Router query params — search and pagination state are reflected in the URL and restored on page refresh.

---

## formDataHandler

A utility that converts a reactive object and an optional file into `FormData`. Optionally generates a preview URL for the file.

### Signature

```ts
formDataHandler(
  reactiveObj: Record<string, any>,
  fileName: string,
  fileValue: File | Blob | null,
  preview?: boolean
): FormData | { formData: FormData, previewValue: string }
```

### Parameters

| Param         | Type                   | Default | Description                     |
| ------------- | ---------------------- | ------- | ------------------------------- |
| `reactiveObj` | `Record<string, any>`  | -       | Reactive object to convert      |
| `fileName`    | `string`               | -       | FormData key for the file       |
| `fileValue`   | `File \| Blob \| null` | -       | File or Blob to attach          |
| `preview`     | `boolean`              | `false` | Return preview URL for the file |

### Without Preview

```ts
import { formDataHandler } from "@mlyrmdhnn/use-fetch/handler/formDataHandler";

const form = reactive({
  name: "John",
  email: "john@example.com",
  role_id: 1,
});

const file = ref<File | null>(null);

const { execute } = useFetch("/users", {
  method: "POST",
  immediate: false,
  payload: () => formDataHandler(form, "avatar", file.value),
});

await execute();
```

### With Preview URL

```ts
const { formData, previewValue } = formDataHandler(
  form,
  "avatar",
  file.value,
  true,
);

// previewValue → blob URL for image preview
// formData     → ready to send
```

### In a Form

```vue
<script setup>
import { reactive, ref } from "vue";
import { useFetch } from "@mlyrmdhnn/use-fetch";
import { formDataHandler } from "@mlyrmdhnn/use-fetch/handler/formDataHandler";

const form = reactive({
  name: "",
  email: "",
});

const file = ref(null);
const preview = ref("");

const onFileChange = (e) => {
  const selected = e.target.files[0];
  file.value = selected;

  const { formData, previewValue } = formDataHandler(
    form,
    "avatar",
    selected,
    true,
  );
  preview.value = previewValue;
};

const { execute, pending } = useFetch("/users", {
  method: "POST",
  immediate: false,
  payload: () => formDataHandler(form, "avatar", file.value),
});
</script>

<template>
  <img v-if="preview" :src="preview" class="w-20 h-20 rounded-full" />
  <input type="text" v-model="form.name" />
  <input type="email" v-model="form.email" />
  <input type="file" @change="onFileChange" />
  <button @click="execute" :disabled="pending">Submit</button>
</template>
```

> Object values are automatically stringified. `null` and `undefined` values are skipped.

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
} from "@mlyrmdhnn/use-fetch";
```

---

## License

MIT
