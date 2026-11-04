// Tipos de entrada e saída definidos pela stakeholder (Simone).
export const MOTIVOS_ENTRADA = [
  { value: 'almoxarifado', label: 'Almoxarifado' },
  { value: 'emprestimo', label: 'Empréstimo recebido' },
  { value: 'doacao', label: 'Doação recebida' },
]

export const MOTIVOS_SAIDA = [
  { value: 'liberacao', label: 'Liberação para setor' },
  { value: 'emprestimo', label: 'Empréstimo cedido' },
  { value: 'doacao', label: 'Doação cedida' },
  { value: 'avariado', label: 'Avariado / perda' },
  { value: 'vencido', label: 'Vencido (descarte)' },
  { value: 'funcionario', label: 'Entrega a funcionário' },
  { value: 'outros', label: 'Outros (justificar)' },
]

// Motivos que só o servidor gera na Farmácia + rótulos do Almoxarifado para reuso em ListaMovimentacoes/EstornoDialog.
const MOTIVOS_SISTEMA = [
  { value: 'ajuste_auditoria', label: 'Ajuste de auditoria' },
  { value: 'recebimento', label: 'Recebimento' },
  { value: 'outra_unidade', label: 'Outra unidade' },
  { value: 'perda_avaria', label: 'Perda / avaria' },
  { value: 'transferencia_farmacia', label: 'Transferência p/ Farmácia' },
  { value: 'reajuste', label: 'Reajuste de estoque' },
  { value: 'saldo_inicial', label: 'Saldo inicial' },
]

// Motivos de saída que podem tirar saldo de lote vencido.
export const MOTIVOS_LOTE_VENCIDO = ['avariado', 'vencido']

const todos = [...MOTIVOS_ENTRADA, ...MOTIVOS_SAIDA, ...MOTIVOS_SISTEMA]
// Destinatário de saída a funcionário: texto livre novo, com fallback ao cadastro (histórico antigo).
export function nomeDestinatario(m) {
  return m?.funcionario_nome?.trim() || m?.funcionario?.nome || ''
}

export function motivoLabel(v) {
  return todos.find((m) => m.value === v)?.label ?? v ?? '—'
}
