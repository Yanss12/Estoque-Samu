<script setup>
import { ref, computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import SelectButton from 'primevue/selectbutton'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import ToggleSwitch from 'primevue/toggleswitch'
import Button from 'primevue/button'
import { CATEGORIAS, catLabel } from '../../lib/categorias'
import {
  almoxRpc,
  almoxListarCatalogoGeral,
  codigoErroAlmox,
  mensagemErroAlmox,
} from '../../lib/almox'

const props = defineProps({
  visible: { type: Boolean, default: false },
  produto: { type: Object, default: null }, // Linha de almox_saldo_produto quando edição
  idsJaVinculados: { type: Array, default: () => [] }, // produto_id já presentes em almox_produtos
})
const emit = defineEmits(['update:visible', 'saved'])

const toast = useToast()
const salvando = ref(false)
const catalogo = ref([])
const modoCadastro = ref('vincular') // 'vincular' | 'novo'

const modoOpcoes = [
  { label: 'Vincular existente', value: 'vincular' },
  { label: 'Novo item', value: 'novo' },
]

const unidadeOpcoes = [
  'Unidade',
  'Comprimido',
  'Ampola',
  'Frasco',
  'Cartela',
  'Par',
  'Bisnaga',
  'Pacote',
  'Rolo',
  'Caixa',
  'Caixa c/ 100',
  'Pote',
  'Dúzia',
  'Galão',
  'Kit',
]

const ehEdicao = computed(() => !!props.produto)
const saldoAtual = computed(() => Number(props.produto?.saldo ?? 0))
const naoPodeDesativar = computed(() => ehEdicao.value && props.produto?.ativo && saldoAtual.value > 0)

const form = ref(novoForm())

function novoForm() {
  return {
    produto_id: null,
    nome: '',
    categoria: 'medicamento',
    unidade_medida: 'Unidade',
    controlado: false,
    codigo_interno: '',
    estoque_minimo: 0,
    localizacao: '',
    observacao: '',
    ativo: true,
  }
}

const ehPsico = computed(() => form.value.categoria === 'psicotropico')

const opcoesVincular = computed(() => {
  const jaTem = new Set((props.idsJaVinculados || []).map(Number))
  return catalogo.value.filter((p) => !jaTem.has(Number(p.id)))
})

const itemCatalogoSelecionado = computed(() =>
  catalogo.value.find((p) => Number(p.id) === Number(form.value.produto_id)) ?? null
)

watch(
  () => props.visible,
  async (aberto) => {
    if (!aberto) return
    if (props.produto) {
      form.value = {
        produto_id: props.produto.produto_id,
        nome: props.produto.nome || '',
        categoria: props.produto.categoria || 'medicamento',
        unidade_medida: props.produto.unidade_medida || 'Unidade',
        controlado: Boolean(props.produto.controlado),
        codigo_interno: props.produto.codigo_interno || '',
        estoque_minimo: Number(props.produto.estoque_minimo ?? 0),
        localizacao: props.produto.localizacao || '',
        observacao: props.produto.observacao || '',
        ativo: props.produto.ativo !== false,
      }
    } else {
      form.value = novoForm()
      const { data } = await almoxListarCatalogoGeral()
      catalogo.value = data ?? []
      modoCadastro.value = opcoesVincular.value.length > 0 ? 'vincular' : 'novo'
    }
  }
)

watch(
  () => form.value.categoria,
  (cat) => {
    if (cat === 'psicotropico') form.value.controlado = true
  }
)

function fechar() {
  emit('update:visible', false)
}

async function salvar() {
  const f = form.value
  if (ehEdicao.value) {
    salvando.value = true
    try {
      const payload = {
        codigo_interno: f.codigo_interno?.trim() ? f.codigo_interno.trim().toUpperCase() : null,
        estoque_minimo: Number(f.estoque_minimo ?? 0),
        localizacao: f.localizacao?.trim() || null,
        observacao: f.observacao?.trim() || null,
        ativo: Boolean(f.ativo),
      }
      const { error } = await almoxRpc('almox_atualizar_produto', {
        p_produto_id: f.produto_id,
        p_dados: payload,
      })
      if (error) throw error
      toast.add({
        severity: 'success',
        summary: 'Produto atualizado no Almoxarifado',
        detail: f.nome,
        life: 4000,
      })
      emit('saved')
      fechar()
    } catch (err) {
      toast.add({
        severity: 'error',
        summary: 'Não foi possível atualizar',
        detail: mensagemErroAlmox(err),
        life: 6000,
      })
    } finally {
      salvando.value = false
    }
    return
  }

  // Modo criação (vincular existente ou cadastrar novo item)
  if (modoCadastro.value === 'vincular') {
    if (!f.produto_id) {
      toast.add({
        severity: 'warn',
        summary: 'Selecione um produto',
        detail: 'Escolha um item existente do catálogo ou mude para a aba "Novo item".',
        life: 4000,
      })
      return
    }
  } else {
    if (!f.nome?.trim() || !f.categoria || !f.unidade_medida?.trim()) {
      toast.add({
        severity: 'warn',
        summary: 'Faltam dados obrigatórios',
        detail: 'Preencha nome, categoria e unidade de medida.',
        life: 4000,
      })
      return
    }
  }

  salvando.value = true
  try {
    const p_dados =
      modoCadastro.value === 'vincular'
        ? {
            produto_id: f.produto_id,
            codigo_interno: f.codigo_interno?.trim() ? f.codigo_interno.trim().toUpperCase() : null,
            estoque_minimo: Number(f.estoque_minimo ?? 0),
            localizacao: f.localizacao?.trim() || null,
            observacao: f.observacao?.trim() || null,
          }
        : {
            produto_id: null,
            nome: f.nome.trim(),
            categoria: f.categoria,
            unidade_medida: f.unidade_medida.trim(),
            controlado: f.categoria === 'psicotropico' ? true : Boolean(f.controlado),
            codigo_interno: f.codigo_interno?.trim() ? f.codigo_interno.trim().toUpperCase() : null,
            estoque_minimo: Number(f.estoque_minimo ?? 0),
            localizacao: f.localizacao?.trim() || null,
            observacao: f.observacao?.trim() || null,
          }

    const { error } = await almoxRpc('almox_cadastrar_produto', { p_dados })
    if (error) throw error

    const nomeItem =
      modoCadastro.value === 'vincular'
        ? itemCatalogoSelecionado.value?.nome || 'Produto vinculado'
        : f.nome.trim()

    toast.add({
      severity: 'success',
      summary: modoCadastro.value === 'vincular' ? 'Produto vinculado ao Almoxarifado' : 'Produto cadastrado',
      detail: nomeItem,
      life: 4000,
    })
    emit('saved')
    fechar()
  } catch (err) {
    const cod = codigoErroAlmox(err)
    if (cod === 'ALMOX_PRODUTO_DUPLICADO') {
      toast.add({
        severity: 'warn',
        summary: 'Nome já existe no catálogo',
        detail: 'Este item já existe no catálogo compartilhado. Use a aba "Vincular existente".',
        life: 6000,
      })
      modoCadastro.value = 'vincular'
    } else {
      toast.add({
        severity: 'error',
        summary: 'Erro ao cadastrar produto',
        detail: mensagemErroAlmox(err),
        life: 6000,
      })
    }
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    modal
    :header="ehEdicao ? 'Configurar produto no Almoxarifado' : 'Novo produto no Almoxarifado'"
    :style="{ width: '36rem' }"
    :breakpoints="{ '640px': '95vw' }"
  >
    <form id="almox-prod-form" @submit.prevent="salvar">
      <!-- Seleção de modo na criação -->
      <div v-if="!ehEdicao" class="field">
        <label>Origem do cadastro</label>
        <SelectButton
          v-model="modoCadastro"
          :options="modoOpcoes"
          :allow-empty="false"
          option-label="label"
          option-value="value"
          aria-label="Modo de cadastro de produto"
          size="small"
        />
      </div>

      <!-- Modo 1: Vincular item existente do catálogo -->
      <template v-if="!ehEdicao && modoCadastro === 'vincular'">
        <div class="field">
          <label for="almox-vincular-prod">Produto do catálogo compartilhado</label>
          <Select
            v-model="form.produto_id"
            input-id="almox-vincular-prod"
            :options="opcoesVincular"
            option-label="nome"
            option-value="id"
            filter
            placeholder="Buscar produto existente no catálogo"
            aria-label="Produto do catálogo"
            class="full"
            autofocus
          />
          <small v-if="itemCatalogoSelecionado">
            Categoria: <strong>{{ catLabel(itemCatalogoSelecionado.categoria) }}</strong> · Unidade:
            <strong>{{ itemCatalogoSelecionado.unidade_medida }}</strong>
            <span v-if="itemCatalogoSelecionado.controlado" class="tag-controlado" style="margin-left: 0.4rem">
              Controlado
            </span>
          </small>
          <small v-else>
            Se o item ainda não existir no sistema, mude para <strong>Novo item</strong>.
          </small>
        </div>
      </template>

      <!-- Modo 2: Novo item no catálogo + Almoxarifado -->
      <template v-else-if="!ehEdicao && modoCadastro === 'novo'">
        <div class="field">
          <label for="almox-novo-nome">Nome do produto</label>
          <InputText
            id="almox-novo-nome"
            v-model="form.nome"
            class="full"
            placeholder="Ex.: Dipirona 500mg"
            autofocus
          />
          <small>
            O item novo passa a existir no catálogo compartilhado (aparece na Farmácia com saldo 0).
          </small>
        </div>

        <div class="linha-campos">
          <div class="field">
            <label for="almox-novo-cat">Categoria</label>
            <Select
              v-model="form.categoria"
              input-id="almox-novo-cat"
              :options="CATEGORIAS"
              option-label="label"
              option-value="value"
              aria-label="Categoria"
              class="full"
            />
          </div>
          <div class="field">
            <label for="almox-novo-unid">Unidade de medida</label>
            <Select
              v-model="form.unidade_medida"
              input-id="almox-novo-unid"
              :options="unidadeOpcoes"
              editable
              aria-label="Unidade de medida"
              class="full"
            />
          </div>
        </div>

        <div class="field">
          <label for="almox-novo-ctrl">Controlado (Portaria 344/98)</label>
          <ToggleSwitch v-model="form.controlado" input-id="almox-novo-ctrl" :disabled="ehPsico" />
          <small v-if="ehPsico">Categoria Controlado marca este campo automaticamente.</small>
        </div>
      </template>

      <!-- Modo Edição: dados compartilhados somente leitura -->
      <template v-else-if="ehEdicao">
        <div class="estorno-resumo" style="margin-bottom: 1rem">
          <div class="feed-title">
            {{ form.nome }}
            <span v-if="form.controlado" class="tag-controlado">Controlado</span>
          </div>
          <div class="feed-sub">
            {{ catLabel(form.categoria) }} · {{ form.unidade_medida }}
          </div>
          <div class="muted" style="font-size: 0.78rem; margin-top: 0.3rem">
            Nome, unidade e categoria são compartilhados — editar no catálogo (admin).
          </div>
        </div>
      </template>

      <!-- Campos próprios de almox_produtos -->
      <div class="linha-campos">
        <div class="field">
          <label for="almox-cod-interno">Código interno <span class="opc">(opcional)</span></label>
          <InputText
            id="almox-cod-interno"
            v-model="form.codigo_interno"
            class="full mono"
            placeholder="Ex.: MED-0123"
          />
        </div>
        <div class="field">
          <label for="almox-est-min">Estoque mínimo no Almoxarifado</label>
          <InputNumber
            v-model="form.estoque_minimo"
            input-id="almox-est-min"
            :min="0"
            show-buttons
            class="full"
          />
          <small>Quando o disponível ficar igual ou abaixo, entra em alerta crítico.</small>
        </div>
      </div>

      <div class="field">
        <label for="almox-localizacao">Localização física <span class="opc">(opcional, máx. 80)</span></label>
        <InputText
          id="almox-localizacao"
          v-model="form.localizacao"
          maxlength="80"
          class="full"
          placeholder="Ex.: Corredor B / Prateleira 3"
        />
      </div>

      <div class="field">
        <label for="almox-obs">Observação <span class="opc">(opcional)</span></label>
        <Textarea
          id="almox-obs"
          v-model="form.observacao"
          rows="2"
          auto-resize
          class="full"
          placeholder="Notas de armazenamento ou controle interno"
        />
      </div>

      <div v-if="ehEdicao" class="field" style="margin-bottom: 0">
        <label for="almox-ativo">Ativo no Almoxarifado</label>
        <ToggleSwitch v-model="form.ativo" input-id="almox-ativo" :disabled="naoPodeDesativar" />
        <small v-if="naoPodeDesativar">
          Possui {{ saldoAtual }} em estoque no Almoxarifado. Zere o saldo antes de desativar.
        </small>
        <small v-else>Desative para ocultar de novas entradas sem perder o histórico.</small>
      </div>
    </form>

    <template #footer>
      <Button label="Cancelar" text severity="secondary" :disabled="salvando" @click="fechar" />
      <Button
        type="submit"
        form="almox-prod-form"
        :label="ehEdicao ? 'Salvar alterações' : modoCadastro === 'vincular' ? 'Vincular produto' : 'Cadastrar produto'"
        :loading="salvando"
      />
    </template>
  </Dialog>
</template>
