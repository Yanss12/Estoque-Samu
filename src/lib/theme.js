import { ref } from 'vue'

// Dark mode: automático pelo SO (prefers-color-scheme) na 1ª vez, depois
// respeita a escolha manual salva (plantão noturno do SAMU).
const KEY = 'samu-theme'
export const isDark = ref(false)

function apply(dark) {
  isDark.value = dark
  document.documentElement.classList.toggle('app-dark', dark)
}

export function initTheme() {
  const saved = localStorage.getItem(KEY)
  const dark = saved
    ? saved === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches
  apply(dark)
}

export function toggleTheme() {
  const dark = !isDark.value
  localStorage.setItem(KEY, dark ? 'dark' : 'light')
  apply(dark)
}
