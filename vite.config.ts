import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import dts from "vite-plugin-dts";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    vue(),
    dts({
      insertTypesEntry: true, // Membuat file entry khusus untuk types (.d.ts)
      cleanVueFileName: true,
    }),
  ],
  build: {
    lib: {
      // Menentukan entry point yang tadi kita buat
      entry: resolve(__dirname, "index.ts"),
      name: "MyFetchModule",
      // Format output: es (ES Modules) dan cjs (CommonJS)
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      // Pastikan untuk tidak mem-bundle Vue ke dalam package lu
      external: ["vue"],
      output: {
        globals: {
          vue: "Vue",
        },
      },
    },
  },
});
