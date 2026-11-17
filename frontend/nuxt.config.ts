import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
export default defineNuxtConfig({
 compatibilityDate: '2025-01-01',
 devtools: { enabled: false },
 telemetry: false,
 css: ['vuetify/styles','@mdi/font/css/materialdesignicons.css'],
 build: { transpile: ['vuetify'] },
 modules: [(_options,nuxt)=>{nuxt.hooks.hook('vite:extendConfig',config=>{config.plugins?.push(vuetify({autoImport:true}))})}],
 vite: { vue: { template: { transformAssetUrls } } },
 routeRules: { '/api/**': { proxy: `${process.env.API_PROXY_TARGET || 'http://127.0.0.1:5151'}/api/**` } },
 runtimeConfig: { public: { apiBase: '' } }
})
