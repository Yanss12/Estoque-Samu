<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { supabase } from '../lib/supabase'
import { fetchPerfisMap } from '../lib/perfis'
import ListaMovimentacoes from '../components/ListaMovimentacoes.vue'

const carregando = ref(true)
const totalItens = ref(0)
const criticos = ref([])
const totalCriticos = ref(0)
const vencendo = ref([])
const totalVencendo = ref(0)
const recentes = ref([])
const perfisMap = ref({})

const hojeTxt = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
const hoje = hojeTxt.charAt(0).toUpperCase() + hojeTxt.slice(1)

async function carregar() {
  carregando.value = true
  const [prod, saldo, val, movs, perfis] = await Promise.all([
    supabase.from('produtos').select('id', { count: 'exact', head: true }).eq('ativo', true),
    supabase
      .from('saldo_estoque')
      .select('nome, saldo, estoque_minimo', { count: 'exact' })
      .eq('abaixo_minimo', true)
      .order('saldo', { ascending: true })
      .limit(8),
    supabase
      .from('alerta_validade')
      .select('produto, validade, saldo', { count: 'exact' })
      .order('validade', { ascending: true })
      .limit(8),
    supabase
      .from('movimentacoes')
      .select('id, tipo, quantidade, motivo, data, usuario_id, estorno_de, produto:produtos(nome, controlado), setor:setores(nome)')
      .order('data', { ascending: false })
      .limit(8),
    fetchPerfisMap(),
  ])
  totalItens.value = prod.count ?? 0
  criticos.value = saldo.data ?? []
  totalCriticos.value = saldo.count ?? criticos.value.length
  vencendo.value = val.data ?? []
  totalVencendo.value = val.count ?? vencendo.value.length
  recentes.value = movs.data ?? []
  perfisMap.value = perfis
  carregando.value = false
}

// Datas 'YYYY-MM-DD' no fuso LOCAL (evita o off-by-one do UTC).
function parseData(v) {
  const [y, m, d] = v.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function dias(v) {
  const h = new Date()
  h.setHours(0, 0, 0, 0)
  return Math.ceil((parseData(v) - h) / 86400000)
}
function prazo(v) {
  const d = dias(v)
  if (d < 0) return d === -1 ? 'venceu ontem' : `venceu há ${-d} dias`
  if (d === 0) return 'vence hoje'
  if (d === 1) return 'vence amanhã'
  return `em ${d} dias`
}
function pct(c) {
  if (!c.estoque_minimo) return 0
  return Math.max(2, Math.min(100, Math.round((c.saldo / c.estoque_minimo) * 100)))
}

const temVencido = computed(() => vencendo.value.some((v) => dias(v.validade) < 0))
const tudoOk = computed(() => !carregando.value && !totalCriticos.value && !totalVencendo.value)

onMounted(carregar)
</script>

<template>
  <div class="page-head">
    <div>
      <h1>Visão geral</h1>
      <p class="page-sub">{{ hoje }}</p>
    </div>
  </div>

  <!-- Resumo em uma faixa: o que pede atenção primeiro -->
  <div class="resumo">
    <RouterLink
      :to="{ name: 'estoque' }"
      class="resumo-item"
      :class="{ danger: totalCriticos > 0 }"
    >
      <span class="n">{{ carregando ? '–' : totalCriticos }}</span>
      <span class="t">{{ totalCriticos === 1 ? 'item abaixo do mínimo' : 'itens abaixo do mínimo' }}</span>
    </RouterLink>
    <RouterLink :to="{ name: 'estoque' }" class="resumo-item" :class="{ warn: totalVencendo > 0 }">
      <span class="n">{{ carregando ? '–' : totalVencendo }}</span>
      <span class="t">{{ totalVencendo === 1 ? 'lote vencido ou' : 'lotes vencidos ou' }} a vencer em 60 dias</span>
    </RouterLink>
    <RouterLink :to="{ name: 'estoque' }" class="resumo-item">
      <span class="n">{{ carregando ? '–' : totalItens }}</span>
      <span class="t">produtos ativos</span>
    </RouterLink>
  </div>

  <div v-if="!tudoOk" class="duas-colunas">
    <section class="card-panel" aria-labelledby="h-criticos">
      <div class="panel-head">
        <h2 id="h-criticos">
          Abaixo do mínimo
          <span v-if="totalCriticos > criticos.length" class="conta">{{ criticos.length }} de {{ totalCriticos }}</span>
        </h2>
        <RouterLink class="ver-todas" :to="{ name: 'estoque' }">Abrir estoque <i class="pi pi-arrow-right" /></RouterLink>
      </div>
      <ul v-if="carregando" class="lista" aria-hidden="true">
        <li v-for="n in 4" :key="n"><span class="skel" style="width: 60%" /><span class="skel" style="width: 3rem" /></li>
      </ul>
      <ul v-else-if="criticos.length" class="lista">
        <li v-for="(c, i) in criticos" :key="i">
          <span class="nome" :title="c.nome">{{ c.nome }}</span>
          <span class="val">
            <strong style="color: var(--danger-fg)">{{ c.saldo }}</strong>
            <small> / mín. {{ c.estoque_minimo }}</small>
          </span>
          <span class="barra" aria-hidden="true"><span :style="{ width: pct(c) + '%' }" /></span>
        </li>
      </ul>
      <p v-else class="empty" style="margin: 0.4rem 0 0">
        Todos os produtos estão acima do estoque mínimo.
      </p>
    </section>

    <section class="card-panel" aria-labelledby="h-validade">
      <div class="panel-head">
        <h2 id="h-validade">
          Validade
          <span v-if="totalVencendo > vencendo.length" class="conta">{{ vencendo.length }} de {{ totalVencendo }}</span>
        </h2>
        <RouterLink
          v-if="temVencido"
          class="ver-todas"
          :to="{ name: 'estoque', query: { baixa: '1' } }"
        >Dar baixa nos vencidos <i class="pi pi-arrow-right" /></RouterLink>
      </div>
      <ul v-if="carregando" class="lista" aria-hidden="true">
        <li v-for="n in 4" :key="n"><span class="skel" style="width: 55%" /><span class="skel" style="width: 5rem" /></li>
      </ul>
      <ul v-else-if="vencendo.length" class="lista">
        <li v-for="(v, i) in vencendo" :key="i">
          <span class="nome" :title="v.produto">{{ v.produto }}</span>
          <span
            class="val validade"
            :class="dias(v.validade) < 0 ? 'vencido' : dias(v.validade) <= 30 ? 'proximo' : ''"
          >
            {{ parseData(v.validade).toLocaleDateString('pt-BR') }}
            <small>{{ prazo(v.validade) }}</small>
          </span>
        </li>
      </ul>
      <p v-else class="empty" style="margin: 0.4rem 0 0">Nenhum lote vencido ou vencendo nos próximos 60 dias.</p>
    </section>
  </div>

  <section class="card-panel" aria-labelledby="h-recentes">
    <div class="panel-head">
      <h2 id="h-recentes">Últimas movimentações</h2>
      <RouterLink class="ver-todas" :to="{ name: 'movimentacoes' }">
        Histórico completo <i class="pi pi-arrow-right" />
      </RouterLink>
    </div>

    <ul v-if="carregando" class="lista" aria-hidden="true">
      <li v-for="n in 5" :key="n"><span class="skel" style="width: 45%" /><span class="skel" style="width: 2.5rem" /></li>
    </ul>
    <ListaMovimentacoes v-else-if="recentes.length" :movs="recentes" :perfis-map="perfisMap" />
    <p v-else class="empty" style="margin: 0.4rem 0 0">
      Nenhuma movimentação ainda. Registre a primeira entrada pela tela de
      <RouterLink :to="{ name: 'estoque' }" class="ver-todas" style="display: inline">Estoque</RouterLink>.
    </p>
  </section>
</template>
