import { supabase } from './supabase'

// Mapa { usuario_id: nome } para exibir o autor das movimentações.
// (usuario_id aponta p/ auth.users; o nome vem de perfis, ligado pelo mesmo id.)
export async function fetchPerfisMap() {
  const { data } = await supabase.from('perfis').select('id, nome')
  return Object.fromEntries((data ?? []).map((p) => [p.id, p.nome ?? '—']))
}
