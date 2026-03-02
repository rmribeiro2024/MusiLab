import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  // Em GitHub Actions, GITHUB_ACTIONS=true — usa /MusiLab/ como base.
  // Em dev local (npm run dev) e builds locais, usa /.
  base: process.env.GITHUB_ACTIONS ? '/MusiLab/' : '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.js',
  },
})
