<script setup lang="ts">
/**
 * Table component connected with useFetch.
 */

import { useFetch } from "../http/useFetch";
import { useRoute, useRouter } from "vue-router";
import { reactive, watch, computed } from "vue";
import { useDebounceFn } from "../handler/useDebounceFn";
const route = useRoute();
const router = useRouter();
/**
 * Interface Props.
 */

interface Props {
  cols: any[];
  cssClass?: {
    divCss?: string;
    tableCss?: string;
    theadCss?: string;
    tbodyCss?: string;
    thCss?: string;
    trCss?: string;
    tdCss?: string;
    searchCss?: string;
    navCss?: string;
    navButton?: string;
    activeButton?: string;
    tdCssLoading?: string;
    navCssButtonLoading?: string;
    notFoundCss?: string;
  };
  showSearch?: boolean;
  searchPlaceholder?: string;
  showActions?: boolean;
  pick?: string;
  endpoint: string;
  notFoundText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  cols: () => [],
  cssClass: () => ({}),
  showSearch: false,
  searchPlaceholder: "Search...",
  showActions: false,
  endpoint: "",
  notFoundText: "Data Not Found",
});

const params = reactive({
  ...route.query,
});

watch(
  () => route.query,
  (val) => {
    Object.assign(params, val);
  },
  { deep: true },
);

/**
 * Fetching.
 */
const { data, pending, from, to, total, links } = useFetch(props.endpoint, {
  watchParams: true,
  params: params,
  pagination: true,
  pick: props.pick,
});

/**
 * Safe Data Array normalization for the template.
 * Handles cases where data is a direct array or wrapped in a Laravel pagination object.
 */
const tableRows = computed<any[]>(() => {
  if (!data.value) return [];
  if (Array.isArray(data.value)) return data.value;
  if (
    typeof data.value === "object" &&
    "data" in data.value &&
    Array.isArray((data.value as any).data)
  ) {
    return (data.value as any).data;
  }
  return [];
});

const goTo = (url: string) => {
  if (!url) return;
  const parsed = new URL(url);
  const target = parsed.searchParams.get("page");
  router.push({
    path: route.path,
    query: { ...route.query, page: target },
  });
};

const model = defineModel<string>();

const debouncedSearch = useDebounceFn((val) => {
  router.push({
    query: {
      ...route.query,
      page: 1,
      search: val,
    },
  });
}, 500);

watch(model, (val) => {
  debouncedSearch(val);
});

/**
 * Handler pagination label.
 * @param label
 */
const resolvePaginationLabel = (label: string) => {
  if (label.includes("&laquo") || label.toLowerCase().includes("&laquo"))
    return "Previous";
  if (label.includes("&raquo") || label.toLowerCase().includes("&raquo"))
    return "Next";
  return label;
};

/**
 * Handler response result from laravel.
 * @param obj
 * @param path
 */
const getCellValue = (obj: any, path: string): any => {
  if (!path) return "";
  return path.split(".").reduce((current, key) => {
    if (current === null || current === undefined) return "";

    if (Array.isArray(current)) {
      return current.map((item) => item[key]).join(", ");
    }

    return current[key];
  }, obj);
};
</script>

<template>
  <div :class="props.cssClass?.divCss">
    <template v-if="!pending">
      <template v-if="props.showSearch">
        <input
          type="text"
          v-model="model"
          :class="props.cssClass?.searchCss"
          :placeholder="props.searchPlaceholder"
        />
      </template>

      <table :class="props.cssClass?.tableCss">
        <slot name="thead">
          <thead :class="props.cssClass?.theadCss">
            <tr :class="props.cssClass?.trCss">
              <th
                v-for="(col, i) in props.cols"
                :key="'th-' + i"
                scope="col"
                :class="['px-6 py-4', props.cssClass?.thCss]"
              >
                {{ col.label }}
              </th>
              <th
                v-if="props.showActions"
                :class="['px-6 py-4', props.cssClass?.thCss]"
              >
                Options
              </th>
            </tr>
          </thead>
        </slot>

        <tbody :class="props.cssClass?.tbodyCss">
          <tr
            :class="props.cssClass?.trCss"
            v-for="(row, rowIndex) in tableRows"
            :key="rowIndex"
          >
            <td
              v-for="(col, colIndex) in props.cols"
              :key="'td-' + colIndex"
              :class="props.cssClass?.tdCss"
            >
              <slot :row="row" :name="col.label">
                {{ getCellValue(row, col.key) }}
              </slot>
            </td>
            <td v-if="props.showActions" :class="props.cssClass?.tdCss">
              <slot name="actions" :row="row"></slot>
            </td>
          </tr>

          <tr v-if="tableRows.length === 0">
            <td
              :colspan="props.cols.length + (props.showActions ? 1 : 0)"
              :class="['text-center py-4', props.cssClass?.notFoundCss]"
            >
              {{ props.notFoundText }}
            </td>
          </tr>
        </tbody>
      </table>

      <nav :class="props.cssClass?.navCss">
        <button
          @click="goTo(l.url)"
          v-for="(l, i) in links"
          :key="i"
          :class="[
            l.active ? props.cssClass?.activeButton : props.cssClass?.navButton,
            l.url == null ? 'cursor-not-allowed' : 'cursor-pointer',
          ]"
        >
          {{ resolvePaginationLabel(l.label) }}
        </button>
      </nav>
    </template>

    <template v-if="pending">
      <table :class="props.cssClass?.tableCss">
        <slot name="thead">
          <thead :class="props.cssClass?.theadCss">
            <tr :class="props.cssClass?.trCss">
              <th
                v-for="(col, i) in props.cols"
                :key="'th-' + i"
                scope="col"
                :class="['px-6 py-4', props.cssClass?.thCss]"
              >
                {{ col.label }}
              </th>
              <th
                v-if="props.showActions"
                :class="['px-6 py-4', props.cssClass?.thCss]"
              >
                Options
              </th>
            </tr>
          </thead>
        </slot>
        <tbody :class="props.cssClass?.tbodyCss">
          <tr v-for="i in 10" :key="i" :class="props.cssClass?.trCss">
            <td
              v-for="(col, colIndex) in props.cols"
              :key="'td-' + colIndex"
              :class="props.cssClass?.tdCssLoading"
            ></td>
            <td
              v-if="props.showActions"
              :class="props.cssClass?.tdCssLoading"
            ></td>
          </tr>
        </tbody>
      </table>
      <nav :class="props.cssClass?.navCss">
        <button
          v-for="i in 5"
          :key="i"
          :class="props.cssClass?.navCssButtonLoading"
        ></button>
      </nav>
    </template>
  </div>
</template>
