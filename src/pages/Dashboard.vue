<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import Tag from 'primevue/tag'
import { supabase } from '../lib/supabase'
import { motivoLabel } from '../lib/movimentacoes'
import { tempoRelativo } from '../lib/format'
import { fetchPerfisMap } from '../lib/perfis'

const totalItens = ref(0)
const criticos = ref([])
const vencendo = ref([])
const recentes = ref([])
const perfisMap = ref({})

async function carregar() {
  const [prod, saldo, val, movs, perfis] = await Promise.all([
    supabase.from('produtos').select('id', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('saldo_estoque').select('nome, saldo, estoque_minimo').eq('abaixo_minimo', true).limit(20),
    supabase.from('alerta_validade').select('produto, validade, saldo').limit(20),
    supabase
      .from('movimentacoes')
      .select('tipo, quantidade, motivo, data, usuario_id, produto:produtos(nome, controlado), setor:setores(nome)')
      .order('data', { ascending: false })
      .limit(8),
    fetchPerfisMap(),
  ])
  totalItens.value = prod.count ?? 0
  criticos.value = saldo.data ?? []
  vencendo.value = val.data ?? []
  recentes.value = movs.data ?? []
  perfisMap.value = perfis
}

function autor(m) {
  return perfisMap.value[m.usuario_id] || 'usuário removido'
}

function dias(v) {
  return Math.ceil((new Date(v) - new Date()) / 86400000)
}
function subtitulo(m) {
  const t = m.tipo === 'entrada' ? 'Entrada' : 'Saída'
  if (m.motivo === 'liberacao' && m.setor?.nome) return `${t} · Liberação → ${m.setor.nome}`
  return `${t} · ${motivoLabel(m.motivo)}`
}
function ehAvariado(m) {
  return m.tipo === 'saida' && m.motivo === 'avariado'
}

onMounted(carregar)
</script>

<template>
  <div class="page-head">
    <h1>Dashboard</h1>
  </div>

  <div class="cards">
    <div class="metric">
      <div class="metric-top">
        <span class="metric-chip info"><i class="pi pi-box" /></span>
        <span class="metric-label">Itens cadastrados</span>
      </div>
      <div class="value">{{ totalItens }}</div>
      <div class="empty">Produtos ativos na farmácia central</div>
    </div>

    <div class="metric">
      <div class="metric-top">
        <span class="metric-chip danger"><i class="pi pi-exclamation-triangle" /></span>
        <span class="metric-label">Estoque crítico</span>
      </div>
      <div class="value" style="color: var(--samu-red)">{{ criticos.length }}</div>
      <div v-if="criticos.length" class="list">
        <div v-for="(c, i) in criticos.slice(0, 4)" :key="i" class="row">
          <span>{{ c.nome }}</span>
          <Tag :value="`saldo ${c.saldo}`" severity="danger" />
        </div>
      </div>
      <div v-else class="empty">Nenhum item abaixo do mínimo. 👍</div>
    </div>

    <div class="metric">
      <div class="metric-top">
        <span class="metric-chip warn"><i class="pi pi-hourglass" /></span>
        <span class="metric-label">Vencendo (60 dias)</span>
      </div>
      <div class="value" style="color: var(--samu-orange)">{{ vencendo.length }}</div>
      <div v-if="vencendo.length" class="list">
        <div v-for="(v, i) in vencendo.slice(0, 4)" :key="i" class="row">
          <span>{{ v.produto }}</span>
          <Tag :value="dias(v.validade) < 0 ? 'vencido' : dias(v.validade) + ' dias'" :severity="dias(v.validade) < 0 ? 'danger' : 'warn'" />
        </div>
      </div>
      <div v-else class="empty">Nenhum lote vencendo em breve.</div>
    </div>
  </div>

  <div class="card-panel">
    <div class="panel-head">
      <h2>Movimentações recentes</h2>
      <RouterLink class="ver-todas" :to="{ name: 'movimentacoes' }">
        Ver todas <i class="pi pi-arrow-right" />
      </RouterLink>
    </div>

    <div v-if="recentes.length" class="feed">
      <div v-for="(m, i) in recentes" :key="i" class="feed-row">
        <span class="feed-chip" :class="m.tipo === 'entrada' ? 'in' : 'out'">
          <i
            :class="
              m.tipo === 'entrada'
                ? 'pi pi-arrow-down-left'
                : ehAvariado(m)
                ? 'pi pi-exclamation-triangle'
                : 'pi pi-arrow-up-right'
            "
          />
        </span>
        <div class="feed-main">
          <div class="feed-title">
            {{ m.produto?.nome || '—' }}
            <span v-if="m.produto?.controlado" class="pill-controlado">controlado</span>
          </div>
          <div class="feed-sub">
            {{ subtitulo(m) }}
            <span class="feed-autor"><i class="pi pi-user" /> {{ autor(m) }}</span>
          </div>
        </div>
        <div class="feed-right">
          <div class="feed-qty" :class="m.tipo === 'entrada' ? 'in' : 'out'">
            {{ m.tipo === 'entrada' ? '+' : '−' }}{{ m.quantidade }}
          </div>
          <div class="feed-time">{{ tempoRelativo(m.data) }}</div>
        </div>
      </div>
    </div>
    <div v-else class="empty" style="padding: 0.5rem 0">Nenhuma movimentação registrada ainda.</div>
  </div>
</template>
