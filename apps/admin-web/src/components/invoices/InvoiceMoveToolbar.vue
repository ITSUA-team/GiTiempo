<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Button from 'primevue/button';
import Select from 'primevue/select';
import { getErrorMessage } from '@gitiempo/web-shared';
import { adminInvoicesClient } from '@/services/admin-invoices-client';
const props = defineProps<{scope:unknown; currentGroup:string|null; groups:Array<{id:string;name:string}>}>();
const selection = defineModel<string[]>('selection', {default:()=>[]});
const emit = defineEmits<{moved:[]}>();
const destination=ref<string|null>(null);
const busy=ref(false);
const error=ref('');
let generation=0;
watch(()=>[props.scope,props.currentGroup],()=>{generation++;busy.value=false;error.value='';destination.value=null;},{deep:true});
const unchanged = computed(()=> props.currentGroup === 'ungrouped' ? destination.value===null : props.currentGroup!==null && destination.value===props.currentGroup);
async function move(){
 const requestGeneration=generation;
 busy.value=true;error.value='';
 try{await adminInvoicesClient.moveInvoices({invoiceIds:[...selection.value],groupId:destination.value});if(requestGeneration!==generation)return;selection.value=[];emit('moved');}
 catch(e){if(requestGeneration===generation)error.value=getErrorMessage(e);}
 finally{if(requestGeneration===generation)busy.value=false;}
}
</script>
<template>
  <div
    v-if="selection.length"
    class="border-divider mb-4 flex flex-wrap items-center gap-3 rounded-lg border p-3"
    aria-label="Selected invoices"
  >
    <span>{{ selection.length }} selected</span>
    <Select
      v-model="destination"
      :options="[{id:null,name:'Ungrouped'},...groups]"
      option-label="name"
      option-value="id"
      aria-label="Move to group"
      placeholder="Ungrouped"
      :disabled="busy"
    />
    <Button
      :label="`Move ${selection.length} invoice${selection.length===1?'':'s'}`"
      :loading="busy"
      :disabled="unchanged"
      @click="move"
    />
    <Button
      label="Clear selection"
      severity="secondary"
      :disabled="busy"
      @click="selection=[]"
    />
    <p
      v-if="error"
      role="alert"
      class="text-destructive w-full"
    >
      {{ error }}
    </p>
  </div>
</template>
