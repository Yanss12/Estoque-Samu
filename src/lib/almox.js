import { supabase } from './supabase'
import { diasAte, dataISOLocal, mensagemErro } from './format'

// Flag de mock: ligado SOMENTE em desenvolvimento e desligado por padrão em produção.
export const ALMOX_MOCK =
  Boolean(import.meta.env.DEV) &&
  (typeof localStorage === 'undefined' || localStorage.getItem('samu.almox.mock') !== '0')

export const ALMOX_MOTIVOS_ENTRADA = [
  { value: 'recebimento', label: 'Recebimento' },
  { value: 'doacao', label: 'Doação recebida' },
  { value: 'saldo_inicial', label: 'Saldo inicial' },
  { value: 'outros', label: 'Outros (justificar)' },
]

export const ALMOX_MOTIVOS_SAIDA = [
  { value: 'outra_unidade', label: 'Outra unidade' },
  { value: 'perda_avaria', label: 'Perda / avaria' },
  { value: 'vencido', label: 'Vencido (descarte)' },
  { value: 'outros', label: 'Outros (justificar)' },
]

export const ALMOX_MOTIVOS_SISTEMA = [
  { value: 'transferencia_farmacia', label: 'Transferência p/ Farmácia' },
  { value: 'reajuste', label: 'Reajuste de estoque' },
]

export const ALMOX_MOTIVOS_LOTE_VENCIDO = ['vencido', 'perda_avaria']

export const ALMOX_GRUPOS_ITEM = [
  { value: 'medicamento', label: 'Medicamentos' },
  { value: 'material', label: 'Materiais' },
]

export const ALMOX_SITUACOES = [
  { value: 'ok', label: 'Regular' },
  { value: 'critico', label: 'Crítico' },
  { value: 'zerado', label: 'Zerado' },
]

const TODOS_MOTIVOS_ALMOX = [
  ...ALMOX_MOTIVOS_ENTRADA,
  ...ALMOX_MOTIVOS_SAIDA,
  ...ALMOX_MOTIVOS_SISTEMA,
]

export function almoxMotivoLabel(v) {
  return TODOS_MOTIVOS_ALMOX.find((m) => m.value === v)?.label ?? v ?? '—'
}

export function grupoPorCategoria(categoria) {
  return ['psicotropico', 'medicamento'].includes(categoria) ? 'medicamento' : 'material'
}

// Extrai o código de máquina do contrato (Seção 9: error.details = 'ALMOX_*' ou 'MOV_*')
export function codigoErroAlmox(err) {
  const d = err?.details || err?.detail || ''
  if (typeof d === 'string' && /^(ALMOX_|MOV_)/.test(d.trim())) return d.trim()
  return null
}

export function mensagemErroAlmox(err) {
  const cod = codigoErroAlmox(err)
  if (cod === 'ALMOX_SEM_ACESSO') return 'Você não tem acesso ao Almoxarifado.'
  if (cod === 'ALMOX_SEM_PERMISSAO') return 'Seu acesso ao Almoxarifado é somente consulta.'
  if (cod === 'ALMOX_TRANSFERENCIA_JA_CONSUMIDA') {
    const base = err?.message || 'Não foi possível estornar a transferência.'
    return `${base} Os itens já foram usados na Farmácia; o estorno de transferência consumida é bloqueado.`
  }
  return mensagemErro(err)
}

// Adaptador para ListaMovimentacoes (Seção 8.3)
export function adaptarMov(row) {
  if (!row) return null
  const controlado = row.controlado ?? row.categoria === 'psicotropico'
  const extraPartes = []
  if (row.motivo === 'reajuste' && row.quantidade_anterior != null && row.quantidade_ajustada != null) {
    extraPartes.push(`Saldo: ${row.quantidade_anterior} → ${row.quantidade_ajustada} (encontrado: ${row.quantidade_encontrada})`)
  }
  if (row.documento) extraPartes.push(`Doc: ${row.documento}`)
  if (row.origem && row.tipo === 'entrada') extraPartes.push(`Origem: ${row.origem}`)
  if (row.destino && row.tipo === 'saida') extraPartes.push(`Destino: ${row.destino}`)
  if (row.justificativa) extraPartes.push(`Justificativa: ${row.justificativa}`)
  if (row.observacao && row.observacao !== row.justificativa) extraPartes.push(row.observacao)

  return {
    ...row,
    id: row.id,
    tipo: row.tipo,
    motivo: row.motivo,
    quantidade: row.quantidade,
    data: row.data,
    usuario_id: row.usuario_id,
    estorno_de: row.estorno_de,
    nao_estornavel: row.motivo === 'reajuste' || Boolean(row.transferencia_item_id),
    observacao: extraPartes.join(' · ') || null,
    produto: {
      nome: row.produto?.nome ?? row.produto ?? '—',
      controlado: Boolean(controlado),
      categoria: row.categoria ?? row.produto?.categoria,
    },
    lote: row.numero_lote
      ? {
          numero_lote: row.numero_lote,
          validade: row.validade,
        }
      : null,
    setor: null,
  }
}

// Resolve o nível de acesso ao Almoxarifado:
// - Em produção (ALMOX_MOCK = false): consulta a RPC `almox_nivel` no Supabase; falha/ausência => 'nenhum'.
// - Em dev com ALMOX_MOCK = true: resolve pelo mock sem disparar 404 no console enquanto o backend não existe.
export async function obterAlmoxNivel(userObj, perfilObj) {
  if (!userObj) return 'nenhum'
  if (ALMOX_MOCK) {
    return resolverNivelMock(userObj, perfilObj)
  }
  try {
    const { data: nivel, error } = await supabase.rpc('almox_nivel')
    if (!error && ['nenhum', 'consulta', 'total'].includes(nivel)) {
      return nivel
    }
  } catch {
    // Função ausente ou erro de rede resulta em 'nenhum' (nunca quebra o login)
  }
  return 'nenhum'
}

export function resolverNivelMock(userObj, perfilObj) {
  if (!ALMOX_MOCK) return 'nenhum'
  try {
    const forcar = localStorage.getItem('samu.almox.mock_nivel')
    if (forcar && ['nenhum', 'consulta', 'total'].includes(forcar)) {
      return forcar
    }
  } catch {
    // Ignora erro de localStorage
  }
  if (!userObj || !perfilObj) return 'nenhum'
  const papel = perfilObj.papel
  if (!['farmaceutico', 'admin'].includes(papel)) return 'nenhum'
  const email = (userObj.email || '').toLowerCase()
  if (email === 'simonessaguiar@gmail.com' || papel === 'farmaceutico') return 'consulta'
  if (email === 'admin@gmail.com' || papel === 'admin') return 'total'
  return 'nenhum'
}

function criarErroContrato(message, detail, code = '23514') {
  const err = new Error(message)
  err.code = code
  err.details = detail
  err.detail = detail
  return err
}

function objetoAusenteNoBanco(error) {
  if (!error) return false
  const code = String(error.code || '')
  const msg = String(error.message || '')
  return (
    ['PGRST202', 'PGRST205', '42P01', '42883'].includes(code) ||
    /could not find the (function|table|relation)|does not exist|schema cache/i.test(msg)
  )
}

// ============================================================================
// Estado Mock em Memória (usado apenas quando ALMOX_MOCK = true e banco sem objetos)
// Formato 100% fiel às seções 4 e 5 do contrato MODULO_ALMOXARIFADO.md
// ============================================================================
const hojeISO = dataISOLocal(new Date())
const dMais = (dias) => {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return dataISOLocal(d)
}
const tsMenosHoras = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString()

const mockState = {
  catalogoGeral: [
    { id: 101, nome: 'Dipirona Sódica 500mg/mL 2mL', categoria: 'medicamento', unidade_medida: 'Ampola', controlado: false, ativo: true },
    { id: 102, nome: 'Soro Fisiológico 0,9% 500mL', categoria: 'medicamento', unidade_medida: 'Frasco', controlado: false, ativo: true },
    { id: 103, nome: 'Luva de Procedimento Tam. M', categoria: 'material', unidade_medida: 'Caixa c/ 100', controlado: false, ativo: true },
    { id: 104, nome: 'Fentanila 0,05mg/mL 10mL', categoria: 'psicotropico', unidade_medida: 'Ampola', controlado: true, ativo: true },
    { id: 105, nome: 'Sonda Aspiração Traqueal Nº 12', categoria: 'sonda', unidade_medida: 'Unidade', controlado: false, ativo: true },
    { id: 106, nome: 'Prancha Rígida Adulto Polietileno', categoria: 'permanente', unidade_medida: 'Unidade', controlado: false, ativo: true },
    { id: 107, nome: 'Gaze Estéril 7,5x7,5cm', categoria: 'material', unidade_medida: 'Pacote', controlado: false, ativo: true },
    { id: 108, nome: 'Ondansetrona 4mg/2mL', categoria: 'medicamento', unidade_medida: 'Ampola', controlado: false, ativo: true },
  ],
  almoxProdutos: [
    { id: 1, produto_id: 101, codigo_interno: 'ALM-MED-001', estoque_minimo: 200, localizacao: 'Corredor A · Prat. 1', observacao: 'Alto giro urgência', ativo: true },
    { id: 2, produto_id: 102, codigo_interno: 'ALM-MED-002', estoque_minimo: 300, localizacao: 'Pallet B1', observacao: null, ativo: true },
    { id: 3, produto_id: 103, codigo_interno: 'ALM-MAT-010', estoque_minimo: 80, localizacao: 'Corredor C · Prat. 2', observacao: null, ativo: true },
    { id: 4, produto_id: 104, codigo_interno: 'ALM-PSI-001', estoque_minimo: 40, localizacao: 'Armário Chaveado 1', observacao: 'Portaria 344/98', ativo: true },
    { id: 5, produto_id: 105, codigo_interno: 'ALM-SON-004', estoque_minimo: 100, localizacao: 'Corredor C · Prat. 4', observacao: null, ativo: true },
    { id: 6, produto_id: 106, codigo_interno: 'ALM-PER-002', estoque_minimo: 5, localizacao: 'Área Externa · Suporte 2', observacao: 'Item permanente isento de lote', ativo: true },
    { id: 7, produto_id: 107, codigo_interno: 'ALM-MAT-015', estoque_minimo: 150, localizacao: 'Corredor C · Prat. 1', observacao: null, ativo: true },
  ],
  almoxLotes: [
    { id: 1, produto_id: 101, numero_lote: 'DIP-2409', validade: dMais(210) },
    { id: 2, produto_id: 101, numero_lote: 'DIP-2401', validade: dMais(25) },
    { id: 3, produto_id: 102, numero_lote: 'SF-8821', validade: dMais(320) },
    { id: 4, produto_id: 103, numero_lote: 'LUV-1102', validade: dMais(45) },
    { id: 5, produto_id: 103, numero_lote: 'LUV-0900', validade: dMais(-12) },
    { id: 6, produto_id: 104, numero_lote: 'FEN-3301', validade: dMais(150) },
    { id: 7, produto_id: 105, numero_lote: 'SON-7710', validade: dMais(180) },
  ],
  almoxMovimentacoes: [
    {
      id: 1,
      operacao_id: '11111111-1111-4111-8111-111111111101',
      produto_id: 101,
      lote_id: 1,
      tipo: 'entrada',
      motivo: 'recebimento',
      quantidade: 500,
      origem: 'Central de Abastecimento Farmacêutico (CAF)',
      destino: null,
      documento: 'NF 45910',
      data_documento: dMais(-20),
      justificativa: null,
      observacao: 'Recebimento mensal regular',
      estorno_de: null,
      transferencia_item_id: null,
      inventario_item_id: null,
      quantidade_anterior: null,
      quantidade_encontrada: null,
      quantidade_ajustada: null,
      diferenca: null,
      usuario_id: '00000000-0000-0000-0000-000000000001',
      usuario_nome: 'Elaine (RT Principal)',
      data: tsMenosHoras(480),
    },
    {
      id: 2,
      operacao_id: '11111111-1111-4111-8111-111111111102',
      produto_id: 101,
      lote_id: 2,
      tipo: 'entrada',
      motivo: 'saldo_inicial',
      quantidade: 80,
      origem: 'Implantação do Módulo Almoxarifado',
      destino: null,
      documento: 'INV-001',
      data_documento: dMais(-25),
      justificativa: null,
      observacao: null,
      estorno_de: null,
      transferencia_item_id: null,
      inventario_item_id: null,
      quantidade_anterior: null,
      quantidade_encontrada: null,
      quantidade_ajustada: null,
      diferenca: null,
      usuario_id: '00000000-0000-0000-0000-000000000001',
      usuario_nome: 'Elaine (RT Principal)',
      data: tsMenosHoras(520),
    },
    {
      id: 3,
      operacao_id: '11111111-1111-4111-8111-111111111103',
      produto_id: 102,
      lote_id: 3,
      tipo: 'entrada',
      motivo: 'recebimento',
      quantidade: 240,
      origem: 'Fornecedor Hospitalar Sul',
      destino: null,
      documento: 'NF 88211',
      data_documento: dMais(-15),
      justificativa: null,
      observacao: null,
      estorno_de: null,
      transferencia_item_id: null,
      inventario_item_id: null,
      quantidade_anterior: null,
      quantidade_encontrada: null,
      quantidade_ajustada: null,
      diferenca: null,
      usuario_id: '00000000-0000-0000-0000-000000000001',
      usuario_nome: 'Elaine (RT Principal)',
      data: tsMenosHoras(360),
    },
    {
      id: 4,
      operacao_id: '11111111-1111-4111-8111-111111111104',
      produto_id: 103,
      lote_id: 4,
      tipo: 'entrada',
      motivo: 'recebimento',
      quantidade: 60,
      origem: 'Secretaria Municipal de Saúde',
      destino: null,
      documento: 'Guia 310/2026',
      data_documento: dMais(-14),
      justificativa: null,
      observacao: null,
      estorno_de: null,
      transferencia_item_id: null,
      inventario_item_id: null,
      quantidade_anterior: null,
      quantidade_encontrada: null,
      quantidade_ajustada: null,
      diferenca: null,
      usuario_id: '00000000-0000-0000-0000-000000000001',
      usuario_nome: 'Elaine (RT Principal)',
      data: tsMenosHoras(330),
    },
    {
      id: 5,
      operacao_id: '11111111-1111-4111-8111-111111111105',
      produto_id: 103,
      lote_id: 5,
      tipo: 'entrada',
      motivo: 'saldo_inicial',
      quantidade: 20,
      origem: 'Implantação do Módulo Almoxarifado',
      destino: null,
      documento: 'INV-001',
      data_documento: dMais(-25),
      justificativa: null,
      observacao: 'Lote separado para descarte',
      estorno_de: null,
      transferencia_item_id: null,
      inventario_item_id: null,
      quantidade_anterior: null,
      quantidade_encontrada: null,
      quantidade_ajustada: null,
      diferenca: null,
      usuario_id: '00000000-0000-0000-0000-000000000001',
      usuario_nome: 'Elaine (RT Principal)',
      data: tsMenosHoras(500),
    },
    {
      id: 6,
      operacao_id: '11111111-1111-4111-8111-111111111106',
      produto_id: 104,
      lote_id: 6,
      tipo: 'entrada',
      motivo: 'recebimento',
      quantidade: 50,
      origem: 'CAF · Controle Especial',
      destino: null,
      documento: 'NF 19002',
      data_documento: dMais(-10),
      justificativa: null,
      observacao: null,
      estorno_de: null,
      transferencia_item_id: null,
      inventario_item_id: null,
      quantidade_anterior: null,
      quantidade_encontrada: null,
      quantidade_ajustada: null,
      diferenca: null,
      usuario_id: '00000000-0000-0000-0000-000000000001',
      usuario_nome: 'Elaine (RT Principal)',
      data: tsMenosHoras(240),
    },
    {
      id: 7,
      operacao_id: '11111111-1111-4111-8111-111111111107',
      produto_id: 105,
      lote_id: 7,
      tipo: 'entrada',
      motivo: 'doacao',
      quantidade: 180,
      origem: 'Hospital Regional',
      destino: null,
      documento: 'Termo Doação 14/2026',
      data_documento: dMais(-8),
      justificativa: null,
      observacao: null,
      estorno_de: null,
      transferencia_item_id: null,
      inventario_item_id: null,
      quantidade_anterior: null,
      quantidade_encontrada: null,
      quantidade_ajustada: null,
      diferenca: null,
      usuario_id: '00000000-0000-0000-0000-000000000001',
      usuario_nome: 'Elaine (RT Principal)',
      data: tsMenosHoras(190),
    },
    {
      id: 8,
      operacao_id: '11111111-1111-4111-8111-111111111108',
      produto_id: 106,
      lote_id: null,
      tipo: 'entrada',
      motivo: 'saldo_inicial',
      quantidade: 8,
      origem: 'Patrimônio Saúde',
      destino: null,
      documento: 'PAT-2026',
      data_documento: dMais(-20),
      justificativa: null,
      observacao: null,
      estorno_de: null,
      transferencia_item_id: null,
      inventario_item_id: null,
      quantidade_anterior: null,
      quantidade_encontrada: null,
      quantidade_ajustada: null,
      diferenca: null,
      usuario_id: '00000000-0000-0000-0000-000000000001',
      usuario_nome: 'Elaine (RT Principal)',
      data: tsMenosHoras(460),
    },
    {
      id: 9,
      operacao_id: '11111111-1111-4111-8111-111111111109',
      produto_id: 101,
      lote_id: 1,
      tipo: 'saida',
      motivo: 'transferencia_farmacia',
      quantidade: 120,
      origem: null,
      destino: 'Farmácia COMUE',
      documento: 'Req. 01/2026',
      data_documento: null,
      justificativa: null,
      observacao: 'Abastecimento semanal da Farmácia',
      estorno_de: null,
      transferencia_item_id: 1,
      inventario_item_id: null,
      quantidade_anterior: null,
      quantidade_encontrada: null,
      quantidade_ajustada: null,
      diferenca: null,
      usuario_id: '00000000-0000-0000-0000-000000000001',
      usuario_nome: 'Elaine (RT Principal)',
      data: tsMenosHoras(72),
    },
    {
      id: 10,
      operacao_id: '11111111-1111-4111-8111-111111111109',
      produto_id: 102,
      lote_id: 3,
      tipo: 'saida',
      motivo: 'transferencia_farmacia',
      quantidade: 60,
      origem: null,
      destino: 'Farmácia COMUE',
      documento: 'Req. 01/2026',
      data_documento: null,
      justificativa: null,
      observacao: 'Abastecimento semanal da Farmácia',
      estorno_de: null,
      transferencia_item_id: 2,
      inventario_item_id: null,
      quantidade_anterior: null,
      quantidade_encontrada: null,
      quantidade_ajustada: null,
      diferenca: null,
      usuario_id: '00000000-0000-0000-0000-000000000001',
      usuario_nome: 'Elaine (RT Principal)',
      data: tsMenosHoras(72),
    },
    {
      id: 11,
      operacao_id: '11111111-1111-4111-8111-111111111110',
      produto_id: 105,
      lote_id: 7,
      tipo: 'saida',
      motivo: 'outra_unidade',
      quantidade: 30,
      origem: null,
      destino: 'UBS Parque Imperial',
      documento: 'Ofício 44/2026',
      data_documento: null,
      justificativa: 'Apoio emergencial à unidade básica',
      observacao: null,
      estorno_de: null,
      transferencia_item_id: null,
      inventario_item_id: null,
      quantidade_anterior: null,
      quantidade_encontrada: null,
      quantidade_ajustada: null,
      diferenca: null,
      usuario_id: '00000000-0000-0000-0000-000000000001',
      usuario_nome: 'Elaine (RT Principal)',
      data: tsMenosHoras(24),
    },
    {
      id: 12,
      operacao_id: '11111111-1111-4111-8111-111111111111',
      produto_id: 102,
      lote_id: 3,
      tipo: 'saida',
      motivo: 'perda_avaria',
      quantidade: 4,
      origem: null,
      destino: null,
      documento: 'Auto Avaria 03/2026',
      data_documento: null,
      justificativa: 'Frascos danificados no transporte interno',
      observacao: null,
      estorno_de: null,
      transferencia_item_id: null,
      inventario_item_id: null,
      quantidade_anterior: null,
      quantidade_encontrada: null,
      quantidade_ajustada: null,
      diferenca: null,
      usuario_id: '00000000-0000-0000-0000-000000000001',
      usuario_nome: 'Elaine (RT Principal)',
      data: tsMenosHoras(18),
    },
    {
      id: 13,
      operacao_id: '11111111-1111-4111-8111-111111111112',
      produto_id: 103,
      lote_id: 5,
      tipo: 'saida',
      motivo: 'vencido',
      quantidade: 5,
      origem: null,
      destino: null,
      documento: 'Termo Descarte 02/2026',
      data_documento: null,
      justificativa: 'Baixa parcial para coleta de resíduos de saúde',
      observacao: null,
      estorno_de: null,
      transferencia_item_id: null,
      inventario_item_id: null,
      quantidade_anterior: null,
      quantidade_encontrada: null,
      quantidade_ajustada: null,
      diferenca: null,
      usuario_id: '00000000-0000-0000-0000-000000000001',
      usuario_nome: 'Elaine (RT Principal)',
      data: tsMenosHoras(12),
    },
  ],
  almoxTransferencias: [
    {
      id: 1,
      documento: 'Req. 01/2026',
      observacao: 'Abastecimento semanal da Farmácia',
      usuario_id: '00000000-0000-0000-0000-000000000001',
      usuario_nome: 'Elaine (RT Principal)',
      data: tsMenosHoras(72),
    },
  ],
  almoxTransferenciaItens: [
    {
      id: 1,
      transferencia_id: 1,
      produto_id: 101,
      almox_lote_id: 1,
      farmacia_lote_id: 501,
      quantidade: 120,
      almox_movimentacao_id: 9,
      farmacia_movimentacao_id: 9001,
    },
    {
      id: 2,
      transferencia_id: 1,
      produto_id: 102,
      almox_lote_id: 3,
      farmacia_lote_id: 502,
      quantidade: 60,
      almox_movimentacao_id: 10,
      farmacia_movimentacao_id: 9002,
    },
  ],
  almoxInventarios: [
    {
      id: 1,
      descricao: 'Inventário de implantação — Outubro/2026',
      status: 'finalizado',
      aberto_em: tsMenosHoras(400),
      aberto_por: '00000000-0000-0000-0000-000000000001',
      aberto_por_nome: 'Elaine (RT Principal)',
      finalizado_em: tsMenosHoras(380),
      finalizado_por_nome: 'Elaine (RT Principal)',
      observacao: 'Conferência inicial concluída sem divergências pendentes.',
    },
  ],
  almoxInventarioItens: [
    {
      item_id: 1,
      inventario_id: 1,
      produto_id: 101,
      lote_id: 1,
      estoque_sistema: 500,
      estoque_contado: 500,
      observacao: null,
      contado_por_nome: 'Elaine (RT Principal)',
      contado_em: tsMenosHoras(390),
      movimentacao_ajuste_id: null,
    },
    {
      item_id: 2,
      inventario_id: 1,
      produto_id: 102,
      lote_id: 3,
      estoque_sistema: 240,
      estoque_contado: 240,
      observacao: null,
      contado_por_nome: 'Elaine (RT Principal)',
      contado_em: tsMenosHoras(388),
      movimentacao_ajuste_id: null,
    },
  ],
}

function getProdInfo(produtoId) {
  return mockState.catalogoGeral.find((p) => p.id === Number(produtoId))
}

function getAlmoxProdInfo(produtoId) {
  return mockState.almoxProdutos.find((p) => p.produto_id === Number(produtoId))
}

function getLoteInfo(loteId) {
  if (!loteId) return null
  return mockState.almoxLotes.find((l) => l.id === Number(loteId)) ?? null
}

function computarViewsMock() {
  const estornadasSet = new Set(
    mockState.almoxMovimentacoes.filter((m) => m.estorno_de != null).map((m) => m.estorno_de)
  )

  // Ordenar movimentações por data ASC, id ASC para janela de saldo_produto_apos
  const movsAsc = [...mockState.almoxMovimentacoes].sort((a, b) => {
    const cmp = new Date(a.data) - new Date(b.data)
    return cmp !== 0 ? cmp : a.id - b.id
  })

  const saldoAcumProduto = new Map()
  const saldoPorLoteMap = new Map() // key: `${produto_id}:${lote_id ?? 0}`

  const movDetalheAsc = movsAsc.map((m) => {
    const p = getProdInfo(m.produto_id) || {}
    const l = getLoteInfo(m.lote_id)
    const assinado = m.tipo === 'entrada' ? m.quantidade : -m.quantidade
    const atualProd = (saldoAcumProduto.get(m.produto_id) || 0) + assinado
    saldoAcumProduto.set(m.produto_id, atualProd)

    const chaveLote = `${m.produto_id}:${m.lote_id ?? 0}`
    saldoPorLoteMap.set(chaveLote, (saldoPorLoteMap.get(chaveLote) || 0) + assinado)

    const estornada = estornadasSet.has(m.id)
    const efetiva = m.estorno_de == null && !estornada
    const dia = dataISOLocal(new Date(m.data))

    return {
      id: m.id,
      operacao_id: m.operacao_id,
      data: m.data,
      dia,
      produto_id: m.produto_id,
      produto: p.nome || '—',
      categoria: p.categoria || 'material',
      grupo_item: grupoPorCategoria(p.categoria),
      unidade_medida: p.unidade_medida || 'Unidade',
      controlado: Boolean(p.controlado),
      lote_id: m.lote_id ?? null,
      numero_lote: l?.numero_lote ?? null,
      validade: l?.validade ?? null,
      tipo: m.tipo,
      motivo: m.motivo,
      quantidade: m.quantidade,
      quantidade_assinada: assinado,
      origem: m.origem ?? null,
      destino: m.destino ?? null,
      documento: m.documento ?? null,
      data_documento: m.data_documento ?? null,
      justificativa: m.justificativa ?? null,
      observacao: m.observacao ?? null,
      usuario_id: m.usuario_id,
      usuario_nome: m.usuario_nome || 'Elaine (RT Principal)',
      estorno_de: m.estorno_de ?? null,
      estornada,
      efetiva,
      transferencia_item_id: m.transferencia_item_id ?? null,
      inventario_item_id: m.inventario_item_id ?? null,
      quantidade_anterior: m.quantidade_anterior ?? null,
      quantidade_encontrada: m.quantidade_encontrada ?? null,
      quantidade_ajustada: m.quantidade_ajustada ?? null,
      diferenca: m.diferenca ?? null,
      saldo_produto_apos: atualProd,
    }
  })

  const almox_movimentacoes_detalhe = [...movDetalheAsc].reverse()

  // almox_saldo_lote
  const almox_saldo_lote = mockState.almoxLotes.map((l) => {
    const saldo = saldoPorLoteMap.get(`${l.produto_id}:${l.id}`) || 0
    const dias = diasAte(l.validade)
    const vencido = dias !== null ? dias < 0 : false
    return {
      lote_id: l.id,
      produto_id: l.produto_id,
      numero_lote: l.numero_lote,
      validade: l.validade,
      saldo,
      vencido,
      dias_restantes: dias,
    }
  })

  // almox_saldo_produto
  const almox_saldo_produto = mockState.almoxProdutos.map((ap) => {
    const p = getProdInfo(ap.produto_id) || {}
    const lotesProd = almox_saldo_lote.filter((l) => l.produto_id === ap.produto_id && l.saldo > 0)
    const ehPermanente = p.categoria === 'permanente'
    const saldoTotal = ehPermanente
      ? saldoPorLoteMap.get(`${ap.produto_id}:0`) || 0
      : lotesProd.reduce((acc, l) => acc + l.saldo, 0)
    const saldoVencido = ehPermanente
      ? 0
      : lotesProd.filter((l) => l.vencido).reduce((acc, l) => acc + l.saldo, 0)
    const saldoDisponivel = Math.max(0, saldoTotal - saldoVencido)
    const critico = ap.estoque_minimo > 0 && saldoDisponivel <= ap.estoque_minimo
    const situacao = saldoDisponivel === 0 ? 'zerado' : critico ? 'critico' : 'ok'

    const validadesValidas = lotesProd
      .map((l) => l.validade)
      .filter(Boolean)
      .sort()
    const proxima_validade = validadesValidas[0] ?? null

    const movsProd = almox_movimentacoes_detalhe.filter((m) => m.produto_id === ap.produto_id)
    const ultima_movimentacao = movsProd[0]?.data ?? null

    return {
      produto_id: ap.produto_id,
      nome: p.nome || '—',
      categoria: p.categoria || 'material',
      grupo_item: grupoPorCategoria(p.categoria),
      unidade_medida: p.unidade_medida || 'Unidade',
      controlado: Boolean(p.controlado),
      codigo_interno: ap.codigo_interno,
      estoque_minimo: ap.estoque_minimo,
      localizacao: ap.localizacao,
      observacao: ap.observacao,
      ativo: ap.ativo,
      saldo: saldoTotal,
      saldo_vencido: saldoVencido,
      saldo_disponivel: saldoDisponivel,
      critico,
      situacao,
      lotes_com_saldo: lotesProd.length,
      proxima_validade,
      ultima_movimentacao,
    }
  })

  // almox_estoque_atual (1 linha por produto x lote com saldo <> 0, e 1 linha com lote nulo para produto de saldo 0 ou permanente)
  const almox_estoque_atual = []
  for (const sp of almox_saldo_produto) {
    if (sp.categoria === 'permanente' || sp.saldo === 0) {
      almox_estoque_atual.push({
        produto_id: sp.produto_id,
        produto: sp.nome,
        categoria: sp.categoria,
        grupo_item: sp.grupo_item,
        unidade_medida: sp.unidade_medida,
        codigo_interno: sp.codigo_interno,
        localizacao: sp.localizacao,
        estoque_minimo: sp.estoque_minimo,
        lote_id: null,
        numero_lote: null,
        validade: null,
        saldo_lote: sp.saldo,
        saldo_produto: sp.saldo,
        situacao: sp.situacao,
      })
    } else {
      const lotesAtivos = almox_saldo_lote.filter((l) => l.produto_id === sp.produto_id && l.saldo !== 0)
      for (const l of lotesAtivos) {
        almox_estoque_atual.push({
          produto_id: sp.produto_id,
          produto: sp.nome,
          categoria: sp.categoria,
          grupo_item: sp.grupo_item,
          unidade_medida: sp.unidade_medida,
          codigo_interno: sp.codigo_interno,
          localizacao: sp.localizacao,
          estoque_minimo: sp.estoque_minimo,
          lote_id: l.lote_id,
          numero_lote: l.numero_lote,
          validade: l.validade,
          saldo_lote: l.saldo,
          saldo_produto: sp.saldo,
          situacao: sp.situacao,
        })
      }
    }
  }

  // almox_estoque_critico
  const almox_estoque_critico = almox_saldo_produto
    .filter((sp) => sp.estoque_minimo > 0 && sp.saldo_disponivel <= sp.estoque_minimo)
    .map((sp) => ({
      produto_id: sp.produto_id,
      produto: sp.nome,
      categoria: sp.categoria,
      grupo_item: sp.grupo_item,
      unidade_medida: sp.unidade_medida,
      estoque_minimo: sp.estoque_minimo,
      saldo: sp.saldo,
      saldo_vencido: sp.saldo_vencido,
      saldo_disponivel: sp.saldo_disponivel,
      falta: Math.max(0, sp.estoque_minimo - sp.saldo_disponivel),
      situacao: sp.situacao,
      localizacao: sp.localizacao,
    }))

  // almox_transferencias_detalhe
  const almox_transferencias_detalhe = mockState.almoxTransferenciaItens
    .map((it) => {
      const cab = mockState.almoxTransferencias.find((t) => t.id === it.transferencia_id) || {}
      const p = getProdInfo(it.produto_id) || {}
      const l = getLoteInfo(it.almox_lote_id)
      const estornada = estornadasSet.has(it.almox_movimentacao_id)
      return {
        item_id: it.id,
        transferencia_id: it.transferencia_id,
        data: cab.data,
        dia: cab.data ? dataISOLocal(new Date(cab.data)) : hojeISO,
        produto_id: it.produto_id,
        produto: p.nome || '—',
        categoria: p.categoria || 'material',
        grupo_item: grupoPorCategoria(p.categoria),
        unidade_medida: p.unidade_medida || 'Unidade',
        almox_lote_id: it.almox_lote_id,
        farmacia_lote_id: it.farmacia_lote_id,
        numero_lote: l?.numero_lote ?? null,
        validade: l?.validade ?? null,
        quantidade: it.quantidade,
        documento: cab.documento ?? null,
        observacao: cab.observacao ?? null,
        usuario_id: cab.usuario_id,
        usuario_nome: cab.usuario_nome || 'Elaine (RT Principal)',
        estornada,
        almox_movimentacao_id: it.almox_movimentacao_id,
        farmacia_movimentacao_id: it.farmacia_movimentacao_id,
      }
    })
    .reverse()

  // almox_inventario_itens_detalhe
  const almox_inventario_itens_detalhe = mockState.almoxInventarioItens.map((ii) => {
    const inv = mockState.almoxInventarios.find((iv) => iv.id === ii.inventario_id) || {}
    const p = getProdInfo(ii.produto_id) || {}
    const l = getLoteInfo(ii.lote_id)
    const movAjuste = ii.movimentacao_ajuste_id
      ? almox_movimentacoes_detalhe.find((m) => m.id === ii.movimentacao_ajuste_id)
      : null
    const divergencia = ii.estoque_contado != null ? ii.estoque_contado - ii.estoque_sistema : null
    return {
      item_id: ii.item_id,
      inventario_id: ii.inventario_id,
      inventario_status: inv.status || 'aberto',
      produto_id: ii.produto_id,
      produto: p.nome || '—',
      categoria: p.categoria || 'material',
      grupo_item: grupoPorCategoria(p.categoria),
      unidade_medida: p.unidade_medida || 'Unidade',
      lote_id: ii.lote_id,
      numero_lote: l?.numero_lote ?? null,
      validade: l?.validade ?? null,
      estoque_sistema: ii.estoque_sistema,
      estoque_contado: ii.estoque_contado,
      divergencia,
      observacao: ii.observacao ?? null,
      contado_por_nome: ii.contado_por_nome ?? null,
      contado_em: ii.contado_em ?? null,
      movimentacao_ajuste_id: ii.movimentacao_ajuste_id ?? null,
      quantidade_anterior: movAjuste?.quantidade_anterior ?? null,
      quantidade_encontrada: movAjuste?.quantidade_encontrada ?? null,
      quantidade_ajustada: movAjuste?.quantidade_ajustada ?? null,
      diferenca: movAjuste?.diferenca ?? null,
      justificativa: movAjuste?.justificativa ?? null,
      ajustado_por_nome: movAjuste?.usuario_nome ?? null,
      ajustado_em: movAjuste?.data ?? null,
    }
  })

  // almox_inventarios_resumo
  const almox_inventarios_resumo = mockState.almoxInventarios
    .map((inv) => {
      const itensInv = almox_inventario_itens_detalhe.filter((i) => i.inventario_id === inv.id)
      const contados = itensInv.filter((i) => i.estoque_contado != null).length
      const divergentes = itensInv.filter((i) => i.divergencia != null && i.divergencia !== 0).length
      const ajustados = itensInv.filter((i) => i.movimentacao_ajuste_id != null).length
      return {
        inventario_id: inv.id,
        descricao: inv.descricao,
        status: inv.status,
        aberto_em: inv.aberto_em,
        aberto_por: inv.aberto_por,
        aberto_por_nome: inv.aberto_por_nome,
        finalizado_em: inv.finalizado_em,
        finalizado_por_nome: inv.finalizado_por_nome,
        observacao: inv.observacao,
        itens: itensInv.length,
        contados,
        divergentes,
        ajustados,
      }
    })
    .reverse()

  return {
    almox_saldo_lote,
    almox_saldo_produto,
    almox_estoque_atual,
    almox_estoque_critico,
    almox_movimentacoes_detalhe,
    almox_transferencias_detalhe,
    almox_transferencias_divergentes: [],
    almox_inventarios_resumo,
    almox_inventario_itens_detalhe,
  }
}

export async function almoxSelectView(viewName, { eq = {}, gte = {}, lte = {}, order = null, range = null } = {}) {
  if (!ALMOX_MOCK) {
    try {
      let q = supabase.from(viewName).select('*', { count: 'exact' })
      for (const [k, v] of Object.entries(eq)) {
        if (v !== undefined && v !== null && v !== '') q = q.eq(k, v)
      }
      for (const [k, v] of Object.entries(gte)) {
        if (v !== undefined && v !== null && v !== '') q = q.gte(k, v)
      }
      for (const [k, v] of Object.entries(lte)) {
        if (v !== undefined && v !== null && v !== '') q = q.lte(k, v)
      }
      if (order?.column) {
        q = q.order(order.column, { ascending: order.ascending ?? true })
      }
      if (range && typeof range.from === 'number' && typeof range.to === 'number') {
        q = q.range(range.from, range.to)
      }
      return await q
    } catch (err) {
      return { data: null, count: 0, error: err }
    }
  }

  const views = computarViewsMock()
  let rows = [...(views[viewName] || [])]

  for (const [k, v] of Object.entries(eq)) {
    if (v !== undefined && v !== null && v !== '') {
      rows = rows.filter((r) => r[k] === v)
    }
  }
  for (const [k, v] of Object.entries(gte)) {
    if (v !== undefined && v !== null && v !== '') {
      rows = rows.filter((r) => r[k] >= v)
    }
  }
  for (const [k, v] of Object.entries(lte)) {
    if (v !== undefined && v !== null && v !== '') {
      rows = rows.filter((r) => r[k] <= v)
    }
  }
  if (order?.column) {
    const asc = order.ascending ?? true
    const col = order.column
    rows.sort((a, b) => {
      const va = a[col] ?? ''
      const vb = b[col] ?? ''
      if (va < vb) return asc ? -1 : 1
      if (va > vb) return asc ? 1 : -1
      return 0
    })
  }
  const count = rows.length
  if (range && typeof range.from === 'number' && typeof range.to === 'number') {
    rows = rows.slice(range.from, range.to + 1)
  }
  return { data: rows, count, error: null }
}

export async function almoxRpc(fnName, params = {}) {
  if (!ALMOX_MOCK) {
    try {
      return await supabase.rpc(fnName, params)
    } catch (err) {
      return { data: null, error: err }
    }
  }

  try {
    const data = executarRpcMock(fnName, params)
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

function executarRpcMock(fnName, params) {
  const views = computarViewsMock()

  if (fnName === 'almox_indicadores') {
    const prods = views.almox_saldo_produto.filter((p) => p.ativo)
    const lotesComSaldo = views.almox_saldo_lote.filter((l) => l.saldo > 0)
    const limite30d = Date.now() - 30 * 86400 * 1000
    const transf30d = views.almox_transferencias_detalhe.filter(
      (t) => !t.estornada && new Date(t.data).getTime() >= limite30d
    ).length
    return {
      total_produtos: prods.length,
      com_saldo: prods.filter((p) => p.saldo_disponivel > 0).length,
      criticos: prods.filter((p) => p.critico).length,
      zerados: prods.filter((p) => p.situacao === 'zerado').length,
      lotes_vencidos: lotesComSaldo.filter((l) => l.vencido).length,
      lotes_vencendo_30: lotesComSaldo.filter((l) => !l.vencido && l.dias_restantes !== null && l.dias_restantes <= 30).length,
      lotes_vencendo_60: lotesComSaldo.filter((l) => !l.vencido && l.dias_restantes !== null && l.dias_restantes <= 60).length,
      transferencias_30d: transf30d,
      ultima_movimentacao: views.almox_movimentacoes_detalhe[0]?.data ?? null,
    }
  }

  if (fnName === 'almox_alerta_validade') {
    const pDias = Number(params.p_dias ?? 60)
    return views.almox_saldo_lote
      .filter((l) => l.saldo > 0 && l.dias_restantes !== null && l.dias_restantes <= pDias)
      .map((l) => {
        const sp = views.almox_saldo_produto.find((p) => p.produto_id === l.produto_id)
        return {
          lote_id: l.lote_id,
          numero_lote: l.numero_lote,
          validade: l.validade,
          produto_id: l.produto_id,
          produto: sp?.nome ?? '—',
          saldo: l.saldo,
          dias_restantes: l.dias_restantes,
          vencido: l.vencido,
          localizacao: sp?.localizacao ?? null,
        }
      })
      .sort((a, b) => a.dias_restantes - b.dias_restantes)
  }

  if (fnName === 'almox_distribuicao_periodo') {
    const inicio = params.p_inicio || '0000-01-01'
    const fim = params.p_fim || '9999-12-31'
    const mapa = new Map()
    for (const m of views.almox_movimentacoes_detalhe) {
      if (m.tipo !== 'saida' || !m.efetiva) continue
      if (m.dia < inicio || m.dia > fim) continue
      const destino =
        m.motivo === 'transferencia_farmacia'
          ? 'Farmácia COMUE (distribuição interna)'
          : m.destino ?? null
      const chave = `${m.produto_id}|${m.motivo}|${destino ?? ''}`
      const atual = mapa.get(chave) || {
        produto_id: m.produto_id,
        produto: m.produto,
        categoria: m.categoria,
        unidade: m.unidade_medida,
        motivo: m.motivo,
        destino,
        quantidade: 0,
      }
      atual.quantidade += m.quantidade
      mapa.set(chave, atual)
    }
    return [...mapa.values()].sort(
      (a, b) =>
        String(a.produto).localeCompare(String(b.produto), 'pt-BR') ||
        String(a.motivo).localeCompare(String(b.motivo), 'pt-BR') ||
        String(a.destino || '').localeCompare(String(b.destino || ''), 'pt-BR')
    )
  }

  if (fnName === 'almox_cadastrar_produto') {
    const d = params.p_dados || {}
    let prodId = d.produto_id ? Number(d.produto_id) : null
    if (prodId) {
      if (mockState.almoxProdutos.some((ap) => ap.produto_id === prodId)) {
        throw criarErroContrato('Este produto já está cadastrado no Almoxarifado.', 'ALMOX_PRODUTO_JA_CADASTRADO', '23505')
      }
    } else {
      const nomeLimpo = (d.nome || '').trim()
      if (!nomeLimpo || !d.categoria || !d.unidade_medida) {
        throw criarErroContrato('Preencha nome, categoria e unidade de medida.', 'ALMOX_DADO_INVALIDO')
      }
      if (mockState.catalogoGeral.some((p) => p.nome.toLowerCase() === nomeLimpo.toLowerCase())) {
        throw criarErroContrato('Já existe um produto com este nome no catálogo. Use a aba "Vincular existente".', 'ALMOX_PRODUTO_DUPLICADO', '23505')
      }
      prodId = Math.max(0, ...mockState.catalogoGeral.map((p) => p.id)) + 1
      mockState.catalogoGeral.push({
        id: prodId,
        nome: nomeLimpo,
        categoria: d.categoria,
        unidade_medida: d.unidade_medida.trim(),
        controlado: d.categoria === 'psicotropico' ? true : Boolean(d.controlado),
        ativo: true,
      })
    }
    mockState.almoxProdutos.push({
      id: Math.max(0, ...mockState.almoxProdutos.map((ap) => ap.id)) + 1,
      produto_id: prodId,
      codigo_interno: d.codigo_interno ? d.codigo_interno.trim().toUpperCase() : null,
      estoque_minimo: Number(d.estoque_minimo ?? 0),
      localizacao: d.localizacao?.trim() || null,
      observacao: d.observacao?.trim() || null,
      ativo: true,
    })
    return prodId
  }

  if (fnName === 'almox_atualizar_produto') {
    const prodId = Number(params.p_produto_id)
    const d = params.p_dados || {}
    const ap = getAlmoxProdInfo(prodId)
    if (!ap) throw criarErroContrato('Produto não encontrado no Almoxarifado.', 'ALMOX_PRODUTO_INVALIDO')
    if (d.ativo === false) {
      const sp = views.almox_saldo_produto.find((p) => p.produto_id === prodId)
      if ((sp?.saldo ?? 0) > 0) {
        throw criarErroContrato('Não é possível desativar produto com saldo no Almoxarifado.', 'ALMOX_PRODUTO_COM_SALDO')
      }
    }
    if (d.codigo_interno !== undefined) ap.codigo_interno = d.codigo_interno ? d.codigo_interno.trim().toUpperCase() : null
    if (d.estoque_minimo !== undefined) ap.estoque_minimo = Number(d.estoque_minimo)
    if (d.localizacao !== undefined) ap.localizacao = d.localizacao?.trim() || null
    if (d.observacao !== undefined) ap.observacao = d.observacao?.trim() || null
    if (d.ativo !== undefined) ap.ativo = Boolean(d.ativo)
    return null
  }

  if (fnName === 'almox_registrar_entrada') {
    const cab = params.p_cabecalho || {}
    const itens = params.p_itens || []
    if (!cab.origem || cab.origem.trim().length < 2) {
      throw criarErroContrato('Informe a origem da entrada (mínimo 2 caracteres).', 'ALMOX_ORIGEM_OBRIGATORIA')
    }
    if (cab.motivo === 'outros' && (!cab.justificativa || cab.justificativa.trim().length < 5)) {
      throw criarErroContrato('Justificativa obrigatória para o motivo Outros (mínimo 5 caracteres).', 'ALMOX_JUSTIFICATIVA_OBRIGATORIA')
    }
    if (!itens.length) {
      throw criarErroContrato('Adicione pelo menos um item na entrada.', 'ALMOX_DADO_INVALIDO')
    }
    const opId = crypto.randomUUID ? crypto.randomUUID() : `op-${Date.now()}`
    const movsCriadas = []
    const chavesVistas = new Set()

    for (const it of itens) {
      const prodId = Number(it.produto_id)
      const p = getProdInfo(prodId)
      if (!p) throw criarErroContrato('Produto inválido.', 'ALMOX_PRODUTO_INVALIDO')
      const qtd = Number(it.quantidade)
      if (!Number.isInteger(qtd) || qtd <= 0) {
        throw criarErroContrato('Quantidade deve ser um inteiro positivo.', 'ALMOX_QUANTIDADE_INVALIDA')
      }
      let loteId = null
      if (p.categoria !== 'permanente') {
        const numLote = (it.numero_lote || '').trim().toUpperCase()
        if (!numLote || !it.validade) {
          throw criarErroContrato(`Lote e validade são obrigatórios para ${p.nome}.`, 'ALMOX_LOTE_OBRIGATORIO')
        }
        const chave = `${prodId}:${numLote}`
        if (chavesVistas.has(chave)) {
          throw criarErroContrato(`Produto e lote (${numLote}) repetidos na mesma entrada.`, 'ALMOX_ITEM_DUPLICADO')
        }
        chavesVistas.add(chave)

        const loteExistente = mockState.almoxLotes.find(
          (l) => l.produto_id === prodId && l.numero_lote.trim().toUpperCase() === numLote
        )
        if (loteExistente) {
          if (loteExistente.validade !== it.validade) {
            throw criarErroContrato(
              `O lote ${numLote} já existe com a validade ${loteExistente.validade} (informada: ${it.validade}). Para corrigir erro de validade, estorne a entrada original e relance.`,
              'ALMOX_LOTE_VALIDADE_DIVERGENTE'
            )
          }
          loteId = loteExistente.id
        } else {
          loteId = Math.max(0, ...mockState.almoxLotes.map((l) => l.id)) + 1
          mockState.almoxLotes.push({
            id: loteId,
            produto_id: prodId,
            numero_lote: numLote,
            validade: it.validade,
          })
        }
      }

      const movId = Math.max(0, ...mockState.almoxMovimentacoes.map((m) => m.id)) + 1
      mockState.almoxMovimentacoes.push({
        id: movId,
        operacao_id: opId,
        produto_id: prodId,
        lote_id: loteId,
        tipo: 'entrada',
        motivo: cab.motivo,
        quantidade: qtd,
        origem: cab.origem.trim(),
        destino: null,
        documento: cab.documento?.trim() || null,
        data_documento: cab.data_documento || null,
        justificativa: cab.justificativa?.trim() || null,
        observacao: it.observacao?.trim() || cab.observacao?.trim() || null,
        estorno_de: null,
        transferencia_item_id: null,
        inventario_item_id: null,
        quantidade_anterior: null,
        quantidade_encontrada: null,
        quantidade_ajustada: null,
        diferenca: null,
        usuario_id: '00000000-0000-0000-0000-000000000001',
        usuario_nome: 'Elaine (RT Principal)',
        data: new Date().toISOString(),
      })
      movsCriadas.push({ id: movId, produto_id: prodId, lote_id: loteId, quantidade: qtd })
    }
    return { operacao_id: opId, movimentacoes: movsCriadas }
  }

  if (fnName === 'almox_registrar_saida') {
    const cab = params.p_cabecalho || {}
    const itens = params.p_itens || []
    if (cab.motivo === 'transferencia_farmacia') {
      throw criarErroContrato('Use a função "Transferir para a Farmácia".', 'ALMOX_MOTIVO_INVALIDO')
    }
    if (cab.motivo === 'outra_unidade' && (!cab.destino || cab.destino.trim().length < 2)) {
      throw criarErroContrato('Informe a unidade de destino.', 'ALMOX_DESTINO_OBRIGATORIO')
    }
    if (['outros', 'perda_avaria'].includes(cab.motivo) && (!cab.justificativa || cab.justificativa.trim().length < 5)) {
      throw criarErroContrato('Informe a justificativa (mínimo 5 caracteres).', 'ALMOX_JUSTIFICATIVA_OBRIGATORIA')
    }
    const opId = crypto.randomUUID ? crypto.randomUUID() : `op-${Date.now()}`
    const movsCriadas = []

    for (const it of itens) {
      const prodId = Number(it.produto_id)
      const loteId = it.lote_id ? Number(it.lote_id) : null
      const qtd = Number(it.quantidade)
      if (!Number.isInteger(qtd) || qtd <= 0) {
        throw criarErroContrato('Quantidade inválida.', 'ALMOX_QUANTIDADE_INVALIDA')
      }
      if (loteId) {
        const sl = views.almox_saldo_lote.find((l) => l.lote_id === loteId && l.produto_id === prodId)
        if (!sl) throw criarErroContrato('Lote inválido para este produto.', 'ALMOX_LOTE_INVALIDO')
        if (sl.saldo < qtd) {
          throw criarErroContrato(`Saldo insuficiente no lote ${sl.numero_lote} (disponível: ${sl.saldo}).`, 'ALMOX_SALDO_LOTE_INSUFICIENTE')
        }
        if (sl.vencido && !['vencido', 'perda_avaria'].includes(cab.motivo)) {
          throw criarErroContrato(`O lote ${sl.numero_lote} está vencido e só pode sair por descarte de vencido ou perda/avaria.`, 'ALMOX_LOTE_VENCIDO')
        }
        if (!sl.vencido && cab.motivo === 'vencido') {
          throw criarErroContrato(`O lote ${sl.numero_lote} não está vencido.`, 'ALMOX_LOTE_VENCIDO')
        }
      } else {
        const sp = views.almox_saldo_produto.find((p) => p.produto_id === prodId)
        if (!sp || sp.saldo < qtd) {
          throw criarErroContrato('Saldo insuficiente para este produto.', 'ALMOX_SALDO_INSUFICIENTE')
        }
      }

      const movId = Math.max(0, ...mockState.almoxMovimentacoes.map((m) => m.id)) + 1
      mockState.almoxMovimentacoes.push({
        id: movId,
        operacao_id: opId,
        produto_id: prodId,
        lote_id: loteId,
        tipo: 'saida',
        motivo: cab.motivo,
        quantidade: qtd,
        origem: null,
        destino: cab.destino?.trim() || null,
        documento: cab.documento?.trim() || null,
        data_documento: null,
        justificativa: cab.justificativa?.trim() || null,
        observacao: cab.observacao?.trim() || null,
        estorno_de: null,
        transferencia_item_id: null,
        inventario_item_id: null,
        quantidade_anterior: null,
        quantidade_encontrada: null,
        quantidade_ajustada: null,
        diferenca: null,
        usuario_id: '00000000-0000-0000-0000-000000000001',
        usuario_nome: 'Elaine (RT Principal)',
        data: new Date().toISOString(),
      })
      movsCriadas.push({ id: movId, produto_id: prodId, lote_id: loteId, quantidade: qtd })
    }
    return { operacao_id: opId, movimentacoes: movsCriadas }
  }

  if (fnName === 'almox_transferir_para_farmacia') {
    const itens = params.p_itens || []
    if (!itens.length) {
      throw criarErroContrato('Informe pelo menos um item para transferir.', 'ALMOX_TRANSFERENCIA_VAZIA')
    }
    const transfId = Math.max(0, ...mockState.almoxTransferencias.map((t) => t.id)) + 1
    const opId = crypto.randomUUID ? crypto.randomUUID() : `op-${Date.now()}`
    const itensCriados = []

    for (const it of itens) {
      const prodId = Number(it.produto_id)
      const p = getProdInfo(prodId)
      if (!p) throw criarErroContrato('Produto inválido.', 'ALMOX_PRODUTO_INVALIDO')
      // Decisão aceita pelo Yan na v1: transferência de psicotrópicos bloqueada na v1.
      if (p.controlado || p.categoria === 'psicotropico') {
        throw criarErroContrato(
          'Transferência de medicamentos controlados (Portaria 344/98) está bloqueada na v1.',
          'ALMOX_DADO_INVALIDO'
        )
      }
      const loteId = it.lote_id ? Number(it.lote_id) : null
      const qtd = Number(it.quantidade)
      if (!Number.isInteger(qtd) || qtd <= 0) {
        throw criarErroContrato('Quantidade inválida.', 'ALMOX_QUANTIDADE_INVALIDA')
      }
      if (loteId) {
        const sl = views.almox_saldo_lote.find((l) => l.lote_id === loteId && l.produto_id === prodId)
        if (!sl) throw criarErroContrato('Lote inválido.', 'ALMOX_LOTE_INVALIDO')
        if (sl.vencido) throw criarErroContrato(`O lote ${sl.numero_lote} está vencido e não pode ser transferido.`, 'ALMOX_LOTE_VENCIDO')
        if (sl.saldo < qtd) throw criarErroContrato(`Saldo insuficiente no lote ${sl.numero_lote}.`, 'ALMOX_SALDO_LOTE_INSUFICIENTE')
      }

      const itemId = Math.max(0, ...mockState.almoxTransferenciaItens.map((x) => x.id)) + 1
      const movId = Math.max(0, ...mockState.almoxMovimentacoes.map((m) => m.id)) + 1
      const farmMovId = 9000 + movId
      const farmLoteId = loteId ? 500 + loteId : null

      mockState.almoxMovimentacoes.push({
        id: movId,
        operacao_id: opId,
        produto_id: prodId,
        lote_id: loteId,
        tipo: 'saida',
        motivo: 'transferencia_farmacia',
        quantidade: qtd,
        origem: null,
        destino: 'Farmácia COMUE',
        documento: params.p_documento?.trim() || null,
        data_documento: null,
        justificativa: null,
        observacao: params.p_observacao?.trim() || null,
        estorno_de: null,
        transferencia_item_id: itemId,
        inventario_item_id: null,
        quantidade_anterior: null,
        quantidade_encontrada: null,
        quantidade_ajustada: null,
        diferenca: null,
        usuario_id: '00000000-0000-0000-0000-000000000001',
        usuario_nome: 'Elaine (RT Principal)',
        data: new Date().toISOString(),
      })

      mockState.almoxTransferenciaItens.push({
        id: itemId,
        transferencia_id: transfId,
        produto_id: prodId,
        almox_lote_id: loteId,
        farmacia_lote_id: farmLoteId,
        quantidade: qtd,
        almox_movimentacao_id: movId,
        farmacia_movimentacao_id: farmMovId,
      })

      itensCriados.push({
        item_id: itemId,
        produto_id: prodId,
        quantidade: qtd,
        almox_lote_id: loteId,
        farmacia_lote_id: farmLoteId,
        almox_movimentacao_id: movId,
        farmacia_movimentacao_id: farmMovId,
      })
    }

    mockState.almoxTransferencias.push({
      id: transfId,
      documento: params.p_documento?.trim() || null,
      observacao: params.p_observacao?.trim() || null,
      usuario_id: '00000000-0000-0000-0000-000000000001',
      usuario_nome: 'Elaine (RT Principal)',
      data: new Date().toISOString(),
    })

    return { transferencia_id: transfId, itens: itensCriados }
  }

  if (fnName === 'almox_estornar') {
    const movId = Number(params.p_movimentacao_id)
    const just = (params.p_justificativa || '').trim()
    if (just.length < 5) {
      throw criarErroContrato('Informe a justificativa do estorno (mínimo 5 caracteres).', 'ALMOX_JUSTIFICATIVA_OBRIGATORIA')
    }
    const orig = mockState.almoxMovimentacoes.find((m) => m.id === movId)
    if (!orig) throw criarErroContrato('Movimentação não encontrada.', 'ALMOX_MOV_NAO_ENCONTRADA', 'P0002')
    if (orig.estorno_de || orig.motivo === 'reajuste' || orig.transferencia_item_id) {
      throw criarErroContrato('Este tipo de lançamento não pode ser estornado por esta operação.', 'ALMOX_ESTORNO_NAO_PERMITIDO')
    }
    if (mockState.almoxMovimentacoes.some((m) => m.estorno_de === movId)) {
      throw criarErroContrato('Este lançamento já foi estornado.', 'ALMOX_JA_ESTORNADO')
    }
    const novoId = Math.max(0, ...mockState.almoxMovimentacoes.map((m) => m.id)) + 1
    mockState.almoxMovimentacoes.push({
      id: novoId,
      operacao_id: crypto.randomUUID ? crypto.randomUUID() : `op-${Date.now()}`,
      produto_id: orig.produto_id,
      lote_id: orig.lote_id,
      tipo: orig.tipo === 'entrada' ? 'saida' : 'entrada',
      motivo: orig.motivo,
      quantidade: orig.quantidade,
      origem: orig.origem,
      destino: orig.destino,
      documento: orig.documento,
      data_documento: orig.data_documento,
      justificativa: just,
      observacao: just,
      estorno_de: orig.id,
      transferencia_item_id: null,
      inventario_item_id: null,
      quantidade_anterior: null,
      quantidade_encontrada: null,
      quantidade_ajustada: null,
      diferenca: null,
      usuario_id: '00000000-0000-0000-0000-000000000001',
      usuario_nome: 'Elaine (RT Principal)',
      data: new Date().toISOString(),
    })
    return novoId
  }

  if (fnName === 'almox_estornar_transferencia_item') {
    const itemId = Number(params.p_item_id)
    const just = (params.p_justificativa || '').trim()
    if (just.length < 5) {
      throw criarErroContrato('Informe a justificativa do estorno (mínimo 5 caracteres).', 'ALMOX_JUSTIFICATIVA_OBRIGATORIA')
    }
    const item = mockState.almoxTransferenciaItens.find((x) => x.id === itemId)
    if (!item) throw criarErroContrato('Item de transferência não encontrado.', 'ALMOX_MOV_NAO_ENCONTRADA', 'P0002')
    const orig = mockState.almoxMovimentacoes.find((m) => m.id === item.almox_movimentacao_id)
    if (mockState.almoxMovimentacoes.some((m) => m.estorno_de === orig.id)) {
      throw criarErroContrato('Este item de transferência já foi estornado.', 'ALMOX_JA_ESTORNADO')
    }
    const novoId = Math.max(0, ...mockState.almoxMovimentacoes.map((m) => m.id)) + 1
    mockState.almoxMovimentacoes.push({
      id: novoId,
      operacao_id: crypto.randomUUID ? crypto.randomUUID() : `op-${Date.now()}`,
      produto_id: orig.produto_id,
      lote_id: orig.lote_id,
      tipo: 'entrada',
      motivo: 'transferencia_farmacia',
      quantidade: orig.quantidade,
      origem: 'Estorno de transferência',
      destino: 'Farmácia COMUE',
      documento: orig.documento,
      data_documento: null,
      justificativa: just,
      observacao: just,
      estorno_de: orig.id,
      transferencia_item_id: null,
      inventario_item_id: null,
      quantidade_anterior: null,
      quantidade_encontrada: null,
      quantidade_ajustada: null,
      diferenca: null,
      usuario_id: '00000000-0000-0000-0000-000000000001',
      usuario_nome: 'Elaine (RT Principal)',
      data: new Date().toISOString(),
    })
    return { almox_estorno_id: novoId, farmacia_estorno_id: 9500 + novoId }
  }

  if (fnName === 'almox_reajustar_estoque') {
    const prodId = Number(params.p_produto_id)
    const loteId = params.p_lote_id ? Number(params.p_lote_id) : null
    const encontrada = Number(params.p_quantidade_encontrada)
    const just = (params.p_justificativa || '').trim()
    if (just.length < 10) {
      throw criarErroContrato('Justificativa obrigatória com no mínimo 10 caracteres.', 'ALMOX_JUSTIFICATIVA_OBRIGATORIA')
    }
    if (!Number.isInteger(encontrada) || encontrada < 0) {
      throw criarErroContrato('Quantidade encontrada deve ser um inteiro maior ou igual a zero.', 'ALMOX_QUANTIDADE_INVALIDA')
    }
    let anterior = 0
    if (loteId) {
      const sl = views.almox_saldo_lote.find((l) => l.lote_id === loteId && l.produto_id === prodId)
      anterior = sl?.saldo ?? 0
    } else {
      const sp = views.almox_saldo_produto.find((p) => p.produto_id === prodId)
      anterior = sp?.saldo ?? 0
    }
    const diferenca = encontrada - anterior
    if (diferenca === 0) {
      throw criarErroContrato('A quantidade encontrada é igual ao saldo atual (sem divergência).', 'ALMOX_SEM_DIVERGENCIA')
    }
    const movId = Math.max(0, ...mockState.almoxMovimentacoes.map((m) => m.id)) + 1
    mockState.almoxMovimentacoes.push({
      id: movId,
      operacao_id: crypto.randomUUID ? crypto.randomUUID() : `op-${Date.now()}`,
      produto_id: prodId,
      lote_id: loteId,
      tipo: diferenca > 0 ? 'entrada' : 'saida',
      motivo: 'reajuste',
      quantidade: Math.abs(diferenca),
      origem: diferenca > 0 ? 'Reajuste de saldo' : null,
      destino: null,
      documento: null,
      data_documento: null,
      justificativa: just,
      observacao: just,
      estorno_de: null,
      transferencia_item_id: null,
      inventario_item_id: null,
      quantidade_anterior: anterior,
      quantidade_encontrada: encontrada,
      quantidade_ajustada: encontrada,
      diferenca,
      usuario_id: '00000000-0000-0000-0000-000000000001',
      usuario_nome: 'Elaine (RT Principal)',
      data: new Date().toISOString(),
    })
    return {
      movimentacao_id: movId,
      quantidade_anterior: anterior,
      quantidade_encontrada: encontrada,
      quantidade_ajustada: encontrada,
      diferenca,
    }
  }

  if (fnName === 'almox_abrir_inventario') {
    if (mockState.almoxInventarios.some((i) => i.status === 'aberto')) {
      throw criarErroContrato('Já existe um inventário aberto no Almoxarifado.', 'ALMOX_INVENTARIO_ABERTO_EXISTE')
    }
    const invId = Math.max(0, ...mockState.almoxInventarios.map((i) => i.id)) + 1
    mockState.almoxInventarios.push({
      id: invId,
      descricao: params.p_descricao?.trim() || `Inventário #${invId}`,
      status: 'aberto',
      aberto_em: new Date().toISOString(),
      aberto_por: '00000000-0000-0000-0000-000000000001',
      aberto_por_nome: 'Elaine (RT Principal)',
      finalizado_em: null,
      finalizado_por_nome: null,
      observacao: null,
    })
    let nextItemId = Math.max(0, ...mockState.almoxInventarioItens.map((x) => x.item_id)) + 1
    for (const row of views.almox_estoque_atual) {
      if (row.saldo_lote > 0) {
        mockState.almoxInventarioItens.push({
          item_id: nextItemId++,
          inventario_id: invId,
          produto_id: row.produto_id,
          lote_id: row.lote_id,
          estoque_sistema: row.saldo_lote,
          estoque_contado: null,
          observacao: null,
          contado_por_nome: null,
          contado_em: null,
          movimentacao_ajuste_id: null,
        })
      }
    }
    return invId
  }

  if (fnName === 'almox_registrar_contagem_inventario') {
    const invId = Number(params.p_inventario_id)
    const prodId = Number(params.p_produto_id)
    const loteId = params.p_lote_id ? Number(params.p_lote_id) : null
    const contado = Number(params.p_contado)
    const inv = mockState.almoxInventarios.find((i) => i.id === invId)
    if (!inv || inv.status !== 'aberto') {
      throw criarErroContrato('O inventário não está aberto.', 'ALMOX_INVENTARIO_NAO_ABERTO')
    }
    if (!Number.isInteger(contado) || contado < 0) {
      throw criarErroContrato('Contagem deve ser um inteiro não negativo.', 'ALMOX_QUANTIDADE_INVALIDA')
    }
    let saldoAtual = 0
    if (loteId) {
      saldoAtual = views.almox_saldo_lote.find((l) => l.lote_id === loteId)?.saldo ?? 0
    } else {
      saldoAtual = views.almox_saldo_produto.find((p) => p.produto_id === prodId)?.saldo ?? 0
    }
    let item = mockState.almoxInventarioItens.find(
      (x) => x.inventario_id === invId && x.produto_id === prodId && (x.lote_id ?? null) === loteId
    )
    if (!item) {
      const nextItemId = Math.max(0, ...mockState.almoxInventarioItens.map((x) => x.item_id)) + 1
      item = {
        item_id: nextItemId,
        inventario_id: invId,
        produto_id: prodId,
        lote_id: loteId,
        estoque_sistema: saldoAtual,
        estoque_contado: contado,
        observacao: params.p_observacao?.trim() || null,
        contado_por_nome: 'Elaine (RT Principal)',
        contado_em: new Date().toISOString(),
        movimentacao_ajuste_id: null,
      }
      mockState.almoxInventarioItens.push(item)
    } else {
      item.estoque_sistema = saldoAtual
      item.estoque_contado = contado
      item.observacao = params.p_observacao?.trim() || item.observacao
      item.contado_por_nome = 'Elaine (RT Principal)'
      item.contado_em = new Date().toISOString()
    }
    return item.item_id
  }

  if (fnName === 'almox_reajustar_item_inventario') {
    const itemId = Number(params.p_item_id)
    const just = (params.p_justificativa || '').trim()
    if (just.length < 10) {
      throw criarErroContrato('Justificativa obrigatória com no mínimo 10 caracteres.', 'ALMOX_JUSTIFICATIVA_OBRIGATORIA')
    }
    const item = mockState.almoxInventarioItens.find((x) => x.item_id === itemId)
    if (!item || item.estoque_contado == null) {
      throw criarErroContrato('O item ainda não foi contado.', 'ALMOX_INVENTARIO_ITEM_NAO_CONTADO')
    }
    const inv = mockState.almoxInventarios.find((i) => i.id === item.inventario_id)
    if (!inv || inv.status !== 'aberto') {
      throw criarErroContrato('O inventário não está aberto.', 'ALMOX_INVENTARIO_NAO_ABERTO')
    }
    if (item.movimentacao_ajuste_id != null) {
      throw criarErroContrato('Este item já foi reajustado neste inventário.', 'ALMOX_SEM_DIVERGENCIA')
    }
    let saldoAtual = 0
    if (item.lote_id) {
      saldoAtual = views.almox_saldo_lote.find((l) => l.lote_id === item.lote_id && l.produto_id === item.produto_id)?.saldo ?? 0
    } else {
      saldoAtual = views.almox_saldo_produto.find((p) => p.produto_id === item.produto_id)?.saldo ?? 0
    }
    if (saldoAtual !== item.estoque_sistema) {
      throw criarErroContrato(
        'O saldo atual do lote mudou desde o momento da contagem. Salve uma nova contagem antes de reajustar.',
        'ALMOX_INVENTARIO_SALDO_MUDOU'
      )
    }
    const res = executarRpcMock('almox_reajustar_estoque', {
      p_produto_id: item.produto_id,
      p_lote_id: item.lote_id,
      p_quantidade_encontrada: item.estoque_contado,
      p_justificativa: just,
    })
    const mov = mockState.almoxMovimentacoes.find((m) => m.id === res.movimentacao_id)
    if (mov) mov.inventario_item_id = item.item_id
    item.movimentacao_ajuste_id = res.movimentacao_id
    return res
  }

  if (fnName === 'almox_finalizar_inventario') {
    const invId = Number(params.p_inventario_id)
    const permitir = Boolean(params.p_permitir_divergencias_pendentes)
    const inv = mockState.almoxInventarios.find((i) => i.id === invId)
    if (!inv || inv.status !== 'aberto') {
      throw criarErroContrato('O inventário não está aberto.', 'ALMOX_INVENTARIO_NAO_ABERTO')
    }
    const itensInv = views.almox_inventario_itens_detalhe.filter((x) => x.inventario_id === invId)
    const pendentes = itensInv.filter((x) => x.divergencia != null && x.divergencia !== 0 && !x.movimentacao_ajuste_id)
    if (pendentes.length > 0 && !permitir) {
      throw criarErroContrato(
        `Existem ${pendentes.length} item(ns) com divergência não ajustada. Aplique os reajustes ou confirme finalizar com divergências pendentes.`,
        'ALMOX_INVENTARIO_DIVERGENCIA_PENDENTE'
      )
    }
    inv.status = 'finalizado'
    inv.finalizado_em = new Date().toISOString()
    inv.finalizado_por_nome = 'Elaine (RT Principal)'
    if (params.p_observacao) inv.observacao = params.p_observacao.trim()
    return null
  }

  throw criarErroContrato(`Função ${fnName} não implementada no mock.`, 'ALMOX_DADO_INVALIDO')
}

export function listarCatalogoGeralMock() {
  return [...mockState.catalogoGeral]
}

// Identifica se uma movimentação da Farmácia veio de transferência automática do Almoxarifado
// sem exigir coluna nova no .select() enquanto a migration M-A4 não estiver aplicada.
export function transferenciaAlmoxTag(m) {
  if (!m) return null
  const match = String(m.observacao || '').match(/^Transferência do Almoxarifado #(\d+)/i)
  if (match) return `Transferência do Almoxarifado #${match[1]}`
  if (m.motivo === 'almoxarifado' && m.transferencia_item_id != null) {
    return `Transferência do Almoxarifado #${m.transferencia_item_id}`
  }
  return null
}

// Consulta lotes da Farmácia para um produto (exibe saldo atual na Farmácia dentro do AlmoxTransferenciaDialog)
export async function almoxConsultarLotesFarmacia(produtoId) {
  if (!produtoId) return []
  if (ALMOX_MOCK) {
    // No mock, calcula a partir das transferências efetivas já feitas para a Farmácia
    const views = computarViewsMock()
    const mapa = new Map()
    for (const t of views.almox_transferencias_detalhe) {
      if (t.estornada || Number(t.produto_id) !== Number(produtoId)) continue
      const chave = (t.numero_lote || '').toUpperCase()
      const atual = mapa.get(chave) || {
        produto_id: t.produto_id,
        numero_lote: t.numero_lote,
        validade: t.validade,
        saldo: 0,
      }
      atual.saldo += Number(t.quantidade || 0)
      mapa.set(chave, atual)
    }
    return [...mapa.values()]
  }
  try {
    const { data, error } = await supabase
      .from('saldo_por_lote')
      .select('lote_id, produto_id, numero_lote, validade, saldo')
      .eq('produto_id', produtoId)
    if (error) return []
    return data ?? []
  } catch {
    return []
  }
}

export function fmtDataHora(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export async function almoxListarCatalogoGeral() {
  if (ALMOX_MOCK) {
    return { data: listarCatalogoGeralMock(), error: null }
  }
  try {
    const { data, error } = await supabase
      .from('produtos')
      .select('id, nome, categoria, unidade_medida, controlado, ativo')
      .eq('ativo', true)
      .order('nome')
    return { data: data ?? [], error }
  } catch (err) {
    return { data: [], error: err }
  }
}

