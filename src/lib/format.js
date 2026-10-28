// "há 2h", "ontem", "há 3d" — tempo relativo curto em pt-BR.
export function tempoRelativo(d) {
  if (!d) return '—'
  const diff = (Date.now() - new Date(d).getTime()) / 1000
  if (diff < 60) return 'agora'
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`
  const dias = Math.floor(diff / 86400)
  if (dias === 1) return 'ontem'
  if (dias < 7) return `há ${dias}d`
  return new Date(d).toLocaleDateString('pt-BR')
}

// Datas 'YYYY-MM-DD' (validade) viram Date no fuso LOCAL.
// new Date('2026-10-30') é meia-noite UTC = 29/10 21h em Brasília (1 dia a menos).
export function parseDataLocal(v) {
  if (!v) return null
  const [y, m, d] = v.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function fmtDataLocal(v) {
  return v ? parseDataLocal(v).toLocaleDateString('pt-BR') : '—'
}

// Dias até a data (negativo = já passou). null se não houver data.
export function diasAte(v) {
  if (!v) return null
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return Math.round((parseDataLocal(v) - hoje) / 86400000)
}

// Mensagem de erro para toast. Falha de rede vira texto legível em vez de
// "TypeError: Failed to fetch" (Chrome) / "Load failed" (Safari) / "NetworkError" (Firefox).
export function mensagemErro(err) {
  const msg = err?.message ?? String(err ?? '')
  if (/failed to fetch|load failed|networkerror|network request failed/i.test(msg)) {
    return 'Falha de conexão com o servidor. Verifique a internet e tente de novo.'
  }
  return msg
}

// Date -> 'YYYY-MM-DD' no fuso local (toISOString() voltaria UTC e erraria o dia).
export function dataISOLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
