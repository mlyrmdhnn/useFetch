<script setup lang="ts">
import { toastState, toast } from '../handler/toast'
</script>

<template>
  <div class="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none">
    <TransitionGroup
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-x-10 opacity-0 scale-95"
      leave-active-class="transition-all duration-200 ease-in"
      leave-to-class="translate-x-10 opacity-0 scale-95"
      move-class="transition-all duration-300"
    >
      <div
        v-for="t in toastState.toasts"
        :key="t.id"
        role="alert"
        class="group relative pointer-events-auto w-[360px] rounded-2xl border shadow-2xl transition-all duration-300 overflow-hidden"
        :class="[
          t.mode === 'dark' ? 'border-white/10' : 'border-black/5',
          // Gradient Background Layer
          t.type === 'success' ? 'bg-gradient-to-b from-emerald-500/10 to-transparent' : '',
          t.type === 'error' ? 'bg-gradient-to-b from-rose-500/10 to-transparent' : '',
          t.type === 'info' ? 'bg-gradient-to-b from-sky-500/10 to-transparent' : '',
          t.type === 'warning' ? 'bg-gradient-to-b from-amber-500/10 to-transparent' : '',
          t.mode === 'dark' ? 'bg-neutral-900/90' : 'bg-white/90 backdrop-blur-md',
        ]"
      >
        <div class="flex items-start gap-4 px-5 py-4">
          <div
            class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
            :class="[
              t.type === 'success' ? 'bg-emerald-500 text-white' : '',
              t.type === 'error' ? 'bg-rose-500 text-white' : '',
              t.type === 'info' ? 'bg-sky-500 text-white' : '',
              t.type === 'warning' ? 'bg-amber-500 text-white' : '',
            ]"
          >
            <svg
              v-if="t.type === 'success'"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <svg
              v-if="t.type === 'error'"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01" />
              <circle cx="12" cy="12" r="9" />
            </svg>
            <svg
              v-if="t.type === 'info'"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <svg
              v-if="t.type === 'warning'"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <div class="min-w-0 flex-1">
            <p
              class="mb-0.5 text-sm font-bold capitalize"
              :class="t.mode === 'dark' ? 'text-white' : 'text-neutral-900'"
            >
              {{ t.type }}
            </p>
            <p
              class="text-sm leading-relaxed"
              :class="t.mode === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
            >
              {{ t.message }}
            </p>
          </div>

          <button
            @click="toast.remove(t.id)"
            class="ml-2 mt-1 transition-opacity opacity-50 hover:opacity-100"
            :class="t.mode === 'dark' ? 'text-white' : 'text-neutral-900'"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>
