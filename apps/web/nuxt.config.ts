import { fileURLToPath } from 'node:url'
import pkg from './package.json'

export default defineNuxtConfig({
  devtools: { enabled: true },

  experimental: {
    appManifest: false,
  },

  alias: {
    '#app-manifest': fileURLToPath(new URL('./app-manifest-stub.json', import.meta.url)),
  },

  components: {
    dirs: [
      {
        path: '~/components',
        pathPrefix: false,
      },
    ],
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt',
  ],

  /** Cache client durable des icônes Albion (CDN) via Workbox — affichage quasi instantané au retour */
  pwa: {
    registerType: 'autoUpdate',
    strategies: 'generateSW',
    manifest: {
      name: 'Albion - SilverMind',
      short_name: 'SilverMind',
      description: 'Base Albion Online — items, crafting, marché',
      theme_color: '#0a0a0f',
      background_color: '#0a0a0f',
      display: 'standalone',
      start_url: '/',
      lang: 'fr',
      icons: [
        {
          src: '/images/silvermind/android-chrome-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/images/silvermind/android-chrome-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    },
    client: {
      registerPlugin: true,
      /** Pas de prompt « Ajouter à l’écran d’accueil » — focus sur le cache CDN */
      installPrompt: true,
    },
    devOptions: {
      enabled: false,
    },
    workbox: {
      navigateFallbackDenylist: [/^\/api\//],
      runtimeCaching: [
        {
          urlPattern:
            /^https:\/\/render\.albiononline\.com\/v1\/(item|spell)\/.+\.png(\?.*)?$/i,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'ao-render-icons-v1',
            expiration: {
              maxEntries: 1000,
              maxAgeSeconds: 60 * 60 * 24 * 30,
              purgeOnQuotaError: true,
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
      ],
    },
  },

  runtimeConfig: {
    sessionSecret: process.env.NUXT_SESSION_SECRET ?? '',
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    redisHost: process.env.REDIS_HOST ?? 'localhost',
    redisPort: Number(process.env.REDIS_PORT ?? 6379),
    redisPassword: process.env.REDIS_PASSWORD ?? '',
    public: {
      appName: 'Albion SilverMind',
      appUrl: process.env.APP_URL ?? 'http://localhost:3000',
      appVersion: process.env.NUXT_PUBLIC_APP_VERSION || pkg.version || '0.0.1',
      appBuild: process.env.NUXT_PUBLIC_APP_BUILD || process.env.APP_BUILD || 'dev',
    },
  },

  css: ['~/assets/css/design-system.css'],

  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css',
    configPath: '~/tailwind.config.ts',
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  sourcemap: {
    server: false,
    client: false,
  },

  nitro: {
    experimental: {
      tasks: true,
    },
  },

  app: {
    head: {
      title: 'Albion - SilverMind',
      htmlAttrs: { lang: 'en', class: 'dark' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#0a0a0f' },
        {
          name: 'theme-color',
          content: '#0f172a'
        },
        {
          name: 'apple-mobile-web-app-capable',
          content: 'yes'
        },
        {
          name: 'apple-mobile-web-app-status-bar-style',
          content: 'black-translucent'
        }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'preconnect', href: 'https://render.albiononline.com' },

        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'
        },

        // favicon classique
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '32x32',
          href: '/images/silvermind/favicon-32x32.png'
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '16x16',
          href: '/images/silvermind/favicon-16x16.png'
        },

        // Apple
        {
          rel: 'apple-touch-icon',
          sizes: '180x180',
          href: '/images/silvermind/apple-touch-icon.png'
        },

        // Android / PWA
        {
          rel: 'manifest',
          href: '/site.webmanifest'
        }
      ],
    },
  },

  compatibilityDate: '2024-12-01',
})
