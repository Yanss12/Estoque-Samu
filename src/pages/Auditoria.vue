<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Dialog from 'primevue/dialog'
import AuditoriaContagem from '../components/AuditoriaContagem.vue'
import { supabase } from '../lib/supabase'
import { user } from '../lib/auth'
import { mensagemErro } from '../lib/format'

const toast = useToast()
const confirm = useConfirm()
const auditorias = ref([])
const carregando = ref(false)
const selecionada = ref(null)

const abrirVisivel = ref(false)
const perfis = ref([])
const apoioId = ref(null)
const abrindo = ref(false)

const temAberta = computed(() => auditorias.value.some((a) => a.status === 'aberta'))

async function carregar() {
  carregando.value = true
  const { data, error } = await supabase.from('auditorias_resumo').select('*').order('competencia', { ascending: false }).order('aberta_em', { ascending: false })
  carregando.value = false
  if (error) return toast.add({ severity: 'error', summary: 'Erro ao carregar auditorias', detail: mensagemErro(error), life: 6000 })
  auditorias.value = data ?? []
  // mantém a auditoria aberta na tela sincronizada com os contadores
  if (selecionada.value) selecionada.value = auditorias.value.find((a) => a.auditoria_id === selecionada.value.auditoria_id) ?? null
}

async function prepararAbertura() {
  apoioId.value = null
  abrirVisivel.value = true
  const { data } = await supabase.from('perfis').select('id, nome').order('nome')
  perfis.value = (data ?? []).filter((p) => p.id !== user.value?.id)
}

function confirmarAbertura() {
  confirm.require({
    header: 'Abrir auditoria',
    message: 'Será aberta a auditoria do mês corrente com todos os produtos/lotes que têm saldo. Só pode haver uma aberta por vez.',
    icon: 'pi pi-question-circle',
    acceptLabel: 'Abrir',
    rejectLabel: 'Cancelar',
    accept: abrir,
  })
}

async function abrir() {
  abrindo.value = true
  const { data, error } = await supabase.rpc('abrir_auditoria', { p_competencia: null, p_apoio: apoioId.value, p_observacao: null })
  abrindo.value = false
  if (error) return toast.add({ severity: 'error', summary: 'Não foi possível abrir', detail: mensagemErro(error), life: 7000 })
  abrirVisivel.value = false
  await carregar()
  selecionada.value = auditorias.value.find((a) => a.auditoria_id === data) ?? null
}

function mes(d) {
  return new Date(d + 'T00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

onMounted(carregar)
</script>

<template>
  <AuditoriaContagem v-if="selecionada" :auditoria="selecionada" @voltar="selecionada = null; carregar()" @changed="carregar" />

  <template v-else>
    <div class="page-head">
      <div>
        <h1>Auditoria</h1>
        <p class="page-sub">Batida mensal de estoque por produto e lote</p>
      </div>
      <div class="page-acoes">
        <Button label="Abrir auditoria" icon="pi pi-plus" :disabled="temAberta" :title="temAberta ? 'Finalize a auditoria aberta antes' : null" @click="prepararAbertura" />
      </div>
    </div>

    <div class="card-panel tabela">
      <DataTable :value="auditorias" :loading="carregando" data-key="auditoria_id" paginator :rows="15" size="small" class="tabela-moderna">
        <template #empty>Nenhuma auditoria realizada.</template>
        <Column field="competencia" header="Competência"><template #body="{ data }"><span class="prod-nome">{{ mes(data.competencia) }}</span></template></Column>
        <Column field="status" header="Situação" style="width: 9rem"><template #body="{ data }">{{ data.status === 'aberta' ? 'Aberta' : 'Finalizada' }}</template></Column>
        <Column header="Contados" style="width: 8rem" header-class="col-num col-opc" body-class="col-num col-opc"><template #body="{ data }"><span class="num">{{ data.contados }}/{{ data.itens }}</span></template></Column>
        <Column field="divergentes" header="Diverg." style="width: 7rem" header-class="col-num col-opc" body-class="col-num col-opc"><template #body="{ data }"><span class="num">{{ data.divergentes }}</span></template></Column>
        <Column field="aberta_por_nome" header="Aberta por" header-class="col-opc" body-class="col-opc" />
        <Column style="width: 8rem" header-class="col-num">
          <template #header><span class="sr-only">Ações</span></template>
          <template #body="{ data }">
            <Button :label="data.status === 'aberta' ? 'Contar' : 'Ver'" size="small" severity="secondary" outlined @click="selecionada = data" />
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="abrirVisivel" modal header="Abrir auditoria" :style="{ width: '26rem' }" :breakpoints="{ '640px': '95vw' }">
      <div class="field">
        <label for="aud-apoio">Responsável de apoio <span class="opc">(opcional)</span></label>
        <Select v-model="apoioId" input-id="aud-apoio" :options="perfis" option-label="nome" option-value="id" show-clear filter placeholder="Segundo responsável" class="full" />
      </div>
      <template #footer>
        <Button label="Cancelar" text severity="secondary" @click="abrirVisivel = false" />
        <Button label="Abrir" icon="pi pi-check" :loading="abrindo" @click="confirmarAbertura" />
      </template>
    </Dialog>
  </template>
</template>
