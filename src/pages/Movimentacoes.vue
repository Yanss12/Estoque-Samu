<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import { supabase } from '../lib/supabase'
import { motivoLabel } from '../lib/movimentacoes'
import { fetchPerfisMap } from '../lib/perfis'

const toast = useToast()
const movs = ref([])
const perfisMap = ref({})
const carregando = ref(false)
const busca = ref('')
const tipoFiltro = ref(null)
const tipoOpcoes = [
  { label: 'Entrada', value: 'entrada' },
  { label: 'Saída', value: 'saida' },
]

const filtradas = computed(() =>
  movs.value.filter((m) => {
    if (tipoFiltro.value && m.tipo !== tipoFiltro.value) return false
    if (busca.value && !(m.produto?.nome ?? '').toLowerCase().includes(busca.value.toLowerCase())) return false
    return true
  })
)

async function carregar() {
  carregando.value = true
  const [movsRes, perfis] = await Promise.all([
    supabase
      .from('movimentacoes')
      .select('id, tipo, quantidade, motivo, data, usuario_id, produto:produtos(nome, controlado), setor:setores(nome), lote:lotes(numero_lote)')
      .order('data', { ascending: false })
      .limit(500),
    fetchPerfisMap(),
  ])
  if (movsRes.error) toast.add({ severity: 'error', summary: 'Erro', detail: movsRes.error.message, life: 6000 })
  else movs.value = movsRes.data ?? []
  perfisMap.value = perfis
  carregando.value = false
}

function autor(m) {
  return perfisMap.value[m.usuario_id] || 'usuário removido'
}

function subtitulo(m) {
  const t = m.tipo === 'entrada' ? 'Entrada' : 'Saída'
  let s =
    m.motivo === 'liberacao' && m.setor?.nome
      ? `${t} · Liberação → ${m.setor.nome}`
      : `${t} · ${motivoLabel(m.motivo)}`
  if (m.lote?.numero_lote) s += ` · lote ${m.lote.numero_lote}`
  return s
}
function ehAvariado(m) {
  return m.tipo === 'saida' && m.motivo === 'avariado'
}
function fmt(d) {
  return d
    ? new Date(d).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'
}

onMounted(carregar)
</script>

<template>
  <div class="page-head">
    <h1>Movimentações</h1>
    <span style="color: var(--text-muted); font-size: 0.9rem">Trilha de auditoria — entradas e saídas</span>
  </div>

  <div class="toolbar">
    <IconField class="grow">
      <InputIcon class="pi pi-search" />
      <InputText v-model="busca" placeholder="Buscar por produto..." class="full" />
    </IconField>
    <Select v-model="tipoFiltro" :options="tipoOpcoes" option-label="label" option-value="value" placeholder="Tipo" show-clear style="min-width: 10rem" />
  </div>

  <div class="card-panel">
    <div v-if="filtradas.length" class="feed">
      <div v-for="m in filtradas" :key="m.id" class="feed-row">
        <span class="feed-chip" :class="m.tipo === 'entrada' ? 'in' : 'out'">
          <i :class="m.tipo === 'entrada' ? 'pi pi-arrow-down-left' : ehAvariado(m) ? 'pi pi-exclamation-triangle' : 'pi pi-arrow-up-right'" />
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
          <div class="feed-time">{{ fmt(m.data) }}</div>
        </div>
      </div>
    </div>
    <div v-else class="empty" style="padding: 0.5rem 0">
      {{ carregando ? 'Carregando...' : 'Nenhuma movimentação registrada ainda.' }}
    </div>
  </div>
</template>
