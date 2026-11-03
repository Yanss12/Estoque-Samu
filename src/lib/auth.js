import { ref, computed } from 'vue'
import { supabase } from './supabase'
import { resolverNivelMock } from './almox'

// Estado de autenticação compartilhado pela aplicação inteira.
export const session = ref(null)
export const user = ref(null)
export const perfil = ref(null)
export const PAPEIS = ['operador', 'auditor', 'farmaceutico', 'admin']
export const ehAdmin = computed(() => perfil.value?.papel === 'admin')
export const podeAuditar = computed(() => ['auditor', 'farmaceutico', 'admin'].includes(perfil.value?.papel))

// Estado de acesso ao Módulo Almoxarifado (Seção 8.1)
export const almoxNivel = ref('nenhum')
export const almoxVer = computed(() => ['consulta', 'total'].includes(almoxNivel.value))
export const almoxGerir = computed(() => almoxNivel.value === 'total')

// True quando o usuário ainda está com a senha padrão (1º acesso) e precisa trocá-la.
export const precisaTrocarSenha = computed(
  () => !!user.value && !!perfil.value && perfil.value.senha_alterada === false
)

function limparChavesContexto() {
  try {
    sessionStorage.removeItem('samu.ctx.ultima.farmacia')
    sessionStorage.removeItem('samu.ctx.ultima.almoxarifado')
  } catch {
    // Ignora caso sessionStorage esteja indisponível
  }
}

async function loadPerfil() {
  if (!user.value) {
    perfil.value = null
    almoxNivel.value = 'nenhum'
    return
  }

  // Suporte de simulação local exclusiva de DEV para inspeção automatizada sem tocar no Supabase
  if (import.meta.env.DEV && user.value.id === '00000000-0000-0000-0000-000000000099') {
    return
  }

  const { data } = await supabase
    .from('perfis')
    .select('nome, papel, senha_alterada')
    .eq('id', user.value.id)
    .single()
  perfil.value = data ?? null

  try {
    const { data: nivel, error: errNivel } = await supabase.rpc('almox_nivel')
    if (!errNivel && ['nenhum', 'consulta', 'total'].includes(nivel)) {
      almoxNivel.value = nivel
    } else {
      almoxNivel.value = resolverNivelMock(user.value, perfil.value)
    }
  } catch {
    almoxNivel.value = resolverNivelMock(user.value, perfil.value)
  }
}

async function setSession(s) {
  session.value = s
  user.value = s?.user ?? null
  await loadPerfil()
}

// Chamado uma vez no boot, antes de montar o app (ver main.js).
export async function initAuth() {
  const { data } = await supabase.auth.getSession()
  if (!data.session && import.meta.env.DEV) {
    try {
      const raw = localStorage.getItem('samu.dev.mock_auth')
      if (raw) {
        const mock = JSON.parse(raw)
        const fakeUser = {
          id: '00000000-0000-0000-0000-000000000099',
          email: mock.email || 'admin@gmail.com',
        }
        session.value = { user: fakeUser }
        user.value = fakeUser
        perfil.value = {
          nome: mock.nome || 'Elaine (RT)',
          papel: mock.papel || 'admin',
          senha_alterada: true,
        }
        almoxNivel.value = ['nenhum', 'consulta', 'total'].includes(mock.nivel)
          ? mock.nivel
          : resolverNivelMock(fakeUser, perfil.value)
        return
      }
    } catch {
      // Ignora JSON inválido
    }
  }
  await setSession(data.session)
  // A sessão é atualizada NA HORA (o router depende dela logo após o login/logout).
  // Só a consulta do perfil é adiada: chamar o Supabase (await) dentro do callback
  // trava o supabase-js (deadlock), principalmente na renovação do token.
  supabase.auth.onAuthStateChange((_event, s) => {
    session.value = s
    user.value = s?.user ?? null
    if (!s) {
      almoxNivel.value = 'nenhum'
      limparChavesContexto()
    }
    setTimeout(loadPerfil, 0)
  })
}

export function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  almoxNivel.value = 'nenhum'
  limparChavesContexto()
  if (import.meta.env.DEV) {
    try {
      localStorage.removeItem('samu.dev.mock_auth')
    } catch {
      // Ignora
    }
  }
  return supabase.auth.signOut()
}

// Troca a senha do usuário logado. O banco marca perfis.senha_alterada sozinho
// (trigger em auth.users) — o app não consegue mais escrever esse campo.
export async function alterarSenha(novaSenha) {
  const { error } = await supabase.auth.updateUser({ password: novaSenha })
  if (error) throw error
  await loadPerfil()
}
