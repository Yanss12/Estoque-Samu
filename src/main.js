import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import { definePreset } from '@primevue/themes'
import Aura from '@primevue/themes/aura'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'
import 'primeicons/primeicons.css'
import './style.css'
import router from './router'
import { initAuth } from './lib/auth'
import { initTheme } from './lib/theme'
import App from './App.vue'

// Identidade NEUTRA: cinza (zinc) como cor primária — sem azul. Tokens em style.css.
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
    // Ação primária = tinta (quase preto no claro, quase branco no escuro).
    colorScheme: {
      light: {
        primary: {
          color: '{zinc.900}',
          contrastColor: '#ffffff',
          hoverColor: '{zinc.800}',
          activeColor: '{zinc.700}',
        },
        highlight: {
          background: '{zinc.900}',
          focusBackground: '{zinc.800}',
          color: '#ffffff',
          focusColor: '#ffffff',
        },
      },
      dark: {
        primary: {
          color: '{zinc.100}',
          contrastColor: '{zinc.950}',
          hoverColor: '{zinc.200}',
          activeColor: '{zinc.300}',
        },
        highlight: {
          background: 'rgba(250, 250, 250, .16)',
          focusBackground: 'rgba(250, 250, 250, .24)',
          color: 'rgba(255, 255, 255, .87)',
          focusColor: 'rgba(255, 255, 255, .87)',
        },
      },
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
    .directive('tooltip', Tooltip)
    .mount('#app')
})
