import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const build = new Intl.DateTimeFormat('pt-PT', {
  timeZone: 'America/New_York', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
}).format(new Date())
const label = process.env.BUILD_LABEL ?? build

export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify(label) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['apple-touch-icon.png', 'lembretes.ics'],
      manifest: {
        name: 'Coach do Pedro',
        short_name: 'Coach',
        description: 'Rotina, nutrição e treino',
        lang: 'pt-PT',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,ics}'], cleanupOutdatedCaches: true, clientsClaim: true, skipWaiting: true },
    }),
  ],
})
