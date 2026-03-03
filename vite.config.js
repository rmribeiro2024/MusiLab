import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"

const base = process.env.GITHUB_ACTIONS ? '/MusiLab/' : '/'

export default defineConfig({
  // Em GitHub Actions, GITHUB_ACTIONS=true — usa /MusiLab/ como base.
  // Em dev local (npm run dev) e builds locais, usa /.
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'MusiLab — Planejamento Musical',
        short_name: 'MusiLab',
        description: 'Planejamento Musical Educacional para Professores',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#1e1b4b',
        theme_color: '#1e1b4b',
        orientation: 'portrait',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/eufwttfndthjrvxtturl\.supabase\.co\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }
            }
          }
        ]
      }
    })
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.js',
  },
})
