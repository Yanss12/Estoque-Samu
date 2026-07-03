import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import { definePreset } from '@primevue/themes'
import Aura from '@primevue/themes/aura'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import 'primeicons/primeicons.css'
import './style.css'
import router from './router'
import { initAuth } from './lib/auth'
import { initTheme } from './lib/theme'
import App from './App.vue'

// Identidade NEUTRA: cinza (zinc) como cor primária — sem azul.
const SamuPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fafafa',
      100: '#f4f4f5',
      200: '#e4e4e7',
      300: '#d4d4d8',
      400: '#a1a1aa',
      500: '#71717a',
      600: '#52525b',
      700: '#3f3f46',
      800: '#27272a',
      900: '#18181b',
      950: '#09090b',
    },
  },
})

initTheme()

initAuth().then(() => {
  createApp(App)
    .use(router)
    .use(PrimeVue, {
      theme: { preset: SamuPreset, options: { darkModeSelector: '.app-dark' } },
    })
    .use(ToastService)
    .use(ConfirmationService)
    .mount('#app')
})
