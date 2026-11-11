<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useQueryClient } from '@tanstack/vue-query';
import { useRoute, useRouter } from 'vue-router';
import {
  invoiceDocumentIncompleteErrorSchema,
  WorkspaceRoles,
  type UpdateInvoiceInput,
  type InvoiceResponse,
  type CreateInvoiceInput,
} from '@gitiempo/shared';
import { AppDialog, DatePickerButtonBar, getErrorMessage, SurfaceCard, useDatePickerConfirmCancel } from '@gitiempo/web-shared';
import { giTiempoDatePickerPt } from '@gitiempo/web-config/theme';
import { getLocalDateKey } from '@gitiempo/web-shared/time';
import { ApiError } from '@gitiempo/web-shared/http';
import Button from 'primevue/button';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import InvoiceDetailDocument from '@/components/invoices/InvoiceDetailDocument.vue';
import InvoiceDetailHeader from '@/components/invoices/InvoiceDetailHeader.vue';
import InvoiceCreateDialog from '@/components/invoices/InvoiceCreateDialog.vue';
import { useInvoiceCreate } from '@/composables/invoices/useInvoiceCreate';
import {
  invalidateQueryKeys,
  useAdminProjectsQuery,
} from '@/composables/query';
import { adminMutationInvalidationKeys } from '@/lib/query-keys';
import { adminProjectsClient } from '@/services/admin-projects-client';
import { adminInvoicesClient } from '@/services/admin-invoices-client';
import Skeleton from 'primevue/skeleton';

import { reconcileInvoiceDraft } from '@/lib/invoice-edit';
import InvoiceStatusBadge from '@/components/invoices/InvoiceStatusBadge.vue';
import RequestErrorCard from '@/components/RequestErrorCard.vue';
import { useConfirmation } from '@/composables/feedback/useConfirmation';
import { useToasts } from '@/composables/feedback/useToasts';
import { useInvoiceDelete } from '@/composables/invoices/useInvoiceDelete';
import {
  useInvoiceDetail,
  LOAD_ACTION,
} from '@/composables/invoices/useInvoiceDetail';
import { useInvoiceUpdate } from '@/composables/invoices/useInvoiceUpdate';
import { useInvoiceServerScope } from '@/lib/server-state-scope';
import { routeNames } from '@/constants/routes';
import { useAuthStore } from '@/stores/auth';

const DELETE_CONFIRMATION_MESSAGE =
  'Linked time entries will be unlinked and become available for future invoices. The invoice will be deleted.';

const CONFLICT_TOAST_BY_CODE = {
  invoice_invalid_status_transition: 'This status change is not allowed',
  invoice_not_deletable:
    'This invoice can no longer be deleted because its status changed',
  invoice_update_conflict:
    'This invoice was modified by another user. Please review and try again',
} as const satisfies Record<string, string>;

type InvoiceConflictCode = keyof typeof CONFLICT_TOAST_BY_CODE;

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const authStore = useAuthStore();
const { errorToast } = useToasts();
const { requireConfirmation } = useConfirmation();

const accessToken = computed(() => authStore.accessToken);
const scope = useInvoiceServerScope(accessToken);
const isAdmin = computed(
  () => authStore.profile?.role === WorkspaceRoles.Admin,
);

const invoiceId = computed(() => {
  const id = route.params.id;
  return Array.isArray(id) ? (id[0] ?? '') : (id ?? '');
});

const { error, invoice, loading, notFound, refetch } = useInvoiceDetail({
  enabled: computed(() => Boolean(accessToken.value)),
  invoiceId,
  onError: notifyInvoiceActionError,
  scope,
});

const updateMutation = useInvoiceUpdate({
  onError: notifyInvoiceActionError,
  scope,
});

const deleteMutation = useInvoiceDelete({
  onError: notifyInvoiceActionError,
  onSuccess: () => {
    router.push({ name: routeNames.invoices });
  },
  scope,
});

function isInvoiceConflictCode(code: string): code is InvoiceConflictCode {
  return code in CONFLICT_TOAST_BY_CODE;
}

function getInvoiceConflictCode(error: unknown): InvoiceConflictCode | null {
  if (error instanceof ApiError && typeof error.code === 'string') {
    return isInvoiceConflictCode(error.code) ? error.code : null;
  }

  return null;
}

function notifyInvoiceActionError(
  message: string,
  actionError: unknown,
  action: string,
): void {
  if (actionError instanceof ApiError && actionError.status === 404) {
    // A load 404 renders the not-found view directly; no toast needed.
    // A mutation 404 means the invoice was deleted by someone else — show
    // the server message and refetch so the not-found view renders from
    // the fresh GET instead of leaving a stale detail on screen.
    if (action === LOAD_ACTION) return;
    errorToast(message, {
      error: actionError,
      logContext: { action, feature: 'invoices' },
    });
    void refetch();
    return;
  }

  const code = getInvoiceConflictCode(actionError);

  if (code) {
    errorToast(CONFLICT_TOAST_BY_CODE[code], {
      error: actionError,
      logContext: { action, feature: 'invoices' },
    });
    void refetch();
    return;
  }

  errorToast(message, {
    error: actionError,
    logContext: { action, feature: 'invoices' },
  });
}

function swallowReportedError(): void {
  // Mutation errors are already toasted (and reloaded on conflicts) inside
  // notifyInvoiceActionError; the rethrown promise only needs to be silenced.
}

const editorOpen = ref(false);
const revisionConflict = ref(false);
const editorInvoiceId = ref('');
let editorGeneration = 0;
watch(
  [scope, invoiceId],
  () => {
    editorGeneration++;
    editorOpen.value = false;
    copyOpen.value = false;
    revisionConflict.value = false;
  },
  { flush: 'sync' },
);
const copyOpen = ref(false);
const copyPeriod = ref<Date[] | null>(null);
const copyPeriodPicker = useDatePickerConfirmCancel<Date[] | null>();
const copyGroup = ref<string | null>(null);
const detailGroups = ref<Array<{ id: string; name: string }>>([]);
watch(
  scope,
  async () => {
    const currentScope = scope.value;
    try {
      const result = await adminInvoicesClient.listGroups();
      if (scope.value === currentScope) detailGroups.value = result.groups;
    } catch {
      detailGroups.value = [];
    }
  },
  { immediate: true },
);
const groupMoveBusy = ref(false);
const groupMoveError = ref('');
let groupMoveGeneration = 0;
watch(
  [scope, invoiceId],
  () => {
    groupMoveGeneration++;
    groupMoveBusy.value = false;
    groupMoveError.value = '';
  },
  { flush: 'sync' },
);
async function moveToGroup(groupId: string | null) {
  if (
    !invoice.value ||
    groupMoveBusy.value ||
    (invoice.value.groupId ?? null) === groupId
  )
    return;
  const requestScope = { ...scope.value };
  const requestGeneration = groupMoveGeneration;
  const sourceId = invoice.value.id;
  groupMoveBusy.value = true;
  groupMoveError.value = '';
  try {
    await adminInvoicesClient.moveInvoices({ invoiceIds: [sourceId], groupId });
    await invalidateQueryKeys(
      queryClient,
      adminMutationInvalidationKeys.afterInvoiceGroupMutation(requestScope),
    );
  } catch (error) {
    if (requestGeneration === groupMoveGeneration)
      groupMoveError.value = getErrorMessage(error);
  } finally {
    if (requestGeneration === groupMoveGeneration) groupMoveBusy.value = false;
  }
}
const copySource = computed(() =>
  invoice.value && !editing.value && copyPeriod.value?.[1]
    ? {
        ...invoice.value,
        groupId: copyGroup.value,
        dateFrom: getLocalDateKey(copyPeriod.value[0]!),
        dateTo: getLocalDateKey(copyPeriod.value[1]),
      }
    : invoice.value,
);
const editing = ref(true);
let openedInvoice: InvoiceResponse | undefined;
const createMutation = useInvoiceCreate({
  scope,
  onError: notifyInvoiceActionError,
});
const projectsQuery = useAdminProjectsQuery({
  client: adminProjectsClient,
  enabled: computed(() => Boolean(accessToken.value)),
  scope,
});
const editorMutation = {
  isCreating: computed(() =>
    editing.value
      ? updateMutation.isUpdating.value
      : createMutation.isCreating.value,
  ),
  createInvoice: async (
    input: Parameters<typeof adminInvoicesClient.createInvoice>[0],
  ) => {
    const requestGeneration = editorGeneration;
    if (
      !editorOpen.value ||
      editorInvoiceId.value !== invoiceId.value ||
      (editing.value && !invoice.value)
    )
      throw new Error('The invoice changed. Reopen its editor.');
    if (editing.value && openedInvoice && invoice.value) {
      const { patch } = reconcileInvoiceDraft(openedInvoice, input, openedInvoice);
      if (!Object.keys(patch).length) return invoice.value;
      try {
        return await updateMutation.updateInvoice({
          invoiceId: editorInvoiceId.value,
          data: {
            ...patch,
            expectedRevision: openedInvoice.revision,
          },
        });
      } catch (error) {
        if (
          requestGeneration === editorGeneration &&
          editorOpen.value &&
          error instanceof ApiError &&
          error.code === 'invoice_update_conflict'
        )
          revisionConflict.value = true;
        throw error;
      }
    }
    return createMutation.createInvoice(input);
  },
};
const exportBusy = ref(false);
const exportError = ref('');
const missingBillingFields = ref<string[]>([]);
watch(
  [scope, invoiceId],
  () => {
    exportBusy.value = false;
    exportError.value = '';
    missingBillingFields.value = [];
  },
  { flush: 'sync' },
);
async function downloadPdf() {
  if (!invoice.value || exportBusy.value) return;
  const sourceId = invoice.value.id;
  const sourceScope = scope.value;
  const filename = `${invoice.value.reference ?? sourceId}.pdf`;
  exportBusy.value = true;
  exportError.value = '';
  missingBillingFields.value = [];
  try {
    const response = await adminInvoicesClient.downloadInvoicePdf(sourceId);
    if (invoice.value?.id !== sourceId || scope.value !== sourceScope) return;
    const url = URL.createObjectURL(response);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    if (invoice.value?.id !== sourceId || scope.value !== sourceScope) return;
    const incomplete = invoiceDocumentIncompleteErrorSchema.safeParse(
      error instanceof ApiError ? error.body : null,
    );
    if (incomplete.success)
      missingBillingFields.value = incomplete.data.details.missingFields;
    exportError.value = getErrorMessage(error);
  } finally {
    if (invoice.value?.id === sourceId && scope.value === sourceScope)
      exportBusy.value = false;
  }
}
async function reviewInvoiceRevision(getDraft: () => CreateInvoiceInput) {
  const sourceId = editorInvoiceId.value;
  const requestGeneration = editorGeneration;
  const result = await refetch();
  if (
    requestGeneration !== editorGeneration ||
    sourceId !== invoiceId.value ||
    !editorOpen.value
  )
    throw new Error('The invoice changed. Reopen its editor.');
  if (result.error || !result.data)
    throw result.error ?? new Error('Could not load the invoice.');
  if (!openedInvoice) throw new Error('Reopen the invoice editor.');
  const reviewed = reconcileInvoiceDraft(openedInvoice, getDraft(), result.data);
  openedInvoice = result.data;
  revisionConflict.value = false;
  return reviewed;
}
function openEditor(isEdit: boolean) {
  editorGeneration++;
  editorInvoiceId.value = invoiceId.value;
  revisionConflict.value = false;
  editing.value = isEdit;
  openedInvoice = invoice.value ?? undefined;
  if (isEdit) editorOpen.value = true;
  else {
    copyPeriod.value = null;
    copyGroup.value = invoice.value?.groupId ?? null;
    copyOpen.value = true;
  }
}

function runUpdate(data: UpdateInvoiceInput): void {
  updateMutation
    .updateInvoice({ data, invoiceId: invoiceId.value })
    .catch(swallowReportedError);
}

function confirmDelete(): void {
  requireConfirmation(
    DELETE_CONFIRMATION_MESSAGE,
    'Delete this invoice?',
    'Delete invoice',
    () => {
      deleteInvoice();
    },
  );
}

function deleteInvoice(): void {
  deleteMutation.deleteInvoice(invoiceId.value).catch(swallowReportedError);
}

function goBack(): void {
  router.push({ name: routeNames.invoices });
}
</script>

<template>
  <div class="flex min-w-0 flex-col gap-4 sm:gap-6">
    <template v-if="loading && !invoice">
      <div class="flex flex-col gap-4">
        <Skeleton
          height="2rem"
          width="12rem"
        />
        <SurfaceCard padding-class="p-6">
          <Skeleton height="8rem" />
        </SurfaceCard>
        <SurfaceCard padding-class="p-6">
          <Skeleton height="6rem" />
        </SurfaceCard>
      </div>
    </template>

    <template v-else-if="notFound">
      <div
        class="flex flex-col items-center gap-4 py-12"
        data-testid="invoice-not-found"
      >
        <span class="text-text-dark text-lg font-semibold">
          Invoice not found
        </span>
        <Button
          label="Back to invoices"
          variant="outlined"
          @click="goBack"
        />
      </div>
    </template>

    <template v-else-if="error && !invoice">
      <RequestErrorCard
        title="Failed to load invoice"
        :message="getErrorMessage(error)"
        data-testid="invoice-load-error"
        @retry="refetch"
      />
    </template>

    <template v-else-if="invoice">
      <InvoiceDetailHeader
        :invoice="invoice"
        :groups="detailGroups"
        :moving="groupMoveBusy"
        :move-error="groupMoveError"
        :updating="updateMutation.isUpdating.value"
        :exporting="exportBusy"
        @back="goBack"
        @copy="openEditor(false)"
        @edit="openEditor(true)"
        @download="downloadPdf"
        @move="moveToGroup"
        @status="
          (status) => runUpdate({ status, expectedRevision: invoice?.revision })
        "
      />
      <SurfaceCard
        v-if="exportError"
        role="alert"
        border
        padding-class="p-5"
        body-class="flex flex-col items-start gap-4"
      >
        <h2 class="text-lg font-semibold">
          Could not prepare PDF
        </h2>
        <template v-if="missingBillingFields.length">
          <p class="text-text-muted text-xs">
            The invoice is saved. Complete these billing sections before
            exporting: {{ missingBillingFields.join(', ') }}.
          </p>
          <Button
            label="Edit billing information"
            icon="pi pi-pencil"
            @click="openEditor(true)"
          />
        </template>
        <template v-else>
          <p class="text-text-muted text-xs">
            The invoice is saved. Retry the PDF download.
          </p>
          <Button
            label="Retry download"
            icon="pi pi-download"
            class="h-[38px]"
            @click="downloadPdf"
          />
        </template>
      </SurfaceCard>
      <InvoiceDetailDocument :invoice="invoice" />
      <SurfaceCard
        v-if="invoice.status === 'draft' && isAdmin"
        border
        padding-class="p-5"
        body-class="flex flex-col items-start gap-4"
      >
        <div class="flex w-full items-center justify-between gap-3">
          <span class="font-semibold break-words">{{
            invoice.reference || invoice.title
          }}</span>
          <InvoiceStatusBadge status="draft" />
        </div>
        <Button
          label="Delete invoice"
          icon="pi pi-trash"
          severity="danger"
          outlined
          class="h-[38px]"
          :loading="deleteMutation.isDeleting.value"
          data-testid="invoice-delete"
          @click="confirmDelete"
        />
        <p class="text-text-muted text-xs">
          Only Admins can delete a Draft invoice.
        </p>
      </SurfaceCard>
      <AppDialog
        v-model:visible="copyOpen"
        :header="`Create from ${invoice.reference || invoice.title}`"
        modal
        class="w-[420px]"
        :pt="{
          header: 'px-5 pt-5 pb-0',
          content: 'px-5 py-4',
          footer: 'px-5 pb-5 pt-0',
        }"
      >
        <div class="flex flex-col gap-4">
          <p class="text-text-muted text-xs">
            Reuse invoice details in a new draft. The original stays unchanged.
          </p>
          <div class="flex flex-col gap-1.5">
            <label
              for="copy-period"
              class="text-[13px] font-medium"
            >New billing period</label>
            <DatePicker
              :ref="copyPeriodPicker.datePickerRef"
              v-model="copyPeriod"
              input-id="copy-period"
              selection-mode="range"
              date-format="dd M yy"
              icon-display="input"
              :manual-input="false"
              show-button-bar
              show-icon
              class="w-full"
              :pt="giTiempoDatePickerPt"
              @show="copyPeriodPicker.handleShow"
            >
              <template #buttonbar>
                <DatePickerButtonBar
                  @cancel="copyPeriodPicker.handleCancel"
                  @confirm="copyPeriodPicker.handleConfirm"
                />
              </template>
            </DatePicker>
          </div>
          <div class="flex flex-col gap-1.5">
            <label
              for="copy-group"
              class="text-[13px] font-medium"
            >Personal group</label>
            <Select
              v-model="copyGroup"
              input-id="copy-group"
              placeholder="Ungrouped"
              :options="[{ id: null, name: 'Ungrouped' }, ...detailGroups]"
              option-label="name"
              option-value="id"
              class="h-[38px] w-full"
            />
          </div>
          <p class="text-text-muted text-xs">
            Sender, recipient, services and billing parameters will be
            prefilled. Review eligible entries in the new invoice.
          </p>
          <p class="border-divider rounded-lg border p-3 text-xs">
            Previously billed entries are not copied. The new invoice receives
            its own reference and Draft status.
          </p>
        </div>
        <template #footer>
          <Button
            label="Continue to new draft"
            class="h-[38px] w-full sm:w-auto"
            :disabled="!copyPeriod?.[1]"
            @click="
              copyOpen = false;
              editorOpen = true;
            "
          />
        </template>
      </AppDialog>
      <InvoiceCreateDialog
        v-model:visible="editorOpen"
        :source="copySource"
        :editing="editing"
        :revision-conflict="revisionConflict"
        :review-revision="reviewInvoiceRevision"
        :is-admin="isAdmin"
        :projects="projectsQuery.data.value ?? []"
        :scope="scope"
        :workspace-currency="invoice.currency"
        :workspace-hourly-rate="invoice.hourlyRate"
        :workspace-rounding-step-minutes="invoice.roundingStepMinutes"
        :create-mutation="editorMutation"
        @created="refetch()"
      />
    </template>
  </div>
</template>
