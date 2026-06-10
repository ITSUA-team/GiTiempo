<script setup lang="ts">
import { ref } from 'vue';
import { DocumentPlusIcon } from '@heroicons/vue/24/outline';
import {
  EmptyStateBlock,
  EntryActionButton,
  SectionHeader,
  SurfaceCard,
} from '@gitiempo/web-shared';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';

const searchQuery = ref('');
const isInvoiceDialogOpen = ref(false);
</script>

<template>
  <section class="flex flex-col gap-6">
    <SurfaceCard padding-class="p-5">
      <div class="mb-4">
        <SectionHeader title="Invoices Table">
          <template #actions>
            <div class="flex w-full items-center gap-3 sm:w-auto">
              <IconField class="w-full sm:w-[280px]">
                <InputIcon class="pi pi-search text-text-muted" />
                <InputText
                  v-model="searchQuery"
                  aria-label="Search invoices"
                  class="h-[38px] w-full rounded-[6px] text-[14px]"
                  placeholder="Search invoices"
                />
              </IconField>

              <EntryActionButton
                data-testid="invoices-table-create"
                :icon="DocumentPlusIcon"
                label="Create invoice"
                @click="isInvoiceDialogOpen = true"
              />
            </div>
          </template>
        </SectionHeader>
      </div>

      <div class="border-divider overflow-hidden rounded-[6px] border">
        <div
          class="border-divider bg-app-bg text-text-dark hidden h-[44px] min-w-[720px] items-center border-b font-sans text-[13px] font-semibold sm:flex"
        >
          <div class="min-w-0 flex-1 px-3">
            Invoice
          </div>
          <div class="w-[180px] px-3">
            Project
          </div>
          <div class="w-[140px] px-3 text-right">
            Amount
          </div>
          <div class="w-[140px] px-3">
            Status
          </div>
        </div>

        <EmptyStateBlock
          title="No invoices yet"
          description="Invoice data will appear here once the invoice API contract is available."
        />
      </div>
    </SurfaceCard>

    <Dialog
      modal
      :dismissable-mask="true"
      :draggable="false"
      :visible="isInvoiceDialogOpen"
      :pt="{
        root: 'w-[min(520px,calc(100vw-2rem))] rounded-lg border border-divider',
        header: 'px-6 pt-6 pb-0',
        content: 'px-6 pb-6 pt-4',
        footer: 'px-6 pb-6 pt-0',
      }"
      @update:visible="isInvoiceDialogOpen = false"
    >
      <template #header>
        <div class="flex flex-col gap-1">
          <h2 class="text-text-dark text-lg font-semibold">
            Invoice
          </h2>
          <p class="text-text-muted text-[13px]">
            Create-invoice persistence is deferred until the invoice API contract ships.
          </p>
        </div>
      </template>

      <p class="text-text-muted text-sm leading-6">
        The approved create entry point is available from the invoices table header. The
        modal shell stays in place so the route matches the current layout without
        introducing unsupported invoice data.
      </p>

      <template #footer>
        <Button
          label="Close"
          severity="secondary"
          variant="outlined"
          @click="isInvoiceDialogOpen = false"
        />
      </template>
    </Dialog>
  </section>
</template>
