<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { FolderMinusIcon } from '@heroicons/vue/24/outline';
import RadioButton from 'primevue/radiobutton';
import { AppDialog, getErrorMessage } from '@gitiempo/web-shared';
import { adminInvoicesClient } from '@/services/admin-invoices-client';

const props = defineProps<{
  scope: unknown;
  query?: unknown;
  rows: Array<{ id: string; groupId?: string | null }>;
  groups: Array<{ id: string; name: string }>;
}>();
const selection = defineModel<string[]>('selection', { default: () => [] });
const emit = defineEmits<{ moved: [] }>();
const targets = ref<string[]>([]);
const visible = ref(false);
const search = ref('');
const destination = ref<string>();
const ungrouped = 'ungrouped';
const selectedSources = computed(() => sourceGroups(selection.value));
const currentDestination = computed(() => {
  const sources = sourceGroups(targets.value);
  return sources.size === 1 ? [...sources][0] : undefined;
});
const options = computed(() =>
  [{ id: ungrouped, name: 'Ungrouped' }, ...props.groups]
    .filter(group => group.name.toLowerCase().includes(search.value.trim().toLowerCase())),
);
const busy = ref(false);
const error = ref('');
let generation = 0;

function sourceGroups(ids: string[]) {
  const selected = new Set(ids);
  return new Set(props.rows.filter(row => selected.has(row.id)).map(row => row.groupId ?? ungrouped));
}
watch(() => [props.scope, props.query], () => {
  generation++;
  busy.value = false;
  visible.value = false;
  error.value = '';
  targets.value = [];
}, { deep: true, flush: 'sync' });

function open(ids = selection.value) {
  if (busy.value || !ids.length) return;
  targets.value = [...ids];
  destination.value = undefined;
  error.value = '';
  search.value = '';
  visible.value = true;
}
defineExpose({ open });

async function move(ids: string[], target: string) {
  if (busy.value || !ids.length) return;
  const requestGeneration = generation;
  const requestScope = props.scope;
  busy.value = true;
  error.value = '';
  try {
    await adminInvoicesClient.moveInvoices({ invoiceIds: ids, groupId: target === ungrouped ? null : target });
    if (requestScope !== props.scope) return;
    emit('moved');
    if (requestGeneration !== generation) return;
    visible.value = false;
    const moved = new Set(ids);
    selection.value = selection.value.filter(id => !moved.has(id));
  } catch (cause) {
    if (requestGeneration === generation) error.value = getErrorMessage(cause);
  } finally {
    if (requestGeneration === generation) busy.value = false;
  }
}
</script>

<template>
  <div
    v-if="selection.length"
    class="bg-accent-tint mb-3 flex min-h-11 items-center gap-3 rounded-sm px-3 sm:mb-4 sm:min-h-[46px]"
    aria-label="Selected invoices"
  >
    <span class="flex-1 text-[13px] font-medium text-brand">{{ selection.length }} selected</span>
    <Button
      aria-label="Move to group"
      class="h-[38px] text-[13px]"
      severity="secondary"
      outlined
      :disabled="busy"
      @click="open()"
    >
      <i
        class="pi pi-folder-open"
        aria-hidden="true"
      />
      <span class="sm:hidden">Move</span><span class="hidden sm:inline">Move to group</span>
    </Button>
    <Button
      class="hidden h-[38px] text-[13px] sm:flex"
      label="Remove from group"
      severity="secondary"
      outlined
      :disabled="!selectedSources.size || (selectedSources.size === 1 && selectedSources.has(ungrouped))"
      :loading="busy && !visible"
      @click="move([...selection], ungrouped)"
    >
      <template #icon>
        <FolderMinusIcon
          class="size-4"
          aria-hidden="true"
        />
      </template>
    </Button>
  </div>
  <p
    v-if="error && !visible"
    role="alert"
    class="text-destructive"
  >
    {{ error }}
  </p>
  <AppDialog
    v-model:visible="visible"
    :header="`Move ${targets.length} invoice${targets.length === 1 ? '' : 's'}`"
    modal
    :closable="!busy"
    :close-on-escape="!busy"
    :style="{ width: 'min(420px, calc(100vw - 2rem))' }"
    :pt="{header:'px-5 pt-5',content:'px-5 py-4',footer:'px-5 pb-5'}"
  >
    <div class="flex flex-col gap-4">
      <p class="text-text-muted text-sm">
        Choose one of your personal groups. This does not affect other users.
      </p>
      <InputText
        v-model="search"
        aria-label="Search groups"
        placeholder="Search groups"
        class="h-[38px] w-full"
      />
      <div
        class="flex flex-col gap-2"
        role="radiogroup"
        aria-label="Destination group"
      >
        <label
          v-for="group in options"
          :key="group.id"
          class="border-divider flex min-h-[42px] cursor-pointer items-center gap-3 rounded-md border px-2.5 text-sm"
          :class="{ 'bg-accent-tint': destination === group.id }"
        >
          <RadioButton
            v-model="destination"
            :value="group.id"
            name="move-destination"
            :disabled="busy || currentDestination === group.id"
          />
          {{ group.name }}{{ currentDestination === group.id ? ' · Current' : '' }}
        </label>
        <p
          v-if="!options.length"
          class="text-text-muted text-sm"
        >
          No matching groups.
        </p>
      </div>
      <p
        v-if="error"
        role="alert"
        class="text-destructive"
      >
        {{ error }}
      </p>
    </div>
    <template #footer>
      <Button
        :label="targets.length === 1 ? 'Move invoice' : 'Move invoices'"
        :loading="busy"
        :disabled="!destination || destination === currentDestination"
        @click="destination && move([...targets], destination)"
      />
    </template>
  </AppDialog>
</template>
