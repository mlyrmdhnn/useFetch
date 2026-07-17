<script setup lang="ts">
import { computed } from 'vue'
import { resolvePaginationLabel } from '../handler/resolveLabel'
import { useRouter, useRoute } from 'vue-router'

const route = useRoute()
const router = useRouter()

interface PageStyles {
  navButton?: string
  numberButton?: string
  active?: string
}

interface Props {
  links: any[]
  from: number
  to: number
  total: number
  currentPage: number
  navCss?: string
  pageStyles?: PageStyles
}

const props = withDefaults(defineProps<Props>(), {
  navCss: 'flex items-center justify-center gap-2 mt-4',
  pageStyles: () => ({
    navButton: 'px-3 py-1 border rounded-md hover:bg-gray-100 disabled:opacity-50',
    numberButton: 'px-3 py-1 border rounded-md hover:bg-gray-100',
    active: 'px-3 py-1 border rounded-md bg-blue-600 text-white font-bold',
  }),
})

const goToPage = (url: string | null) => {
  if (!url) return
  const urlObj = new URL(url)
  const page = urlObj.searchParams.get('page')
  if (page) {
    router.push({ query: { ...route.query, page } })
  }
}

const pagination = computed(() => ({
  links: props.links,
  from: props.from,
  to: props.to,
  total: props.total,
  currentPage: props.currentPage,
}))
</script>

<template>
  <nav :class="props.navCss">
    <div class="text-sm text-gray-600 mr-4">
      Menampilkan
      <span class="font-semibold">{{ pagination.from }}</span> sampai
      <span class="font-semibold">{{ pagination.to }}</span> dari
      <span class="font-semibold">{{ pagination.total }}</span> data
    </div>

    <div class="flex gap-2">
      <button
        v-for="(link, index) in pagination.links"
        :key="index"
        @click="goToPage(link.url)"
        :disabled="!link.url"
        :class="resolvePaginationLabel(link.label, link.active, props.pageStyles).className"
      >
        {{ resolvePaginationLabel(link.label, link.active, props.pageStyles).label }}
      </button>
    </div>
  </nav>
</template>
