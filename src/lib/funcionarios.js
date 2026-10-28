import { supabase } from './supabase'

// Funcionários ativos do COMUE (destino das saídas com motivo 'funcionario').
export async function carregarFuncionariosAtivos() {
  const { data } = await supabase.from('funcionarios').select('id, nome').eq('ativo', true).order('nome')
  return data ?? []
}
