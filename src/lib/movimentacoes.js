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
]

const todos = [...MOTIVOS_ENTRADA, ...MOTIVOS_SAIDA]
export function motivoLabel(v) {
  return todos.find((m) => m.value === v)?.label ?? v ?? '—'
}
