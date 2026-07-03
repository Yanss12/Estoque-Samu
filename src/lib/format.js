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
