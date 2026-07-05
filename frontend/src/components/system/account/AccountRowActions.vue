<script setup>
import { Pencil, Ban, Check } from 'lucide-vue-next'

defineProps({
  T: { type: Object, required: true },
  row: { type: Object, required: true },
})

const emit = defineEmits(['edit', 'activate', 'deactivate'])
</script>

<template>
  <div class="flex flex-wrap items-center justify-center gap-1.5">
    <button
      type="button"
      class="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-forena-700 hover:bg-slate-50"
      @click="emit('edit', row)"
    >
      <Pencil class="h-3 w-3" />
      {{ T.edit }}
    </button>
    <button
      type="button"
      class="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-35"
      :disabled="row.active"
      @click="emit('activate', row)"
    >
      <Check class="h-3 w-3" />
      {{ T.activate }}
    </button>
    <button
      type="button"
      class="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-35"
      :disabled="!row.active"
      @click="emit('deactivate', row)"
    >
      <Ban class="h-3 w-3" />
      {{ T.del }}
    </button>
  </div>
</template>
