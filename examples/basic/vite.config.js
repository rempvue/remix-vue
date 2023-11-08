import { defineConfig } from "vite";
import { unstable_vitePlugin as remix } from "@remix-vue/dev";
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  server: {
    fs: {
      // The API logic is in outside of the project
      strict: false,
    },
  },
  plugins: [vue(),remix({
    ignoredRouteFiles: ["**/.*"],
  })],
})
