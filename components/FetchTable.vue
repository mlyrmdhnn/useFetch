<script setup lang="ts">
/**
 * Table component connected with useFetch.
 */

import { useFetch } from "../http/useFetch";
import { useRoute, useRouter } from "vue-router";
import { reactive, watch, computed, onMounted } from "vue";
import { useDebounceFn } from "../handler/useDebounceFn";
const route = useRoute();
const router = useRouter();

/**
 * Interface Props.
 */
interface Props {
  cols: any[];
  title?: string;
  cssClass?: {
    divCss?: string;
    titleCss?: string;
    headerCss?: string;
    tableWrapperCss?: string;
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
  title: "Table",
  showSearch: false,
  searchPlaceholder: "Search something...",
  showActions: false,
  endpoint: "",
  notFoundText: "Data Not Found",
});

const classes = computed(() => {
  const defaultStyle = {
    divCss:
      "w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden",
    titleCss: "text-xl font-semibold text-slate-800 tracking-tight",
    headerCss:
      "flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 border-b border-slate-200",
    searchCss:
      "w-full md:w-72 px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:border-blue-500 placeholder:text-slate-400",
    tableWrapperCss: "w-full overflow-x-auto",
    tableCss: "w-full border-collapse min-w-[600px]",
    theadCss: "bg-slate-50",
    tbodyCss: "divide-y divide-slate-100",
    trCss: "transition-colors hover:bg-slate-50",
    thCss:
      "px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500",
    tdCss: "px-6 py-4 text-sm text-slate-700",
    tdCssLoading:
      "px-6 py-5 relative before:block before:h-4 before:w-full before:rounded-lg before:bg-slate-200 before:animate-pulse",
    notFoundCss: "py-16 text-center text-sm text-slate-400",
    navCss:
      "flex flex-wrap items-center justify-end gap-2 p-6 border-t border-slate-200",
    navButton:
      "h-10 min-w-[40px] px-3 text-sm font-medium border border-slate-300 bg-white rounded-xl hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed",
    activeButton:
      "h-10 min-w-[40px] px-3 text-sm font-medium rounded-xl bg-neutral-900 text-slate-200 shadow-sm",
    navCssButtonLoading: "h-10 w-10 rounded-xl bg-slate-200 animate-pulse",
  };
  return { ...defaultStyle, ...props.cssClass };
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

const { data, pending, links, execute } = useFetch(props.endpoint, {
  watchParams: true,
  params: params,
  pagination: true,
  pick: props.pick,
  immediate: false,
});

onMounted(() => {
  execute();
});

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
    query: { ...route.query, page: 1, search: val },
  });
}, 500);

watch(model, (val) => {
  debouncedSearch(val);
});

const resolvePaginationLabel = (label: string) => {
  if (label.includes("&laquo") || label.toLowerCase().includes("&laquo"))
    return "Previous";
  if (label.includes("&raquo") || label.toLowerCase().includes("&raquo"))
    return "Next";
  return label;
};

const getCellValue = (obj: any, path: string): any => {
  if (!path) return "";
  return path.split(".").reduce((current, key) => {
    if (current === null || current === undefined) return "";
    if (Array.isArray(current))
      return current.map((item) => item[key]).join(", ");
    return current[key];
  }, obj);
};
</script>

<template>
  <div :class="classes.divCss">
    <div :class="classes.headerCss">
      <h2 :class="classes.titleCss">
        {{ props.title }}
      </h2>

      <template v-if="props.showSearch">
        <input
          type="text"
          v-model="model"
          :class="classes.searchCss"
          :placeholder="props.searchPlaceholder"
        />
      </template>
    </div>

    <slot name="component"> </slot>
    <template v-if="!pending">
      <div :class="classes.tableWrapperCss">
        <table :class="classes.tableCss">
          <slot name="thead">
            <thead :class="classes.theadCss">
              <tr :class="classes.trCss">
                <th :class="classes.thCss">No</th>
                <th
                  v-for="(col, i) in props.cols"
                  :key="'th-' + i"
                  scope="col"
                  :class="classes.thCss"
                >
                  {{ col.label }}
                </th>
                <th v-if="props.showActions" :class="classes.thCss">Actions</th>
              </tr>
            </thead>
          </slot>

          <tbody :class="classes.tbodyCss">
            <tr
              :class="classes.trCss"
              v-for="(row, rowIndex) in tableRows"
              :key="rowIndex"
            >
              <td :class="[classes.tdCss, 'text-center']">
                {{ rowIndex + 1 }}
              </td>
              <td
                v-for="(col, colIndex) in props.cols"
                :key="'td-' + colIndex"
                :class="classes.tdCss"
              >
                <slot :row="row" :name="col.label">
                  {{ getCellValue(row, col.key) }}
                </slot>
              </td>
              <td v-if="props.showActions" :class="classes.tdCss">
                <slot name="actions" :row="row" />
              </td>
            </tr>

            <tr v-if="tableRows.length === 0">
              <td
                :colspan="props.cols.length + (props.showActions ? 1 : 0)"
                :class="classes.notFoundCss"
              >
                {{ props.notFoundText }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <nav :class="classes.navCss">
        <button
          @click="goTo(l.url)"
          v-for="(l, i) in links"
          :key="i"
          :disabled="!l.url"
          :class="[
            l.active ? classes.activeButton : classes.navButton,
            l.url == null ? 'cursor-not-allowed' : 'cursor-pointer',
          ]"
        >
          {{ resolvePaginationLabel(l.label) }}
        </button>
      </nav>
    </template>

    <template v-if="pending">
      <div :class="classes.tableWrapperCss">
        <table :class="classes.tableCss">
          <slot name="thead">
            <thead :class="classes.theadCss">
              <tr :class="classes.trCss">
                <th
                  v-for="(col, i) in props.cols"
                  :key="'th-' + i"
                  :class="classes.thCss"
                >
                  {{ col.label }}
                </th>
                <th v-if="props.showActions" :class="classes.thCss">Actions</th>
              </tr>
            </thead>
          </slot>
          <tbody :class="classes.tbodyCss">
            <tr v-for="i in 10" :key="i" :class="classes.trCss">
              <td
                v-for="(col, colIndex) in props.cols"
                :key="'td-' + colIndex"
                :class="classes.tdCssLoading"
              />
              <td v-if="props.showActions" :class="classes.tdCssLoading" />
            </tr>
          </tbody>
        </table>
      </div>

      <nav :class="classes.navCss">
        <button v-for="i in 5" :key="i" :class="classes.navCssButtonLoading" />
      </nav>
    </template>
  </div>
</template>
