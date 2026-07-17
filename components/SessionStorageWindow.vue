<script setup lang="ts">
import { reactive, ref, computed, onUnmounted } from "vue";
import { getAllSessionStorage } from "../handler/sessionStorage";
import { toast } from "../handler/toast";

let dummyData = ref(getAllSessionStorage());

const refReshData = () => {
  const data = getAllSessionStorage();
  dummyData.value = data;
};

setInterval(() => {
  refReshData();
}, 1000);

const minimized = ref(true);
const search = ref("");

const selected = ref(dummyData.value[0]);

const filteredData = computed(() => {
  return dummyData.value.filter((item) =>
    item.key.toLowerCase().includes(search.value.toLowerCase()),
  );
});

const position = reactive({
  x: window.innerWidth - 950,
  y: 80,
});

const size = reactive({
  width: 900,
  height: 600,
});

let dragging = false;

const startDrag = (e: MouseEvent) => {
  dragging = true;

  const offsetX = e.clientX - position.x;
  const offsetY = e.clientY - position.y;

  const move = (event: MouseEvent) => {
    if (!dragging) return;

    const currentWidth = minimized.value ? 40 : size.width;
    const currentHeight = minimized.value ? 40 : size.height;

    position.x = Math.max(
      0,
      Math.min(event.clientX - offsetX, window.innerWidth - currentWidth),
    );
    position.y = Math.max(
      0,
      Math.min(event.clientY - offsetY, window.innerHeight - currentHeight),
    );
  };

  const up = () => {
    dragging = false;
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", up);
  };

  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
};

const startResize = (e: MouseEvent) => {
  e.stopPropagation();

  const startWidth = size.width;
  const startHeight = size.height;

  const startX = e.clientX;
  const startY = e.clientY;

  const move = (event: MouseEvent) => {
    size.width = Math.max(600, startWidth + (event.clientX - startX));
    size.height = Math.max(300, startHeight + (event.clientY - startY));
  };

  const up = () => {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", up);
  };

  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
};
const formatValue = (raw: string): string => {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
};
const parsedMeta = computed(() => {
  try {
    const parsed = JSON.parse(selected.value?.value ?? (selected.value as any));
    return {
      desc: parsed?.desc ?? null,
      timestamp: parsed?.timestamp ?? null,
      lastUpdated: parsed?.lastUpdated ?? null,
    };
  } catch {
    return { desc: null, timestamp: null, lastUpdated: null };
  }
});

const deleteSessionStorage = (key: string) => {
  try {
    sessionStorage.removeItem(key);
    toast.success("Success to delete session storage");
    refReshData();
  } catch {
    toast.error("Failed to remove session storage");
  }
};
</script>

<template>
  <!-- Minimized: tiny floating icon -->
  <div
    v-if="minimized"
    class="fixed z-[2147483647] w-10 h-10 bg-slate-900 border border-slate-700 rounded-full shadow-2xl flex items-center justify-center cursor-move select-none group"
    :style="{ left: `${position.x}px`, top: `${position.y}px` }"
    @mousedown="startDrag"
    @dblclick="minimized = false"
    title="Double-click to expand"
  >
    <svg
      class="w-5 h-5 text-green-400"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      viewBox="0 0 24 24"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>

    <!-- Tooltip -->
    <div
      class="absolute bottom-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
    >
      Session Inspector
    </div>
  </div>

  <!-- Expanded: full devtools panel -->
  <div
    v-else
    class="fixed bg-slate-950 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-[2147483647]"
    :style="{
      left: `${position.x}px`,
      top: `${position.y}px`,
      width: `${size.width}px`,
      height: `${size.height}px`,
    }"
  >
    <!-- Header -->
    <div
      class="h-12 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900 cursor-move select-none"
      @mousedown="startDrag"
    >
      <div class="flex items-center gap-2">
        <svg
          class="w-5 h-5 text-green-400"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        <h2 class="text-sm font-semibold text-white">
          Session Storage Inspector
        </h2>
      </div>

      <div class="flex items-center gap-2">
        <!-- Minimize button -->
        <button
          class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
          @click.stop="minimized = true"
          title="Minimize"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path d="M5 12h14" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Search -->
    <div class="p-3 border-b border-slate-800">
      <input
        v-model="search"
        type="text"
        placeholder="Search session storage..."
        class="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green-500"
      />
      <h2 class="text-white font-semibold" @click="refReshData">Refresh</h2>
    </div>

    <!-- Content -->
    <div class="flex h-[calc(100%-101px)]">
      <!-- Sidebar -->
      <div class="w-80 border-r border-slate-800 overflow-y-auto">
        <!-- empty state -->
        <div
          v-if="filteredData.length === 0"
          class="flex flex-col items-center justify-center h-full gap-2 py-12"
        >
          <svg
            class="w-8 h-8 text-slate-600"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            viewBox="0 0 24 24"
          >
            <path
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4"
            />
          </svg>
          <p class="text-xs text-slate-500">No session storage found</p>
        </div>

        <!-- list -->
        <div
          v-for="item in filteredData"
          :key="item.key"
          @click="selected = item"
          class="px-4 py-3 border-b border-slate-900 cursor-pointer transition-colors"
          :class="
            selected?.key === item.key ? 'bg-slate-800' : 'hover:bg-slate-900'
          "
        >
          <div class="flex justify-between items-center">
            <span class="text-sm text-white truncate">{{ item.key }}</span>
            <span
              class="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400"
            >
              {{ item.size }}
            </span>
          </div>
        </div>
      </div>

      <!-- Detail -->

      <div class="flex-1 flex flex-col">
        <!-- no selection / empty -->
        <div
          v-if="!selected"
          class="flex flex-col items-center justify-center h-full gap-2 text-slate-500"
        >
          <svg
            class="w-10 h-10 text-slate-700"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            viewBox="0 0 24 24"
          >
            <path d="M3 7h18M3 12h18M3 17h18" />
          </svg>
          <p class="text-sm">Select a key to inspect</p>
        </div>

        <!-- has selection -->
        <template v-else>
          <div
            class="px-4 py-3 border-b border-slate-800 flex items-center justify-between"
          >
            <div class="flex flex-col gap-1">
              <h3 class="text-white font-medium">{{ selected.key ?? "" }}</h3>

              <!-- Meta badges -->
              <div class="flex items-center gap-2 flex-wrap">
                <span
                  class="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono"
                >
                  {{ selected.type ?? "" }}
                </span>
                <span
                  class="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400"
                >
                  {{ selected.size ?? "" }}
                </span>
              </div>

              <!-- Description -->
              <p v-if="parsedMeta.desc" class="text-sm text-slate-400 mt-1">
                {{ parsedMeta.desc ?? "" }}
              </p>

              <!-- Timestamp & lastUpdated -->
              <div
                v-if="parsedMeta.timestamp || parsedMeta.lastUpdated"
                class="flex items-center gap-3 mt-1"
              >
                <p
                  v-if="parsedMeta.timestamp"
                  class="text-[12px] text-slate-500 font-mono"
                >
                  {{ new Date(parsedMeta.timestamp).toLocaleString() ?? "" }}
                </p>
                <p
                  v-if="parsedMeta.lastUpdated"
                  class="text-[12px] text-slate-500 font-mono"
                >
                  Last updated: {{ parsedMeta.lastUpdated ?? "" }}
                </p>
              </div>
            </div>

            <!--  -->
            <!--  -->
            <!--  -->
            <!--  -->
            <!--  -->
            <!--  -->
            <!--  -->
            <!--  -->
            <!--  -->
            <!--  -->
            <!--  -->
            <!--  -->
            <!--  -->
            <!--  -->
            <!--  -->

            <!--  -->
            <!--  -->
            <!--  -->
            <!--  -->
            <!--  -->
            <!--  -->
            <!--  -->
            <!--  -->

            <button
              @click="deleteSessionStorage(selected.key ?? '')"
              class="px-3 py-1.5 text-sm rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 self-start"
            >
              Delete
            </button>
          </div>
          <div class="flex-1 overflow-auto p-4">
            <pre
              class="text-sm text-green-400 font-mono whitespace-pre-wrap break-all"
              >{{ formatValue(selected.value ?? "") }}</pre
            >
          </div>
        </template>
      </div>
    </div>

    <!-- Resize Handle -->
    <div
      class="absolute bottom-1 right-1 w-5 h-5 cursor-se-resize flex items-end justify-end"
      @mousedown="startResize"
    >
      <svg
        class="w-3 h-3 text-slate-500"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
        <path d="M14 20L20 14M10 20L20 10M6 20L20 6" />
      </svg>
    </div>
  </div>
</template>
