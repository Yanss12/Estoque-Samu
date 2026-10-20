import { ref, computed } from 'vue'
import { supabase } from './supabase'

// Estado de autenticação compartilhado pela aplicação inteira.
export const session = ref(null)
export const user = ref(null)
export const perfil = ref(null)
export const ehAdmin = computed(() => perfil.value?.papel === 'admin')

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
  // A sessão é atualizada NA HORA (o router depende dela logo após o login/logout).
  // Só a consulta do perfil é adiada: chamar o Supabase (await) dentro do callback
  // trava o supabase-js (deadlock), principalmente na renovação do token.
  supabase.auth.onAuthStateChange((_event, s) => {
    session.value = s
    user.value = s?.user ?? null
    setTimeout(loadPerfil, 0)
  })
}

export function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

export function signOut() {
  return supabase.auth.signOut()
}

// Troca a senha do usuário logado. O banco marca perfis.senha_alterada sozinho
// (trigger em auth.users) — o app não consegue mais escrever esse campo.
export async function alterarSenha(novaSenha) {
  const { error } = await supabase.auth.updateUser({ password: novaSenha })
  if (error) throw error
  await loadPerfil()
}
