<script setup>
import { computed } from 'vue'
import Select from 'primevue/select'
import Button from 'primevue/button'

// Paginador padrão do sistema (v-model:first + v-model:rows).
const props = defineProps({
  first: { type: Number, default: 0 },
  rows: { type: Number, default: 25 },
  total: { type: Number, default: 0 },
  rowsOptions: { type: Array, default: () => [25, 50, 100] },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:first', 'update:rows'])

const primeiro = computed(() => (props.total === 0 ? 0 : props.first + 1))
const ultimo = computed(() => Math.min(props.first + props.rows, props.total))
const temAnterior = computed(() => props.first > 0)
const temProximo = computed(() => ultimo.value < props.total)

function anterior() {
  emit('update:first', Math.max(0, props.first - props.rows))
}
function proximo() {
  emit('update:first', props.first + props.rows)
}
function mudarTamanho(v) {
  emit('update:rows', v)
  emit('update:first', 0)
}
</script>

<template>
  <div v-if="total" class="pager">
    <span class="pager-info">{{ primeiro }}–{{ ultimo }} de {{ total }}</span>
    <div class="pager-ctrl">
      <span class="pager-lbl">por página</span>
      <Select
        :model-value="rows"
        :options="rowsOptions"
        style="width: 5.5rem"
        @update:model-value="mudarTamanho"
      />
      <Button icon="pi pi-angle-left" text rounded severity="secondary" :disabled="!temAnterior || disabled" @click="anterior" />
      <Button icon="pi pi-angle-right" text rounded severity="secondary" :disabled="!temProximo || disabled" @click="proximo" />
    </div>
  </div>
</template>

<style scoped>
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
}
.pager-info {
  color: var(--text-muted);
  font-size: 0.85rem;
}
.pager-ctrl {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.pager-lbl {
  color: var(--text-muted);
  font-size: 0.85rem;
}
</style>
