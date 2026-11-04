<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'
import AlmoxInventarioContagem from '../../components/almox/AlmoxInventarioContagem.vue'
import { almoxGerir } from '../../lib/auth'
import { almoxSelectView, almoxRpc, mensagemErroAlmox, fmtDataHora } from '../../lib/almox'

const toast = useToast()
const inventarios = ref([])
const carregando = ref(false)
const selecionado = ref(null)

const abrirVisivel = ref(false)
const descricao = ref('')
const abrindo = ref(false)

const inventarioAberto = computed(
  () => inventarios.value.find((i) => i.status === 'aberto') ?? null
)
const temAberto = computed(() => Boolean(inventarioAberto.value))

async function carregar() {
  carregando.value = true
  const { data, error } = await almoxSelectView('almox_inventarios_resumo', {
    order: { column: 'aberto_em', ascending: false },
  })
  carregando.value = false
  if (error) {
    toast.add({
      severity: 'error',
      summary: 'Erro ao carregar inventários',
      detail: mensagemErroAlmox(error),
      life: 6000,
    })
    return
  }
  inventarios.value = data ?? []
  if (selecionado.value) {
    selecionado.value =
      inventarios.value.find((i) => i.inventario_id === selecionado.value.inventario_id) ?? null
  }
}

function sugerirDescricaoPadrao() {
  const mesAno = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const cap = mesAno.charAt(0).toUpperCase() + mesAno.slice(1)
  return `Inventário — ${cap}`
}

function prepararAbertura() {
  if (!almoxGerir.value || temAberto.value) return
  descricao.value = sugerirDescricaoPadrao()
  abrirVisivel.value = true
}

async function abrir() {
  if (!almoxGerir.value) return
  abrindo.value = true
  const { data, error } = await almoxRpc('almox_abrir_inventario', {
    p_descricao: descricao.value?.trim() || null,
  })
  abrindo.value = false
  if (error) {
    toast.add({
      severity: 'error',
      summary: 'Não foi possível abrir o inventário',
      detail: mensagemErroAlmox(error),
      life: 7000,
    })
    return
  }
  toast.add({
    severity: 'success',
    summary: 'Inventário aberto',
    life: 3500,
  })
  abrirVisivel.value = false
  await carregar()
  selecionado.value = inventarios.value.find((i) => i.inventario_id === data) ?? inventarioAberto.value
}

onMounted(carregar)
</script>

<template>
  <AlmoxInventarioContagem
    v-if="selecionado"
    :inventario="selecionado"
    @voltar="selecionado = null; carregar()"
    @changed="carregar"
  />

  <template v-else>
    <div class="page-head">
      <div>
        <h1>Inventário</h1>
        <p class="page-sub">Conferência física de estoque por produto e lote no Almoxarifado</p>
      </div>
      <div v-if="almoxGerir" class="page-acoes">
        <Button
          label="Abrir inventário"
          icon="pi pi-plus"
          :disabled="temAberto"
          :title="temAberto ? 'Finalize o inventário aberto antes de abrir outro' : null"
          @click="prepararAbertura"
        />
      </div>
    </div>

    <!-- Banner de estado do inventário atual (seção 8.5) -->
    <div v-if="!carregando && !temAberto" class="card-panel" style="margin-bottom: 1rem">
      <div
        style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        "
      >
        <div>
          <div class="prod-nome">Nenhum inventário aberto.</div>
          <div class="muted" style="font-size: 0.84rem">
            {{
              almoxGerir
                ? 'Abra um novo inventário para iniciar a conferência física dos produtos e lotes com saldo.'
                : 'Não há conferência física em andamento no momento.'
            }}
          </div>
        </div>
        <Button
          v-if="almoxGerir"
          label="Abrir inventário"
          icon="pi pi-plus"
          size="small"
          @click="prepararAbertura"
        />
      </div>
    </div>

    <div v-else-if="inventarioAberto" class="card-panel" style="margin-bottom: 1rem">
      <div
        style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        "
      >
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem">
            <span class="cat-badge">Em andamento</span>
            <span class="prod-nome">
              {{ inventarioAberto.descricao || `Inventário #${inventarioAberto.inventario_id}` }}
            </span>
          </div>
          <div class="muted" style="font-size: 0.84rem; margin-top: 0.25rem">
            Aberto em {{ fmtDataHora(inventarioAberto.aberto_em) }} por
            {{ inventarioAberto.aberto_por_nome || '—' }} ·
            <strong>{{ inventarioAberto.contados }}/{{ inventarioAberto.itens }}</strong> contados ·
            <strong>{{ inventarioAberto.divergentes }}</strong> divergente(s)
          </div>
        </div>
        <Button
          :label="almoxGerir ? 'Continuar contagem' : 'Ver inventário aberto'"
          icon="pi pi-arrow-right"
          size="small"
          @click="selecionado = inventarioAberto"
        />
      </div>
    </div>

    <div class="card-panel tabela">
      <DataTable
        :value="inventarios"
        :loading="carregando"
        data-key="inventario_id"
        paginator
        :rows="15"
        size="small"
        class="tabela-moderna"
      >
        <template #empty>Nenhum inventário registrado.</template>

        <Column field="descricao" header="Inventário">
          <template #body="{ data }">
            <div>
              <span class="prod-nome">
                {{ data.descricao || `Inventário #${data.inventario_id}` }}
              </span>
            </div>
            <div v-if="data.observacao" class="muted" style="font-size: 0.78rem">
              {{ data.observacao }}
            </div>
          </template>
        </Column>

        <Column field="status" header="Situação" style="width: 8.5rem">
          <template #body="{ data }">
            <span class="cat-badge">
              {{ data.status === 'aberto' ? 'Aberto' : 'Finalizado' }}
            </span>
          </template>
        </Column>

        <Column
          header="Contados"
          style="width: 7.5rem"
          header-class="col-num col-opc"
          body-class="col-num col-opc"
        >
          <template #body="{ data }">
            <span class="num">{{ data.contados }}/{{ data.itens }}</span>
          </template>
        </Column>

        <Column
          field="divergentes"
          header="Diverg."
          style="width: 8rem"
          header-class="col-num col-opc"
          body-class="col-num col-opc"
        >
          <template #body="{ data }">
            <span class="num">{{ data.divergentes }}</span>
            <small v-if="data.ajustados > 0" class="muted"> ({{ data.ajustados }} ajust.)</small>
          </template>
        </Column>

        <Column
          field="aberto_em"
          header="Abertura"
          style="width: 12rem"
          header-class="col-opc"
          body-class="col-opc"
        >
          <template #body="{ data }">
            <div>{{ fmtDataHora(data.aberto_em) }}</div>
            <small class="muted">{{ data.aberto_por_nome || '—' }}</small>
          </template>
        </Column>

        <Column
          field="finalizado_em"
          header="Encerramento"
          style="width: 12rem"
          header-class="col-opc"
          body-class="col-opc"
        >
          <template #body="{ data }">
            <template v-if="data.finalizado_em">
              <div>{{ fmtDataHora(data.finalizado_em) }}</div>
              <small class="muted">{{ data.finalizado_por_nome || '—' }}</small>
            </template>
            <span v-else class="muted">—</span>
          </template>
        </Column>

        <Column style="width: 7.5rem" header-class="col-num" body-class="col-num">
          <template #header><span class="sr-only">Ações</span></template>
          <template #body="{ data }">
            <Button
              :label="data.status === 'aberto' && almoxGerir ? 'Contar' : 'Ver'"
              size="small"
              severity="secondary"
              outlined
              @click="selecionado = data"
            />
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog
      v-model:visible="abrirVisivel"
      modal
      header="Abrir inventário no Almoxarifado"
      :style="{ width: '28rem' }"
      :breakpoints="{ '640px': '95vw' }"
    >
      <form id="almox-abrir-inv-form" @submit.prevent="abrir">
        <div class="field">
          <label for="almox-inv-desc">Descrição <span class="opc">(opcional)</span></label>
          <InputText
            id="almox-inv-desc"
            v-model="descricao"
            placeholder="Ex.: Inventário mensal — Novembro/2026"
            class="full"
          />
          <small>
            Serão pré-carregados todos os produtos e lotes ativos que possuem saldo maior que zero no Almoxarifado. Só pode haver um inventário aberto por vez.
          </small>
        </div>
      </form>
      <template #footer>
        <Button
          label="Cancelar"
          text
          severity="secondary"
          :disabled="abrindo"
          @click="abrirVisivel = false"
        />
        <Button
          type="submit"
          form="almox-abrir-inv-form"
          label="Abrir inventário"
          icon="pi pi-check"
          :loading="abrindo"
        />
      </template>
    </Dialog>
  </template>
</template>
