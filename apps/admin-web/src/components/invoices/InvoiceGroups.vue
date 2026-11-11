<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { InvoiceGroupsResponse } from '@gitiempo/shared';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { AppDialog, getErrorMessage } from '@gitiempo/web-shared';
import { adminInvoicesClient } from '@/services/admin-invoices-client';

const props = defineProps<{
  scope: unknown;
  selectedGroup?: string | null;
  refreshToken?: number;
}>();
const emit = defineEmits<{
  select: [value: string | null];
  moved: [];
  loaded: [value: InvoiceGroupsResponse['groups']];
}>();
const emptyGroups = () => ({ groups: [], allCount: 0, ungroupedCount: 0 });
const groups = ref<InvoiceGroupsResponse>(emptyGroups());
const current = ref<string | null>(null);
watch(() => props.selectedGroup, (value) => { current.value = value ?? null; });
const loading = ref(false);
const loaded = ref(false);
const options = computed(() => [
  { id: null, name: 'All invoices', count: groups.value.allCount, icon: 'pi-copy' },
  { id: 'ungrouped', name: 'Ungrouped', count: groups.value.ungroupedCount, icon: 'pi-inbox' },
  ...groups.value.groups.map(group => ({ ...group, icon: 'pi-folder' })),
]);
const active = computed(() => options.value.find(group => group.id === current.value) ?? options.value[0]!);
const selectedPersonal = computed(() => groups.value.groups.find(group => group.id === current.value));
type DialogMode = 'create' | 'rename' | 'delete' | 'manage';
const mode = ref<DialogMode>('create');
const dialog = ref(false);
const name = ref('');
const target = ref<InvoiceGroupsResponse['groups'][number]>();
const heading = computed(() => {
  if (mode.value === 'delete') return `Delete “${target.value?.name}”?`;
  return { create: 'Create group', rename: 'Rename group', manage: 'Manage personal groups' }[mode.value];
});
const error = ref('');
const loadError = ref('');
const busy = ref(false);
let generation = 0;
let loadSequence = 0;

async function load() {
  const sequence = ++loadSequence;
  loading.value = true;
  try {
    const result = await adminInvoicesClient.listGroups();
    if (sequence !== loadSequence) return;
    groups.value = result;
    loaded.value = true;
    emit('loaded', result.groups);
    loadError.value = '';
  } catch (cause) {
    if (sequence === loadSequence) loadError.value = getErrorMessage(cause);
  } finally {
    if (sequence === loadSequence) loading.value = false;
  }
}
watch(() => props.scope, () => {
  generation++;
  dialog.value = false;
  current.value = null;
  groups.value = emptyGroups();
  loaded.value = false;
  loadError.value = '';
  busy.value = false;
  void load();
}, { immediate: true, deep: true });
watch(() => props.refreshToken, () => void load());

function select(value: string | null) {
  current.value = value;
  emit('select', value);
}
function open(next: DialogMode, group = selectedPersonal.value) {
  mode.value = next;
  target.value = group;
  name.value = next === 'rename' ? group?.name ?? '' : '';
  error.value = '';
  dialog.value = true;
}
async function submit() {
  if (busy.value || mode.value === 'manage') return;
  const requestGeneration = generation;
  const group = target.value;
  const trimmed = name.value.trim();
  const deleting = mode.value === 'delete';
  if (mode.value !== 'create' && !group) return;
  if (!deleting && !trimmed) {
    error.value = 'Group name is required.';
    return;
  }
  busy.value = true;
  error.value = '';
  try {
    let createdGroupId: string | undefined;
    if (deleting && group) await adminInvoicesClient.deleteGroup(group.id);
    else if (mode.value === 'rename' && group) await adminInvoicesClient.updateGroup(group.id, { name: trimmed });
    else createdGroupId = (await adminInvoicesClient.createGroup({ name: trimmed })).id;
    if (requestGeneration !== generation) return;
    dialog.value = false;
    if (createdGroupId) select(createdGroupId);
    if (deleting) {
      if (group?.id === current.value) select(null);
      emit('moved');
    } else {
      await load();
    }
  } catch (cause) {
    if (requestGeneration === generation) {
      const message = getErrorMessage(cause);
      error.value = message === 'A group with this name already exists' ? 'You already have a group with this name.' : message;
    }
  } finally {
    if (requestGeneration === generation) busy.value = false;
  }
}
</script>

<template>
  <section class="sm:border-divider sm:bg-surface-primary flex min-w-0 flex-col gap-2 sm:rounded-lg sm:border sm:p-3">
    <div class="flex items-center gap-2">
      <h2 class="flex-1 text-base font-semibold">
        My groups
      </h2>
      <Button
        aria-label="Create group"
        icon="pi pi-plus"
        class="h-[38px] w-[38px] shrink-0"
        severity="secondary"
        outlined
        @click="open('create')"
      />
      <Button
        class="sm:hidden"
        aria-label="Manage personal groups"
        icon="pi pi-ellipsis-h"
        severity="secondary"
        outlined
        @click="open('manage')"
      />
    </div>
    <Select
      class="w-full sm:hidden"
      :model-value="current"
      :options="options"
      option-label="name"
      option-value="id"
      aria-label="Invoice group"
      placeholder="All invoices"
      :loading="loading && !loaded"
      @update:model-value="select"
    >
      <template #value>
        {{ active.name }}<template v-if="loaded"> · {{ active.count }} {{ active.count === 1 ? 'invoice' : 'invoices' }}</template>
      </template>
      <template #option="{ option }">
        {{ option.name }} · {{ option.count }}
      </template>
    </Select>
    <p class="text-text-muted text-xs leading-5">
      <span class="sm:hidden">Personal group · </span>Only visible to you
    </p>
    <template
      v-for="(group,index) in options"
      :key="group.id ?? 'all'"
    >
      <hr
        v-if="index === 2"
        class="border-divider hidden sm:block"
      >
      <Button
        variant="text"
        severity="secondary"
        :aria-pressed="current === group.id"
        :pt="{ root: { class: 'group-button hidden sm:flex', 'data-active': current === group.id } }"
        @click="select(group.id)"
      >
        <i
          class="pi text-base"
          :class="group.icon"
          aria-hidden="true"
        />
        <span class="min-w-0 flex-1 truncate text-left">{{ group.name }}</span>
        <span v-if="loaded" class="text-xs">{{ group.count }}</span>
      </Button>
    </template>
    <div
      v-if="selectedPersonal"
      class="hidden gap-2 sm:flex"
    >
      <Button
        label="Rename"
        icon="pi pi-pencil"
        severity="secondary"
        outlined
        @click="open('rename')"
      />
      <Button
        aria-label="Delete group"
        icon="pi pi-trash"
        severity="danger"
        outlined
        @click="open('delete')"
      />
    </div>
    <p class="text-text-muted hidden text-xs leading-5 sm:block">
      Groups organize your view.<br>Invoice access stays the same.
    </p>
    <p
      v-if="loadError"
      role="alert"
      class="text-destructive text-sm"
    >
      {{ loadError }} <Button
        label="Retry"
        variant="text"
        @click="load"
      />
    </p>
    <AppDialog
      v-model:visible="dialog"
      :header="heading"
      modal
      :closable="!busy"
      :close-on-escape="!busy"
      :style="{ width: 'min(375px, calc(100vw - 2rem))' }"
      :pt="{ header: 'px-5 pt-5', content: 'px-5 py-4', footer: 'px-5 pb-5' }"
    >
      <div
        v-if="mode === 'manage'"
        class="flex flex-col gap-3"
      >
        <p class="text-text-muted text-sm">
          Your groups are only visible to you.
        </p>
        <div
          v-for="group in groups.groups"
          :key="group.id"
          class="flex items-center gap-2"
        >
          <span class="min-w-0 flex-1 break-words">{{ group.name }}</span>
          <Button
            :aria-label="`Rename ${group.name}`"
            icon="pi pi-pencil"
            severity="secondary"
            outlined
            @click="open('rename',group)"
          />
          <Button
            :aria-label="`Delete ${group.name}`"
            icon="pi pi-trash"
            severity="danger"
            outlined
            @click="open('delete',group)"
          />
        </div>
        <Button
          v-if="!groups.groups.length"
          label="Create group"
          @click="open('create')"
        />
      </div>
      <form
        v-else
        id="invoice-group-form"
        class="flex flex-col gap-4"
        @submit.prevent="submit"
      >
        <p
          v-if="mode === 'delete'"
          class="text-text-muted text-sm"
        >
          The group will be deleted. Its {{ target?.count }} {{ target?.count === 1 ? 'invoice will stay available' : 'invoices will stay available' }} in All invoices and Ungrouped.
        </p>
        <template v-else>
          <p class="text-text-muted text-sm">
            {{ mode === 'rename' ? 'Only your group name changes.' : 'Your groups are only visible to you.' }}
          </p>
          <div class="flex flex-col gap-1.5">
            <label
              for="group-name"
              class="text-sm font-medium"
            >Group name</label>
            <InputText
              id="group-name"
              v-model="name"
              class="h-[38px]"
              :invalid="Boolean(error)"
              :aria-describedby="error ? 'group-error' : undefined"
            />
          </div>
        </template>
        <p
          v-if="error"
          id="group-error"
          role="alert"
          class="text-destructive text-sm"
        >
          {{ error }}
        </p>
      </form>
      <template
        v-if="mode !== 'manage'"
        #footer
      >
        <Button
          :label="mode === 'delete' ? 'Delete group' : mode === 'rename' ? 'Save name' : 'Create group'"
          :severity="mode === 'delete' ? 'danger' : undefined"
          :loading="busy"
          @click="submit"
        />
        <Button
          v-if="mode === 'delete'"
          label="Cancel"
          autofocus
          severity="secondary"
          outlined
          :disabled="busy"
          @click="dialog=false"
        />
      </template>
    </AppDialog>
  </section>
</template>

<style scoped>
.group-button.p-button {
  justify-content: flex-start;
  width: 100%;
  height: 42px;
  padding: 0 10px;
  color: var(--color-text-dark);
}
.group-button[data-active=true] {
  background: var(--color-accent-tint);
  color: var(--color-brand);
}
</style>
