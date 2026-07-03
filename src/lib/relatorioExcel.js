import { supabase } from './supabase'

// Gera o relatório mensal em .xlsx no MESMO formato da planilha base
// (uma aba por categoria: estoque inicial, entradas, validade, consumo diário
// PSM/SAMU por dia do mês, totais e estoque final).

const CATS = [
  { key: 'psicotropico', sheet: 'PSICOTRÓPICOS', lote: true },
  { key: 'medicamento', sheet: 'MEDICAMENTOS', lote: false },
  { key: 'material', sheet: 'MATERIAL', lote: false },
  { key: 'sonda', sheet: 'SONDAS', lote: false },
  { key: 'permanente', sheet: 'PERMANENTES', lote: false },
]

function fmtVal(v) {
  if (!v) return ''
  const [y, m, d] = v.split('-')
  return `${d}/${m}/${y}`
}

export async function exportarRelatorioMensal(ano, mes) {
  const { data, error } = await supabase.rpc('relatorio_mensal', { p_ano: ano, p_mes: mes })
  if (error) throw error

  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const diasNoMes = new Date(ano, mes, 0).getDate()

  for (const cat of CATS) {
    const linhas = (data || []).filter((r) => r.categoria === cat.key)
    if (!linhas.length) continue

    const r1 = []
    const r2 = []
    const estatica = (label) => {
      r1.push(label)
      r2.push('')
    }
    estatica('Item')
    estatica('U.M')
    if (cat.lote) estatica('LOTE')
    estatica('ESTOQUE INICIAL')
    estatica('ENTRADAS')
    estatica('VALIDADE')
    const diaStart = r1.length
    for (let d = 1; d <= diasNoMes; d++) {
      r1.push(String(d), '')
      r2.push('PSM', 'SAMU')
    }
    const totStart = r1.length
    estatica('CONSUMO PSM')
    estatica('CONSUMO SAMU')
    estatica('CONSUMO MÊS')
    estatica('AVARIADO')
    estatica('EMPRÉSTIMO')
    estatica('DOAÇÃO')
    estatica('ESTOQUE FINAL')

    const aoa = [r1, r2]
    for (const r of linhas) {
      const row = [r.nome, r.unidade]
      if (cat.lote) row.push(r.lote || '')
      row.push(r.estoque_inicial, r.entradas, fmtVal(r.validade))
      const dias = r.dias || {}
      for (let d = 1; d <= diasNoMes; d++) {
        const dd = dias[String(d)]
        row.push(dd?.PSM || '', dd?.SAMU || '')
      }
      row.push(
        r.consumo_psm,
        r.consumo_samu,
        r.consumo_psm + r.consumo_samu,
        r.avariado,
        r.emprestimo,
        r.doacao,
        r.estoque_final
      )
      aoa.push(row)
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa)

    // Mescla: cabeçalhos estáticos ocupam as 2 linhas; nº do dia ocupa 2 colunas.
    const merges = []
    for (let c = 0; c < diaStart; c++) merges.push({ s: { r: 0, c }, e: { r: 1, c } })
    for (let d = 0; d < diasNoMes; d++) {
      const c = diaStart + d * 2
      merges.push({ s: { r: 0, c }, e: { r: 0, c: c + 1 } })
    }
    for (let c = totStart; c < r1.length; c++) merges.push({ s: { r: 0, c }, e: { r: 1, c } })
    ws['!merges'] = merges

    ws['!cols'] = [
      { wch: 34 },
      { wch: 10 },
      ...(cat.lote ? [{ wch: 12 }] : []),
      { wch: 9 },
      { wch: 9 },
      { wch: 11 },
      ...Array(diasNoMes * 2).fill({ wch: 5 }),
      { wch: 11 },
      { wch: 12 },
      { wch: 11 },
      { wch: 9 },
      { wch: 11 },
      { wch: 9 },
      { wch: 12 },
    ]
    ws['!freeze'] = { xSplit: 1, ySplit: 2 }

    XLSX.utils.book_append_sheet(wb, ws, cat.sheet)
  }

  if (!wb.SheetNames.length) {
    throw new Error('Sem dados para o mês selecionado.')
  }

  XLSX.writeFile(wb, `Estoque_${ano}_${String(mes).padStart(2, '0')}.xlsx`)
}
