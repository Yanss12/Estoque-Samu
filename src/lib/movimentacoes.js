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

// Motivos que só o servidor gera (não aparecem como opção manual).
const MOTIVOS_SISTEMA = [{ value: 'ajuste_auditoria', label: 'Ajuste de auditoria' }]

// Motivos de saída que podem tirar saldo de lote vencido.
export const MOTIVOS_LOTE_VENCIDO = ['avariado', 'vencido']

const todos = [...MOTIVOS_ENTRADA, ...MOTIVOS_SAIDA, ...MOTIVOS_SISTEMA]
export function motivoLabel(v) {
  return todos.find((m) => m.value === v)?.label ?? v ?? '—'
}
