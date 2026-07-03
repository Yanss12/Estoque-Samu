import { ref, computed } from 'vue'
import { supabase } from './supabase'

// Estado de autenticação compartilhado pela aplicação inteira.
export const session = ref(null)
export const user = ref(null)
export const perfil = ref(null)

// True quando o usuário ainda está com a senha padrão (1º acesso) e precisa trocá-la.
export const precisaTrocarSenha = computed(
  () => !!user.value && !!perfil.value && perfil.value.senha_alterada === false
)

async function loadPerfil() {
  if (!user.value) {
    perfil.value = null
    return
  }
  const { data } = await supabase
    .from('perfis')
    .select('nome, papel, senha_alterada')
    .eq('id', user.value.id)
    .single()
  perfil.value = data ?? null
}

async function setSession(s) {
  session.value = s
  user.value = s?.user ?? null
  await loadPerfil()
}

// Chamado uma vez no boot, antes de montar o app (ver main.js).
export async function initAuth() {
  const { data } = await supabase.auth.getSession()
  await setSession(data.session)
  supabase.auth.onAuthStateChange((_event, s) => setSession(s))
}

export function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

export function signOut() {
  return supabase.auth.signOut()
}

// Troca a senha do usuário logado e marca o perfil como "senha já alterada".
export async function alterarSenha(novaSenha) {
  const { error } = await supabase.auth.updateUser({ password: novaSenha })
  if (error) throw error
  if (user.value) {
    await supabase.from('perfis').update({ senha_alterada: true }).eq('id', user.value.id)
    await loadPerfil()
  }
}
