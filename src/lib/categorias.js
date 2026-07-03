// Mapeia o enum categoria_produto do banco para rótulo + cor do Tag.
export const CATEGORIAS = [
  { value: 'psicotropico', label: 'Controlado', severity: 'danger' },
  { value: 'medicamento', label: 'Medicamento', severity: 'info' },
  { value: 'material', label: 'Material', severity: 'secondary' },
  { value: 'sonda', label: 'Sonda', severity: 'contrast' },
  { value: 'permanente', label: 'Permanente', severity: 'success' },
]

export const catMap = Object.fromEntries(CATEGORIAS.map((c) => [c.value, c]))

export function catLabel(v) {
  return catMap[v]?.label ?? v
}

export function catSeverity(v) {
  return catMap[v]?.severity
}
