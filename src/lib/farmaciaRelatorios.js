import { supabase } from './supabase'
import { motivoLabel } from './movimentacoes'
import { mensagemErro } from './format'

export const FARMACIA_GRUPOS_ITEM = [
  { label: 'Medicamentos', value: 'medicamento' },
  { label: 'Materiais', value: 'material' },
]

export const FARMACIA_MODALIDADES_DISTRIBUICAO = [
  { label: 'Todas as modalidades', value: null },
  { label: 'Consumo institucional (PSM/SAMU)', value: 'consumo' },
  { label: 'Funcionários', value: 'funcionario' },
  { label: 'Baixas (avariado/vencido)', value: 'baixa' },
  { label: 'Outros (doação/empréstimo/outros)', value: 'outros' },
]

export function modalidadeDistribuicaoLabel(r) {
  if (!r) return '—'
  if (r.consumo) return `Consumo (${r.grupo || 'PSM/SAMU'})`
  if (r.modalidade === 'setor') return 'Setor'
  if (r.modalidade === 'funcionario') return 'Funcionário'
  if (r.modalidade === 'baixa') return 'Baixa (avaria/vencido)'
  if (r.modalidade === 'outros') return motivoLabel(r.motivo)
  return r.modalidade || motivoLabel(r.motivo)
}

export function fmtDataHoraFarmacia(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function fmtCompetencia(comp) {
  if (!comp) return '—'
  const [y, m] = String(comp).slice(0, 10).split('-').map(Number)
  if (!y || !m) return String(comp)
  const dt = new Date(y, m - 1, 1)
  return dt.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })
}

// Detecta se o erro do Supabase/PostgREST indica que a view/RPC das migrations 10/11
// ainda não foi aplicada no banco de produção ou se a sessão local é de teste sem JWT real.
export function ehObjetoBancoAusenteOuNaoMigrado(err) {
  if (!err) return false
  const code = String(err.code ?? '')
  const status = Number(err.status ?? err.statusCode ?? 0)
  const msg = `${err.message ?? ''} ${err.details ?? ''} ${err.hint ?? ''}`.toLowerCase()
  if (
    code === 'PGRST205' ||
    code === 'PGRST202' ||
    code === '42P01' ||
    code === '42883' ||
    msg.includes('could not find the table') ||
    msg.includes('could not find the function') ||
    msg.includes('schema cache') ||
    msg.includes('does not exist')
  ) {
    return true
  }
  if (status === 401 || status === 404 || msg.includes('jwt') || msg.includes('unauthorized')) {
    return true
  }
  return false
}

export function mensagemErroFarmacia(err) {
  if (!err) return 'Erro inesperado na operação.'
  const det = String(err.details ?? err.detail ?? '')
  const msg = String(err.message ?? '')

  if (det === 'FARMACIA_PRODUTO_COM_VINCULOS' || /v[ií]nculos|movimenta[cç][oõ]es.*inative/i.test(msg)) {
    return (
      msg ||
      'Produto com movimentações, lotes ou vínculos de auditoria/Almoxarifado não pode ser excluído. Inative o produto.'
    )
  }
  if (det === 'FARMACIA_PRODUTO_INEXISTENTE' || err.code === 'P0002') {
    return msg || 'Produto não encontrado ou já excluído.'
  }
  if (det === 'FARMACIA_PRODUTO_INVALIDO') {
    return msg || 'Informe o produto a excluir.'
  }
  if (det === 'FARMACIA_SEM_PERMISSAO' || err.code === '42501') {
    return msg || 'Somente administradores têm permissão para esta operação.'
  }
  if (det === 'FARMACIA_PERIODO_INVALIDO') {
    return msg || 'Período inválido: a data inicial deve ser menor ou igual à data final.'
  }
  if (ehObjetoBancoAusenteOuNaoMigrado(err)) {
    return 'Função ou consulta ainda não publicada no banco de dados (migração pendente).'
  }
  return mensagemErro(err)
}

function aplicarFiltrosBuilder(q, { eq = {}, gte = {}, lte = {}, order = null } = {}) {
  let builder = q
  for (const [k, v] of Object.entries(eq)) {
    if (v !== undefined && v !== null && v !== '') builder = builder.eq(k, v)
  }
  for (const [k, v] of Object.entries(gte)) {
    if (v !== undefined && v !== null && v !== '') builder = builder.gte(k, v)
  }
  for (const [k, v] of Object.entries(lte)) {
    if (v !== undefined && v !== null && v !== '') builder = builder.lte(k, v)
  }
  const ordens = Array.isArray(order) ? order : order?.column ? [order] : []
  for (const ord of ordens) {
    if (ord?.column) {
      builder = builder.order(ord.column, { ascending: ord.ascending ?? false })
    }
  }
  return builder
}

/**
 * Consulta uma view `farmacia_rel_*` do contrato B-REL.
 * Quando `range` não é informado, busca em páginas de 1000 linhas para não truncar exportações.
 * Se a view ainda não existir no banco (migrations 10/11 pendentes), retorna lista vazia
 * com `migracaoPendente: true` sem quebrar a página.
 */
export async function farmaciaSelectView(viewName, options = {}) {
  const { range = null } = options
  try {
    if (range && typeof range.from === 'number' && typeof range.to === 'number') {
      let q = supabase.from(viewName).select('*', { count: 'exact' })
      q = aplicarFiltrosBuilder(q, options).range(range.from, range.to)
      const { data, error, count } = await q
      if (error) {
        if (ehObjetoBancoAusenteOuNaoMigrado(error)) {
          return { data: [], count: 0, error: null, migracaoPendente: true }
        }
        return { data: [], count: 0, error, migracaoPendente: false }
      }
      return { data: data ?? [], count: count ?? (data ?? []).length, error: null, migracaoPendente: false }
    }

    const passo = 1000
    let acumulado = []
    let from = 0
    let totalCount = null

    while (true) {
      let q = supabase.from(viewName).select('*', { count: from === 0 ? 'exact' : undefined })
      q = aplicarFiltrosBuilder(q, options).range(from, from + passo - 1)
      const { data, error, count } = await q
      if (error) {
        if (ehObjetoBancoAusenteOuNaoMigrado(error)) {
          return { data: [], count: 0, error: null, migracaoPendente: true }
        }
        return { data: [], count: 0, error, migracaoPendente: false }
      }
      const lote = data ?? []
      if (from === 0 && typeof count === 'number') totalCount = count
      acumulado = acumulado.concat(lote)
      if (lote.length < passo || (totalCount !== null && acumulado.length >= totalCount)) {
        break
      }
      from += passo
    }

    return {
      data: acumulado,
      count: totalCount ?? acumulado.length,
      error: null,
      migracaoPendente: false,
    }
  } catch (err) {
    if (ehObjetoBancoAusenteOuNaoMigrado(err)) {
      return { data: [], count: 0, error: null, migracaoPendente: true }
    }
    return { data: [], count: 0, error: err, migracaoPendente: false }
  }
}

/**
 * Executa uma RPC de relatório da Farmácia (`farmacia_rel_alerta_validade`, `farmacia_rel_distribuicao_periodo`).
 * Trata ausência da migration 10 sem quebrar a página.
 */
export async function farmaciaRelRpc(fnName, params = {}) {
  try {
    const { data, error } = await supabase.rpc(fnName, params)
    if (error) {
      if (ehObjetoBancoAusenteOuNaoMigrado(error)) {
        return { data: [], error: null, migracaoPendente: true }
      }
      return { data: null, error, migracaoPendente: false }
    }
    return { data: data ?? [], error: null, migracaoPendente: false }
  } catch (err) {
    if (ehObjetoBancoAusenteOuNaoMigrado(err)) {
      return { data: [], error: null, migracaoPendente: true }
    }
    return { data: null, error: err, migracaoPendente: false }
  }
}

/**
 * Executa a RPC única `farmacia_excluir_produto(p_produto_id bigint)`.
 * Retorna `{ data, error, inexistente, comVinculos }`.
 */
export async function farmaciaExcluirProduto(produtoId) {
  const idNum = Number(produtoId)
  if (!Number.isInteger(idNum) || idNum <= 0) {
    return {
      data: null,
      error: { message: 'Informe o produto a excluir.', details: 'FARMACIA_PRODUTO_INVALIDO' },
      inexistente: false,
      comVinculos: false,
    }
  }
  try {
    const { data, error } = await supabase.rpc('farmacia_excluir_produto', {
      p_produto_id: idNum,
    })
    if (error) {
      const det = String(error.details ?? error.detail ?? '')
      const msg = String(error.message ?? '')
      const inexistente = det === 'FARMACIA_PRODUTO_INEXISTENTE' || error.code === 'P0002'
      const comVinculos =
        det === 'FARMACIA_PRODUTO_COM_VINCULOS' || /v[ií]nculos|inative o produto/i.test(msg)
      return { data: null, error, inexistente, comVinculos }
    }
    return { data, error: null, inexistente: false, comVinculos: false }
  } catch (err) {
    return { data: null, error: err, inexistente: false, comVinculos: false }
  }
}

/**
 * Abre o diálogo de confirmação e executa `farmacia_excluir_produto`.
 * Garante exibição de um único toast por tentativa (sem toast duplo).
 */
export function confirmarExclusaoProduto({
  confirm,
  toast,
  produto,
  onSuccess,
  onRefreshWhenMissing,
  onLoadingChange,
}) {
  const id = produto?.id ?? produto?.produto_id
  const nome = produto?.nome ?? produto?.produto ?? 'este produto'
  if (!id) {
    toast.add({
      severity: 'warn',
      summary: 'Produto inválido',
      detail: 'Informe o produto a excluir.',
      life: 5000,
    })
    return
  }

  confirm.require({
    header: 'Excluir produto',
    message: `Confirma a exclusão permanente de "${nome}"? Só é permitido excluir cadastros sem nenhum lote, movimentação, auditoria ou vínculo com o Almoxarifado. Caso já possua histórico, inative o produto.`,
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancelar', severity: 'secondary', text: true },
    acceptProps: { label: 'Excluir produto', severity: 'danger' },
    accept: async () => {
      onLoadingChange?.(true)
      try {
        const { data, error, inexistente, comVinculos } = await farmaciaExcluirProduto(id)
        if (error) {
          if (inexistente) {
            toast.add({
              severity: 'warn',
              summary: 'Produto não encontrado',
              detail: mensagemErroFarmacia(error),
              life: 5000,
            })
            onRefreshWhenMissing?.()
            return
          }
          toast.add({
            severity: comVinculos ? 'warn' : 'error',
            summary: comVinculos ? 'Exclusão bloqueada' : 'Não foi possível excluir',
            detail: mensagemErroFarmacia(error),
            life: 7000,
          })
          return
        }
        toast.add({
          severity: 'success',
          summary: 'Produto excluído',
          detail: data?.nome || nome,
          life: 4000,
        })
        onSuccess?.(data)
      } finally {
        onLoadingChange?.(false)
      }
    },
  })
}
