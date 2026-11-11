<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { InvoiceGroupsResponse } from '@gitiempo/shared';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { AppDialog, getErrorMessage } from '@gitiempo/web-shared';
import { adminInvoicesClient } from '@/services/admin-invoices-client';

const props = defineProps<{scope: unknown; refreshToken?:number; invoices: Array<{id:string;title:string}>}>();
const emit = defineEmits<{'select':[value:string | null]; moved:[]; loaded:[value:Array<{id:string;name:string;count:number}>]}>();
const groups = ref<InvoiceGroupsResponse>({groups:[],allCount:0,ungroupedCount:0});
const current = ref<string | null>(null);
const loading = ref(false);
const options = computed(() => [{id:null,name:'All invoices'},{id:'ungrouped',name:'Ungrouped'},...groups.value.groups]);
const name = ref('');
const editId = ref<string | null>(null);
const dialog = ref(false);
const deleting = ref(false);
const error = ref('');
const loadError = ref('');
const busy = ref(false);
let generation = 0;
let loadSequence=0;
const api = adminInvoicesClient;
async function load() {
 const requestGeneration = generation;
 const sequence=++loadSequence;
 const isCurrent=()=>requestGeneration===generation && sequence===loadSequence;
 loading.value=true;
 try { const result = await api.listGroups();if (isCurrent()) {groups.value=result;emit('loaded',result.groups);loadError.value='';} }
 catch(e) {if (isCurrent()) loadError.value=getErrorMessage(e);}
 finally {if(isCurrent()) loading.value=false;}
}
watch(()=>props.scope,()=>{generation++;error.value='';loadError.value='';dialog.value=false;editId.value=null;name.value='';current.value=null;groups.value={groups:[],allCount:0,ungroupedCount:0};busy.value=false;void load();},{immediate:true,deep:true});
watch(()=>[props.invoices,props.refreshToken],()=>void load());
function select(value:string|null) {current.value=value;emit('select',value);}
async function save() {
 const requestGeneration = generation;
 if (!name.value.trim()) {error.value='Group name is required.';return;}
 busy.value=true;
 try {await (editId.value ? api.updateGroup(editId.value,{name:name.value.trim()}) : api.createGroup({name:name.value.trim()}));if (requestGeneration!==generation) return;dialog.value=false;await load();}
 catch(e){if (requestGeneration===generation) error.value=getErrorMessage(e);}finally{if (requestGeneration===generation) busy.value=false;}
}
async function remove() {
 const requestGeneration = generation;
 if (!current.value || current.value==='ungrouped') return;
 busy.value=true;
 try {await api.deleteGroup(current.value);if (requestGeneration!==generation) return;select(null);await load();emit('moved');dialog.value=false;}
 catch(e){if (requestGeneration===generation) error.value=getErrorMessage(e);}finally{if (requestGeneration===generation) busy.value=false;}
}
</script>
<template>
  <section class="border-divider bg-surface-primary flex flex-col gap-3 rounded-lg border p-4">
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between gap-2">
        <h2 class="font-semibold">
          My groups
        </h2>
        <Button
          aria-label="Create group"
          icon="pi pi-plus"
          class="h-[38px] w-[38px] shrink-0"
          severity="secondary"
          @click="error='';name='';editId=null;deleting=false;dialog=true"
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
        :loading="loading"
        @update:model-value="select"
      />
      <p
        v-if="loading"
        role="status"
      >
        Loading groups…
      </p>
      <Button
        class="hidden sm:flex"
        label="All invoices"
        :badge="String(groups.allCount)"
        :severity="current===null ? 'primary':'secondary'"
        :aria-pressed="current===null"
        @click="select(null)"
      />
      <Button
        class="hidden sm:flex"
        label="Ungrouped"
        :badge="String(groups.ungroupedCount)"
        :severity="current==='ungrouped' ? 'primary':'secondary'"
        :aria-pressed="current==='ungrouped'"
        @click="select('ungrouped')"
      />
      <Button
        v-for="group in groups.groups"
        :key="group.id"
        class="hidden sm:flex"
        :label="group.name"
        :badge="String(group.count)"
        :severity="current===group.id ? 'primary':'secondary'"
        @click="select(group.id)"
      />
      <Button
        v-if="current && current!=='ungrouped'"
        label="Rename"
        variant="text"
        @click="error='';deleting=false;editId=current;name=groups.groups.find(g=>g.id===current)?.name ?? '';dialog=true"
      />
      <Button
        v-if="current && current!=='ungrouped'"
        label="Delete group"
        severity="danger"
        variant="text"
        @click="error='';deleting=true;editId=null;dialog=true"
      />
    </div>
    <p
      v-if="loadError"
      role="alert"
      class="text-destructive"
    >
      {{ loadError }} <Button
        label="Retry"
        variant="text"
        @click="load"
      />
    </p>
    <AppDialog
      v-model:visible="dialog"
      :header="deleting ? 'Delete group?' : editId ? 'Rename group':'Create group'"
      modal
    >
      <p
        v-if="error"
        role="alert"
        class="text-destructive"
      >
        {{ error }}
      </p>
      <div v-if="deleting">
        <p>Invoices will remain available in All invoices and Ungrouped.</p>
        <Button
          label="Cancel"
          autofocus
          severity="secondary"
          @click="dialog=false"
        />
        <Button
          label="Delete group"
          severity="danger"
          :loading="busy"
          @click="remove"
        />
      </div>
      <div
        v-else
        class="flex flex-col gap-3"
      >
        <label for="group-name">Group name</label><InputText
          id="group-name"
          v-model="name"
        /><Button
          label="Save group"
          :loading="busy"
          @click="save"
        />
      </div>
    </AppDialog>
  </section>
</template>
