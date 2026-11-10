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

export const VALIDADE_PROVISORIA_ISO = '2099-12-31'

export function ehValidadeProvisoria(v) {
  if (!v) return false
  return String(v).slice(0, 10) === VALIDADE_PROVISORIA_ISO
}

// Datas 'YYYY-MM-DD' (validade) viram Date no fuso LOCAL.
// new Date('2026-10-30') é meia-noite UTC = 29/10 21h em Brasília (1 dia a menos).
export function parseDataLocal(v) {
  if (!v) return null
  const [y, m, d] = String(v).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function fmtDataLocal(v) {
  if (!v) return '—'
  if (ehValidadeProvisoria(v)) return 'provisória'
  return parseDataLocal(v).toLocaleDateString('pt-BR')
}

// Dias até a data (negativo = já passou). null se não houver data ou se for validade provisória.
export function diasAte(v) {
  if (!v || ehValidadeProvisoria(v)) return null
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return Math.round((parseDataLocal(v) - hoje) / 86400000)
}

// Mensagem de erro para toast. Falha de rede vira texto legível em vez de
// "TypeError: Failed to fetch" (Chrome) / "Load failed" (Safari) / "NetworkError" (Firefox).
export function mensagemErro(err) {
  const msg = err?.message ?? String(err ?? '')
  const det = err?.details ?? err?.detail ?? ''
  if (/failed to fetch|load failed|networkerror|network request failed/i.test(msg)) {
    return 'Falha de conexão com o servidor. Verifique a internet e tente de novo.'
  }
  if (/validade provis[oó]ria|ALMOX_VALIDADE_PROVISORIA/i.test(`${msg} ${det}`)) {
    return 'Validade provisória: informe a validade real do lote.'
  }
  return msg
}

// Date -> 'YYYY-MM-DD' no fuso local (toISOString() voltaria UTC e erraria o dia).
export function dataISOLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function ehDataCalendarioValida(dia, mes, ano) {
  if (!Number.isInteger(dia) || !Number.isInteger(mes) || !Number.isInteger(ano)) return false
  if (ano < 1900 || ano > 2100 || mes < 1 || mes > 12 || dia < 1 || dia > 31) return false
  const dt = new Date(ano, mes - 1, dia)
  return dt.getFullYear() === ano && dt.getMonth() === mes - 1 && dt.getDate() === dia
}

function normalizarDiaMesUmDigito(texto) {
  return String(texto ?? '')
    .replace(/(^|\s-\s)(\d)\//g, '$10$2/')
    .replace(/(^|\s-\s)(\d{2}\/)(\d)\//g, '$1$20$3/')
}

function formatarBlocoData(d, barraFinal = false) {
  if (!d) return ''
  if (d.length <= 2) return d.length === 2 && barraFinal ? `${d}/` : d
  if (d.length <= 4) {
    const base = `${d.slice(0, 2)}/${d.slice(2)}`
    return d.length === 4 && barraFinal ? `${base}/` : base
  }
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4, 8)}`
}

export function formatarTextoDatePicker(raw, modo = 'single', isDelete = false) {
  const texto = String(raw ?? '')
  if (!texto) return ''

  if (modo === 'month') {
    const norm = texto.replace(/^(\d)\//, '0$1/')
    const d = norm.replace(/\D/g, '').slice(0, 6)
    if (!d) return ''
    if (d.length <= 2) return d.length === 2 && !isDelete && texto.endsWith('/') ? `${d}/` : d
    return `${d.slice(0, 2)}/${d.slice(2, 6)}`
  }

  const norm = normalizarDiaMesUmDigito(texto)
  if (modo === 'range') {
    const d = norm.replace(/\D/g, '').slice(0, 16)
    if (!d) return ''
    if (d.length <= 8) {
      const p1 = formatarBlocoData(d, !isDelete && texto.endsWith('/'))
      if (d.length === 8 && !isDelete && /[\s\-aA]$/.test(texto)) return `${p1} - `
      return p1
    }
    const p1 = formatarBlocoData(d.slice(0, 8), false)
    const p2 = formatarBlocoData(d.slice(8, 16), !isDelete && texto.endsWith('/'))
    return `${p1} - ${p2}`
  }

  const d = norm.replace(/\D/g, '').slice(0, 8)
  return formatarBlocoData(d, !isDelete && texto.endsWith('/'))
}

function detectarModoDatePicker(input) {
  const root = input.closest('.p-datepicker')
  if (root?.dataset?.dateMode) return root.dataset.dateMode
  if (input.id === 'mes-export' || input.placeholder === 'mm/aaaa') return 'month'
  const label = `${input.getAttribute('aria-label') ?? ''} ${input.placeholder ?? ''}`.toLowerCase()
  if (label.includes('período') || label.includes('periodo') || label.includes('qualquer data')) {
    return 'range'
  }
  return 'single'
}

function posicionarCursorPorDigitos(valorFormatado, qtdDigitos, manterBarraAposDigito = false) {
  if (qtdDigitos <= 0) return 0
  let cont = 0
  for (let i = 0; i < valorFormatado.length; i++) {
    if (/\d/.test(valorFormatado[i])) {
      cont++
      if (cont === qtdDigitos) {
        let pos = i + 1
        if (manterBarraAposDigito && valorFormatado[pos] === '/') pos++
        return pos
      }
    }
  }
  return valorFormatado.length
}

function validarValorDatePicker(valor, modo) {
  const d = String(valor ?? '').replace(/\D/g, '')
  if (!d.length) return { completo: false, valido: true }

  if (modo === 'month') {
    if (d.length < 6) return { completo: false, valido: false }
    const mes = Number(d.slice(0, 2))
    const ano = Number(d.slice(2, 6))
    return { completo: true, valido: mes >= 1 && mes <= 12 && ano >= 1900 && ano <= 2100 }
  }

  if (modo === 'range') {
    if (d.length < 16) {
      if (d.length >= 8) {
        const d1 = Number(d.slice(0, 2))
        const m1 = Number(d.slice(2, 4))
        const a1 = Number(d.slice(4, 8))
        if (!ehDataCalendarioValida(d1, m1, a1)) return { completo: true, valido: false }
      }
      return { completo: false, valido: false }
    }
    const d1 = Number(d.slice(0, 2))
    const m1 = Number(d.slice(2, 4))
    const a1 = Number(d.slice(4, 8))
    const d2 = Number(d.slice(8, 10))
    const m2 = Number(d.slice(10, 12))
    const a2 = Number(d.slice(12, 16))
    if (!ehDataCalendarioValida(d1, m1, a1) || !ehDataCalendarioValida(d2, m2, a2)) {
      return { completo: true, valido: false }
    }
    const ini = new Date(a1, m1 - 1, d1).getTime()
    const fim = new Date(a2, m2 - 1, d2).getTime()
    return { completo: true, valido: fim >= ini }
  }

  if (d.length < 8) return { completo: false, valido: false }
  const dia = Number(d.slice(0, 2))
  const mes = Number(d.slice(2, 4))
  const ano = Number(d.slice(4, 8))
  return { completo: true, valido: ehDataCalendarioValida(dia, mes, ano) }
}

let mascaraInstalada = false

export function instalarMascaraDatePicker() {
  if (mascaraInstalada || typeof document === 'undefined') return
  mascaraInstalada = true

  let ultimoInputDigitado = null
  let ultimoInputTs = 0
  let ultimoCursor = null
  let restaurarVisualPendente = null

  document.addEventListener(
    'mousedown',
    () => {
      ultimoInputTs = 0
    },
    true
  )

  document.addEventListener(
    'focusin',
    (event) => {
      const el = event.target
      if (!(el instanceof HTMLElement)) return
      if (el.classList.contains('p-datepicker-input')) {
        el.setAttribute('inputmode', 'numeric')
        return
      }
      if (
        ultimoInputDigitado &&
        Date.now() - ultimoInputTs < 200 &&
        el.closest('.p-datepicker-panel')
      ) {
        const inp = ultimoInputDigitado
        const cur = ultimoCursor
        inp.focus()
        if (typeof cur === 'number') {
          try {
            inp.setSelectionRange(cur, cur)
          } catch {
            // Ignora se o input não suportar seleção
          }
        }
      }
    },
    true
  )

  document.addEventListener(
    'keydown',
    (event) => {
      const input = event.target
      if (!(input instanceof HTMLInputElement) || !input.classList.contains('p-datepicker-input')) {
        return
      }
      if (event.key === 'ArrowDown' || event.key === 'Tab' || event.key === 'Escape') {
        ultimoInputTs = 0
      }
      if (event.key === 'Enter') {
        ultimoInputTs = 0
        const modo = detectarModoDatePicker(input)
        if (modo === 'range') {
          const d = input.value.replace(/\D/g, '')
          if (d.length === 8) {
            const dia = Number(d.slice(0, 2))
            const mes = Number(d.slice(2, 4))
            const ano = Number(d.slice(4, 8))
            if (ehDataCalendarioValida(dia, mes, ano)) {
              const dtFmt = formatarBlocoData(d, false)
              input.value = `${dtFmt} - ${dtFmt}`
              input.dispatchEvent(new Event('input', { bubbles: true }))
            }
          }
        }
      }
    },
    true
  )

  document.addEventListener(
    'input',
    (event) => {
      const input = event.target
      if (!(input instanceof HTMLInputElement) || !input.classList.contains('p-datepicker-input')) {
        return
      }

      const modo = detectarModoDatePicker(input)
      const isDelete = Boolean(event.inputType && event.inputType.startsWith('delete'))
      const raw = input.value
      const selStart = input.selectionStart ?? raw.length
      const eraNoFim = selStart >= raw.length
      const digitosAntes = normalizarDiaMesUmDigito(raw.slice(0, selStart)).replace(/\D/g, '').length

      const novoValor = formatarTextoDatePicker(raw, modo, isDelete)
      const novoCursor = eraNoFim
        ? novoValor.length
        : posicionarCursorPorDigitos(novoValor, digitosAntes, !isDelete && raw.slice(0, selStart).endsWith('/'))

      if (input.value !== novoValor) {
        input.value = novoValor
      }
      try {
        input.setSelectionRange(novoCursor, novoCursor)
      } catch {
        // Ignora se não aplicável
      }

      ultimoInputDigitado = input
      ultimoInputTs = Date.now()
      ultimoCursor = novoCursor

      const status = validarValorDatePicker(novoValor, modo)
      if (!novoValor) {
        input.setCustomValidity('')
        input.removeAttribute('aria-invalid')
      } else if (status.completo && !status.valido) {
        input.setCustomValidity('Data inválida. Informe uma data existente no formato dd/mm/aaaa.')
        input.setAttribute('aria-invalid', 'true')
        if (modo === 'single') {
          restaurarVisualPendente = { input, valor: novoValor, cursor: novoCursor }
          input.value = ''
        }
      } else {
        input.setCustomValidity('')
        input.removeAttribute('aria-invalid')
      }
    },
    true
  )

  document.addEventListener(
    'input',
    () => {
      if (!restaurarVisualPendente) return
      const { input, valor, cursor } = restaurarVisualPendente
      restaurarVisualPendente = null
      input.value = valor
      try {
        input.setSelectionRange(cursor, cursor)
      } catch {
        // Ignora
      }
      queueMicrotask(() => {
        if (document.activeElement === input && input.value === valor) {
          try {
            input.setSelectionRange(cursor, cursor)
          } catch {
            // Ignora
          }
        }
      })
    },
    false
  )
}
