// Conexão instável (rede móvel, Wi-Fi fraco) faz a requisição morrer antes de
// chegar ao servidor ("Failed to fetch"). Leituras são repetidas sozinhas;
// gravações NUNCA (repetir um POST poderia duplicar uma movimentação).
const LEITURA = new Set(['GET', 'HEAD', 'OPTIONS'])
const ESPERAS_MS = [600, 1500]

export async function fetchComRetentativa(input, init) {
  const metodo = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase()
  for (let tentativa = 0; ; tentativa++) {
    try {
      return await fetch(input, init)
    } catch (err) {
      const abortado = err?.name === 'AbortError' || init?.signal?.aborted
      if (abortado || !LEITURA.has(metodo) || tentativa >= ESPERAS_MS.length) throw err
      await new Promise((r) => setTimeout(r, ESPERAS_MS[tentativa]))
    }
  }
}
