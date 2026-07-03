import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/Estoque-Samu/', // nome do repositório no GitHub (GitHub Pages, case-sensitive)
  server: {
    host: '127.0.0.1', // IPv4 (o navegador resolve localhost p/ cá)
    port: 5174, // 5173 está ocupada pelo OrbStack
    strictPort: true,
  },
})
