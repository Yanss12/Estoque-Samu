import { ref } from 'vue'
import { supabase } from './supabase'

// Estado de autenticação compartilhado pela aplicação inteira.
export const session = ref(null)
export const user = ref(null)
export const perfil = ref(null)

async function loadPerfil() {
  if (!user.value) {
    perfil.value = null
    return
  }
  const { data } = await supabase
    .from('perfis')
    .select('nome, papel')
    .eq('id', user.value.id)
    .single()
  perfil.value = data ?? null
}

function setSession(s) {
  session.value = s
  user.value = s?.user ?? null
  loadPerfil()
}

// Chamado uma vez no boot, antes de montar o app (ver main.js).
export async function initAuth() {
  const { data } = await supabase.auth.getSession()
  setSession(data.session)
  supabase.auth.onAuthStateChange((_event, s) => setSession(s))
}

export function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

export function signOut() {
  return supabase.auth.signOut()
}
