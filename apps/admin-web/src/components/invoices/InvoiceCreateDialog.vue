<script setup lang="ts">
import { invoiceDatePickerPt, invoiceSelectPt } from './invoice-field-pt';
import { computed, nextTick, ref, watch, type Ref } from 'vue';
import { useQueryClient } from '@tanstack/vue-query';
import { invoiceLogoSchema, projectInvoicePayment, type InvoicePayment } from '@gitiempo/shared';
import { adminInvoicesKeys } from '@/lib/query-keys';
import type {
  PreviewInvoiceResponse,
  CreateInvoiceInput,
  EligibleEntriesQuery,
  InvoiceResponse,
  InvoiceTimeEntrySummary,
  InvoiceTimeDisplayMode,
} from '@gitiempo/shared';
import {
  AppDialog,
  SurfaceCard,
  DatePickerButtonBar,
  useDatePickerConfirmCancel,
} from '@gitiempo/web-shared';
import {
  getLocalDateKey,
} from '@gitiempo/web-shared/time';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';

import { adminInvoicesClient } from '@/services/admin-invoices-client';
import { useEligibleEntriesPreview } from '@/composables/invoices/useEligibleEntriesPreview';
import { getSettingsCurrencyOptions } from '@/lib/currencies';
import InvoiceDocumentDates from './InvoiceDocumentDates.vue';
import InvoicePaymentFields from './InvoicePaymentFields.vue';
import InvoiceEditorEntries from './InvoiceEditorEntries.vue';
import InvoiceGroupSelect from './InvoiceGroupSelect.vue';
import { useInvoiceGroups } from '@/composables/invoices/useInvoiceGroups';
import SplitButton from 'primevue/splitbutton';
import { ApiError } from '@gitiempo/web-shared/http';
import { formatInvoiceAmount } from '@/lib/format-currency';
import type { AdminServerStateScope } from '@/lib/query-keys';
import { invoiceDocumentErrors, invoiceServerFieldErrors } from '@/lib/invoice-validation';
import { getRoundingStepOptions } from '@/lib/rounding-step-options';

/**
 * Presentational create-invoice dialog for the admin invoices list page.
 * Owns form state and the eligible-entries preview; error toasts, list
 * refresh, and mutation lifecycle stay with the parent view via the
 * `created` and `update:visible` emits.
 */

interface InvoiceCreateMutation {
  createInvoice: (input: CreateInvoiceInput) => Promise<InvoiceResponse>;
  isCreating: Ref<boolean>;
}

const props = defineProps<{
  visible: boolean;
  source?: InvoiceResponse;
  editing?: boolean;
  groupId?: string | null;
  /** Admin may submit without a project (workspace-wide); PM must select one. */
  isAdmin: boolean;
  projects: Array<{
    id: string;
    name: string;
    timeRoundingStepMinutes: number | null;
  }>;
  /** Currency selected in workspace Settings; pre-selected on dialog open. */
  workspaceCurrency: string | null;
  /** Hourly rate from workspace Settings; pre-filled on dialog open. */
  workspaceHourlyRate: number | null;
  /** Rounding step from workspace Settings; resolves project "inherit" values. */
  workspaceRoundingStepMinutes: number | null;
  revisionConflict?: boolean;
  reviewRevision?: (getDraft: () => CreateInvoiceInput) => Promise<{draft: CreateInvoiceInput; conflicts: string[]; savedLogo?: string | null}>;
  scope: AdminServerStateScope;
  createMutation: InvoiceCreateMutation;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  created: [invoice: InvoiceResponse];
}>();

const WORKSPACE_WIDE_PROJECT_VALUE = '';

const ROUNDING_STEP_OPTIONS = getRoundingStepOptions();

const sender = ref({name:'',address:'',email:'',taxId:''});
const recipient = ref({name:'',address:'',email:'',taxId:''});
const partySections = computed(() => [
  { id: 'sender', label: 'From', party: sender.value },
  { id: 'recipient', label: 'Bill to', party: recipient.value },
]);
const payment = ref<InvoicePayment>({method:'',terms:'',beneficiary:'',provider:'',account:'',instructions:''});
const issueDate = ref<Date | null>(new Date());
const dueDate = ref<Date | null>(null);
const services = ref('');
const logo = ref<string | null>(null);
const selectedEntries = ref<string[]>([]);
const timeDisplayMode = ref<InvoiceTimeDisplayMode>('entries');
const selectedEntriesScope = ref<string | null>(null);
const defaultSelectedEntryIds = ref<Set<string> | null>(null);
const saveError = ref('');
const defaultsError = ref('');
const submitting = ref(false);
const logoError = ref('');
const calculationError = ref('');
const reviewMessage = ref('');
const reviewedSavedLogo = ref<string | null>();
const defaultsPending = ref(false);
const logoPending = ref(false);
const reviewPending = ref(false);
const queryClient = useQueryClient();
let defaultsRequest = 0;
const calculatedPreview = ref<PreviewInvoiceResponse | null>(null);
const calculating = ref(false);
const calculationFailed = ref(false);
let calculationGeneration = 0;
let lifecycleGeneration = 0;
let logoReadGeneration = 0;
let logoVersion = 0;
const group = ref<string | null>(null);
const groupsQuery = useInvoiceGroups({
  scope: computed(() => props.scope),
  enabled: computed(() => props.visible),
});
function uploadLogo(event: {files: File | File[]}) {
 const file = Array.isArray(event.files) ? event.files[0] : event.files;
 if (!file) return;
 const generation = lifecycleGeneration;
 const read = ++logoReadGeneration;
 logoPending.value = false;
 logoError.value = '';
 if (file.size > 256000) {
   logoError.value = 'Choose a PNG or SVG logo up to 250 KB.';
   return;
 }
 const current = () => generation === lifecycleGeneration && read === logoReadGeneration && props.visible;
 const reader = new FileReader();
 logoPending.value = true;
 reader.onload = () => {
   if (!current()) return;
   const result = invoiceLogoSchema.safeParse(reader.result);
   if (result.success) {
     logo.value = result.data;
     logoVersion++;
   } else logoError.value = 'Choose a valid PNG or static SVG logo up to 250 KB.';
   logoPending.value = false;
 };
 reader.onerror = () => {
   if (!current()) return;
   logoError.value = 'Could not read the logo. Choose the file again.';
   logoPending.value = false;
 };
 reader.readAsDataURL(file);
}

async function useSettings(fields: 'billing' | 'logo' = 'billing') {
  const generation = lifecycleGeneration;
  const request = ++defaultsRequest;
  const current = () => request === defaultsRequest && generation === lifecycleGeneration && props.visible;
  const initialSender = { ...sender.value };
  const initialPayment = { ...payment.value };
  const initialLogoVersion = logoVersion;
  defaultsPending.value = true;
  defaultsError.value = '';
  try {
    const defaults = await queryClient.fetchQuery({
      queryKey: adminInvoicesKeys.defaults(props.scope),
      queryFn: () => adminInvoicesClient.getInvoiceDefaults(),
      staleTime: 0,
    });
    if (!current() || !defaults.billingProfile) return;
    const profile = defaults.billingProfile;
    if (logoVersion === initialLogoVersion) logo.value = profile.logo;
    if (fields === 'logo') return;
    for (const key of Object.keys(initialSender) as Array<keyof typeof initialSender>) {
      if (sender.value[key] === initialSender[key]) sender.value[key] = profile.sender[key];
    }
    for (const key of [...new Set([...Object.keys(initialPayment), ...Object.keys(profile.payment)])] as Array<keyof typeof initialPayment>) {
      if (payment.value[key] === initialPayment[key]) Object.assign(payment.value, { [key]: profile.payment[key] });
    }
  } catch {
    if (current()) defaultsError.value = 'Could not load billing settings. Try again.';
  } finally {
    if (current()) defaultsPending.value = false;
  }
}
const title = ref('');
const selectedProjectId = ref<string | null>(null);
const dateRange = ref<Date[] | null>(null);
const datePicker = useDatePickerConfirmCancel<Date[] | null>();
const hourlyRate = ref<number | null>(null);
const currency = ref('');
const discountPercent = ref<number | null>(0);
const roundingStepMinutes = ref<number>(1);
const notes = ref('');

const editorCaption = computed(() => {
  const source = props.source;
  if (!props.editing || !source) return 'New Draft · Reference assigned on creation · Review eligible entries.';
  const status = source.status.charAt(0).toUpperCase() + source.status.slice(1);
  return [source.reference, status, 'All business fields are editable.'].filter(Boolean).join(' · ');
});

const rateTouched = ref(false);
const currencyTouched = ref(false);
const roundingStepTouched = ref(false);
const validationTriggered = ref(false);
const seenEntries = ref(new Map<string, InvoiceTimeEntrySummary>());
const logoFile = ref<HTMLInputElement>();
const logoActions = computed(() => [
  { label: 'Upload logo', command: () => logoFile.value?.click() },
  { label: 'Remove logo', disabled: !logo.value, command: () => { logoReadGeneration++; logoVersion++; logoPending.value = false; logoError.value = ''; logo.value = null; } },
]);
function selectLogo(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files?.[0]) uploadLogo({files: input.files[0]});
  input.value = '';
}
const workspaceRateKnown = ref(false);
const workspaceCurrencyKnown = ref(false);

const previewQuery = computed<EligibleEntriesQuery | null>(() => {
  const dates = dateRange.value;
  if (!dates?.[0] || !dates[1]) return null;
  if (!props.isAdmin && !selectedProjectId.value) return null;
  return {
    dateFrom: getLocalDateKey(dates[0]),
    dateTo: getLocalDateKey(dates[1]),
    invoiceId: props.editing ? props.source?.id : undefined,
    projectId: selectedProjectId.value || undefined,
    ...(roundingStepTouched.value
      ? { roundingStepMinutes: roundingStepMinutes.value }
      : {}),
  };
});

const {
  preview,
  refetch: refreshEligibility,
  isLoading: previewLoading,
  isEmpty: previewEmpty,
  isError: previewError,

} = useEligibleEntriesPreview({
  enabled: computed(() => props.visible),
  scope: computed(() => props.scope),
  query: previewQuery,
});

const entriesScope = computed(() => previewQuery.value
  ? JSON.stringify([previewQuery.value.dateFrom, previewQuery.value.dateTo, previewQuery.value.projectId])
  : null);

watch([preview, entriesScope], ([value, scope]) => {
  if (!value) return;
  for (const entry of value.entries) seenEntries.value.set(entry.id, entry);
  if (scope !== selectedEntriesScope.value) {
    selectedEntries.value = value.entries.map(entry => entry.id);
    selectedEntriesScope.value = scope;
    defaultSelectedEntryIds.value = new Set(selectedEntries.value);
  } else if (defaultSelectedEntryIds.value) {
    const additions = value.entries.filter(entry => !defaultSelectedEntryIds.value!.has(entry.id));
    if (additions.length) {
      selectedEntries.value = [...selectedEntries.value, ...additions.map(entry => entry.id)];
      for (const entry of additions) defaultSelectedEntryIds.value.add(entry.id);
    }
  }
});
const serverErrors = ref<Record<string, {message: string; value: string}>>({});
// Reset on any visibility change, before the pre-fill watcher below so a
// reopened dialog starts blank and then receives the preview defaults again.
watch(
  [() => props.visible, () => JSON.stringify(props.scope)],
  () => {
    lifecycleGeneration++;
    logoVersion = 0;
    reviewPending.value = false;
    reviewedSavedLogo.value = undefined;
    calculationGeneration++;
    calculatedPreview.value = null;
    calculating.value = false;
    logo.value = null;
    rateTouched.value = false;
    currencyTouched.value = false;
    roundingStepTouched.value = false;
    title.value = '';
    issueDate.value = new Date();
    dueDate.value = null;
    selectedProjectId.value = null;
    dateRange.value = null;
    hourlyRate.value = null;
    currency.value = '';
    discountPercent.value = 0;
    roundingStepMinutes.value = 1;
    notes.value = '';
    saveError.value = '';
    serverErrors.value = {};
    defaultsError.value = logoError.value = calculationError.value = reviewMessage.value = '';
    submitting.value = false;
    defaultsPending.value = logoPending.value = false;
    calculationFailed.value=false;
    selectedEntries.value = [];
    timeDisplayMode.value = 'entries';
    selectedEntriesScope.value = null;
    defaultSelectedEntryIds.value = null;
    sender.value = {name:'',address:'',email:'',taxId:''};
    recipient.value = {name:'',address:'',email:'',taxId:''};
    payment.value = {method:'',terms:'',beneficiary:'',provider:'',account:'',instructions:''};
    services.value = '';
    if (props.visible) {
      group.value = props.source?.groupId ?? props.groupId ?? null;
      const source = props.source;
      if (source) {
        if (props.editing) {
          issueDate.value = new Date((source.issueDate ?? source.createdAt.slice(0, 10)) + 'T12:00:00');
          dueDate.value = source.dueDate ? new Date(source.dueDate + 'T12:00:00') : null;
        }
        rateTouched.value = true;
        currencyTouched.value = true;
        title.value = source.title;
        timeDisplayMode.value = source.timeDisplayMode;
        selectedProjectId.value = source.projectId;
        dateRange.value = [new Date(source.dateFrom+'T12:00:00'),new Date(source.dateTo+'T12:00:00')];
        hourlyRate.value = source.hourlyRate;
        currency.value = source.currency;
        discountPercent.value = source.discountPercent;
        roundingStepMinutes.value = source.roundingStepMinutes;
        roundingStepTouched.value = true;
        services.value = source.services ?? '';
        if (source.sender) sender.value = {...source.sender};
        if (source.recipient) recipient.value = {...source.recipient};
        if (source.payment) payment.value = {...source.payment, instructions: !props.editing && source.reference ? source.payment.instructions.replaceAll(source.reference, '{{invoiceReference}}') : source.payment.instructions};
        logo.value = source.logo ?? null;
        if (!props.editing && logo.value === null) void useSettings('logo');
        notes.value = source.notes ?? '';
        selectedEntries.value = props.editing ? source.timeEntries.map(e=>e.id) : [];
        if (props.editing) selectedEntriesScope.value = entriesScope.value;
      } else {
        void useSettings();
      }
    }

    validationTriggered.value = false;
    seenEntries.value = new Map(props.source?.timeEntries.map(entry => [entry.id, entry]));
    workspaceRateKnown.value = false;
    workspaceCurrencyKnown.value = false;
  },
  {immediate:true},
);

// Pre-fill the workspace Settings hourly rate as soon as the dialog opens, and
// keep following it while the settings load late or change while open — until
// the user edits the field. The workspaceRateKnown flag distinguishes "settings
// not yet loaded" (preview default fills in) from "rate explicitly cleared"
// (field stays empty so the create request does not send a stale auto-fill).
watch(
  [() => props.workspaceHourlyRate, () => props.visible],
  ([workspaceHourlyRate, visible]) => {
    if (!visible || rateTouched.value) return;
    if (workspaceHourlyRate !== null) {
      workspaceRateKnown.value = true;
      hourlyRate.value = workspaceHourlyRate;
    } else if (workspaceRateKnown.value) {
      hourlyRate.value = null;
    }
  },
  { immediate: true },
);

// Pre-select the workspace Settings currency as soon as the dialog opens, and
// keep following it while the settings load late or change while open — until
// the user edits the field. The workspaceCurrencyKnown flag distinguishes
// "settings not yet loaded" (preview default fills in) from "currency
// explicitly cleared" (field stays empty so the create request does not send
// a stale auto-fill).
watch(
  [() => props.workspaceCurrency, () => props.visible],
  ([workspaceCurrency, visible]) => {
    if (!visible || currencyTouched.value) return;
    if (workspaceCurrency) {
      workspaceCurrencyKnown.value = true;
      currency.value = workspaceCurrency;
    } else if (workspaceCurrencyKnown.value) {
      currency.value = '';
    }
  },
  { immediate: true },
);

// Sync rate/currency/rounding defaults from every fresh preview response
// until the user edits those fields; after a manual change the entered
// values win. Relying on the touched flags (instead of also checking the
// field is empty) keeps the dialog in sync when workspace settings change
// between opens even if vue-query serves a cached preview response first.
watch(
  [preview, () => props.visible],
  ([data, visible]) => {
    if (!visible || !data) return;
    // The workspace settings rate always wins over the preview value; the
    // preview default is only the fallback for when the settings query has
    // not yet provided a rate. Once a rate was known and then cleared, the
    // field stays empty rather than silently re-filling from the preview.
    if (
      !rateTouched.value &&
      props.workspaceHourlyRate === null &&
      !workspaceRateKnown.value &&
      data.defaultHourlyRate !== null
    ) {
      hourlyRate.value = data.defaultHourlyRate;
    }
    // The workspace settings currency always wins over the preview value; the
    // preview default is only the fallback for when the settings query has
    // not yet provided a currency. Once a currency was known and then cleared,
    // the field stays empty rather than silently re-filling from the preview.
    if (
      !currencyTouched.value &&
      !props.workspaceCurrency &&
      !workspaceCurrencyKnown.value &&
      data.defaultCurrency !== null
    ) {
      currency.value = data.defaultCurrency;
    }
    if (!roundingStepTouched.value) {
      roundingStepMinutes.value = data.defaultRoundingStepMinutes;
    }
  },
  { immediate: true },
);

// When a project is selected, immediately update the rounding step from the
// project's configured value (or the workspace default when the project
// inherits) so the field reflects the selection without waiting for the
// preview response. The preview sync above still reconciles afterwards.
watch(selectedProjectId, (newProjectId) => {
  if (roundingStepTouched.value) return;

  if (!newProjectId || newProjectId === WORKSPACE_WIDE_PROJECT_VALUE) {
    if (props.workspaceRoundingStepMinutes !== null) {
      roundingStepMinutes.value = props.workspaceRoundingStepMinutes;
    }
    return;
  }

  const project = props.projects.find((p) => p.id === newProjectId);
  if (!project) return;

  if (project.timeRoundingStepMinutes !== null) {
    roundingStepMinutes.value = project.timeRoundingStepMinutes;
  } else if (props.workspaceRoundingStepMinutes !== null) {
    roundingStepMinutes.value = props.workspaceRoundingStepMinutes;
  }
});

const isCreating = computed(() => submitting.value || props.createMutation.isCreating.value);

const projectOptions = computed(() => {
  const options = props.projects.map((project) => ({
    id: project.id,
    name: project.name,
  }));

  if (props.isAdmin) {
    return [
      { id: WORKSPACE_WIDE_PROJECT_VALUE, name: 'Workspace-wide (no project)' },
      ...options,
    ];
  }

  return options;
});

const currencyOptions = computed(() =>
  getSettingsCurrencyOptions(props.workspaceCurrency),
);

const formElement = ref<HTMLElement>();
const hasDateRange = computed(() => Boolean(dateRange.value?.[0] && dateRange.value[1]));
function calendarDate(value: Date | null | undefined): string | undefined {
  return value && Number.isFinite(value.getTime()) ? getLocalDateKey(value) : undefined;
}
const documentCandidate = computed(() => ({
  ...currentDraft(), hourlyRate: hourlyRate.value, currency: currency.value,
  issueDate: calendarDate(issueDate.value),
  dueDate: dueDate.value && !calendarDate(dueDate.value) ? 'invalid' : calendarDate(dueDate.value) ?? null,
}));
function fieldValue(path: string): string {
  return JSON.stringify(path.split('.').reduce<unknown>((value, key) =>
    value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined,
  documentCandidate.value)) ?? '';
}
const businessFieldErrors = computed(() => {
  const errors = invoiceDocumentErrors(documentCandidate.value);
  if (!props.isAdmin && !selectedProjectId.value) errors.projectId = 'Select a project.';
  for (const [path, error] of Object.entries(serverErrors.value)) {
    if (error.value === fieldValue(path)) errors[path] = error.message;
  }
  return errors;
});
function fieldError(path: string): string | undefined {
  return validationTriggered.value ? businessFieldErrors.value[path] : undefined;
}
const visibleFieldErrors = computed(() => validationTriggered.value ? businessFieldErrors.value : {});
const titleError = computed(() => Boolean(fieldError('title')));
const dateRangeError = computed(() => Boolean(fieldError('dateFrom') || fieldError('dateTo')));
const projectError = computed(() => Boolean(fieldError('projectId')));
const canSubmit = computed(() => !Object.keys(businessFieldErrors.value).length);
async function focusFirstError() {
  await nextTick();
  const input = formElement.value?.querySelector<HTMLElement>('input[aria-invalid="true"], textarea[aria-invalid="true"], [role="combobox"][aria-invalid="true"]');
  input?.scrollIntoView?.({ block: 'center' });
  input?.focus();
}

const entriesState = computed(() => {
  if (!previewQuery.value) return 'initial';
  if (previewError.value) return 'error';
  if (previewLoading.value || !preview.value) return 'loading';
  return previewEmpty.value ? 'empty' : 'ready';
});

const unavailable = computed(() => {
  if (!preview.value || !previewQuery.value || previewError.value) return [];
  const available = new Set(preview.value.entries.map(entry => entry.id));
  return selectedEntries.value.filter(id => !available.has(id)).map(id => {
    const entry = seenEntries.value.get(id);
    return { id, label: [entry?.taskName, entry?.description].filter(Boolean).join(' · ') || id };
  });
});

const visibleTotals = computed(() =>
  (entriesState.value === 'ready' || entriesState.value === 'empty') && !unavailable.value.length
    ? calculatedPreview.value
    : null,
);

const submitBlocked = computed(() =>
  isCreating.value || defaultsPending.value || logoPending.value || props.revisionConflict ||
  (canSubmit.value && (
    calculating.value || !calculatedPreview.value || !preview.value ||
    previewError.value || unavailable.value.length > 0
  )),
);

function reviewEntries() {
  const section = document.getElementById('invoice-editor-entries');
  section?.focus();
  section?.scrollIntoView?.({block: 'start'});
}

async function calculatePreview() {
  const query = previewQuery.value;
  const generation = ++calculationGeneration;
  if (!query || !props.visible) {
    calculatedPreview.value = null;
    calculating.value = false;
    return;
  }
  calculating.value = true;
  calculatedPreview.value = null;
  try {
    const result = await adminInvoicesClient.previewInvoice({...query,title:title.value || 'Preview',hourlyRate:hourlyRate.value ?? undefined,currency:currency.value || undefined,discountPercent:discountPercent.value ?? 0,roundingStepMinutes:roundingStepMinutes.value,timeEntryIds:selectedEntries.value,timeDisplayMode:timeDisplayMode.value});
    if (generation === calculationGeneration) {calculatedPreview.value = result;calculationFailed.value=false;calculationError.value='';}
  } catch (error) {if (generation === calculationGeneration) {
    calculationFailed.value = true;
    calculationError.value = error instanceof Error ? error.message : 'Could not calculate invoice. Retry.';
    if (error instanceof ApiError && error.code === 'invoice_entry_conflict') void refreshEligibility();
  }}
  finally {if (generation === calculationGeneration) calculating.value=false;}
}
watch([previewQuery,hourlyRate,currency,discountPercent,roundingStepMinutes,selectedEntries],()=>void calculatePreview(),{deep:true});
async function retryCalculation() {
 const generation=lifecycleGeneration;
 await refreshEligibility();
 if(generation===lifecycleGeneration && props.visible) await calculatePreview();
}
function handleRateUpdate(value: number | null): void {
  hourlyRate.value = value ?? null;
  rateTouched.value = true;
}

function handleCurrencyUpdate(value: string | undefined): void {
  currency.value = value ?? '';
  currencyTouched.value = true;
}

function handleDiscountUpdate(value: number | null): void {
  discountPercent.value = value ?? 0;
}

function handleRoundingStepUpdate(value: number | undefined): void {
  roundingStepMinutes.value = value ?? 1;
  roundingStepTouched.value = true;
}

function handleVisibleChange(nextVisible: boolean): void {
  emit('update:visible', nextVisible);
}

function currentDraft(): CreateInvoiceInput {
    return {
      issueDate: calendarDate(issueDate.value), dueDate: calendarDate(dueDate.value) ?? null,
      sender: { ...sender.value, email: sender.value.email.trim() }, recipient: { ...recipient.value, email: recipient.value.email.trim() }, payment: projectInvoicePayment(payment.value), services: services.value,
      logo: logo.value, timeEntryIds: selectedEntries.value, groupId: group.value,
      timeDisplayMode: timeDisplayMode.value,
      title: title.value.trim(),
      dateFrom: calendarDate(dateRange.value?.[0]) ?? '',
      dateTo: calendarDate(dateRange.value?.[1]) ?? '',
      projectId: selectedProjectId.value || undefined,
      hourlyRate: hourlyRate.value ?? undefined,
      currency: currency.value.trim().toUpperCase() || undefined,
      discountPercent: discountPercent.value ?? 0,
      notes: notes.value.trim() || null,
      ...(roundingStepTouched.value
        ? { roundingStepMinutes: roundingStepMinutes.value }
        : {}),
    };
}

async function reviewLatestRevision() {
  if (!props.reviewRevision || !hasDateRange.value || reviewPending.value) return;
  reviewPending.value = true;
  const generation = lifecycleGeneration;
  try {
    const {draft, conflicts, savedLogo} = await props.reviewRevision(currentDraft);
    if (generation !== lifecycleGeneration || !props.visible) return;
    title.value = draft.title;
    issueDate.value = new Date((draft.issueDate ?? props.source?.createdAt.slice(0, 10) ?? getLocalDateKey(new Date())) + 'T12:00:00');
    dueDate.value = draft.dueDate ? new Date(draft.dueDate + 'T12:00:00') : null;
    dateRange.value = [new Date(draft.dateFrom + 'T12:00:00'), new Date(draft.dateTo + 'T12:00:00')];
    selectedProjectId.value = draft.projectId ?? null;
    group.value = draft.groupId ?? null;
    hourlyRate.value = draft.hourlyRate ?? null;
    currency.value = draft.currency ?? '';
    discountPercent.value = draft.discountPercent ?? 0;
    roundingStepMinutes.value = draft.roundingStepMinutes ?? 1;
    notes.value = draft.notes ?? '';
    services.value = draft.services ?? '';
    if (draft.sender) sender.value = {...draft.sender};
    if (draft.payment) payment.value = {...draft.payment};
    if (draft.recipient) recipient.value = {...draft.recipient};
    logo.value = draft.logo ?? null;
    selectedEntries.value = draft.timeEntryIds ?? [];
    timeDisplayMode.value = draft.timeDisplayMode ?? 'entries';
    selectedEntriesScope.value = entriesScope.value;
    defaultSelectedEntryIds.value = null;
    saveError.value = '';
    reviewedSavedLogo.value = savedLogo;
    reviewMessage.value = ['Latest saved revision loaded. Review before saving.', ...conflicts].join('\n');
  } catch (error) {
    if (generation === lifecycleGeneration) saveError.value = error instanceof Error ? error.message : 'Could not refresh the saved revision.';
  } finally {
    if (generation === lifecycleGeneration) reviewPending.value = false;
  }
}

function useReviewedLogo() {
  if (reviewedSavedLogo.value === undefined) return;
  logoReadGeneration++;
  logoVersion++;
  logoPending.value = false;
  logoError.value = '';
  logo.value = reviewedSavedLogo.value;
  reviewedSavedLogo.value = undefined;
}

async function handleCreate(): Promise<void> {
  validationTriggered.value = true;
  if (!canSubmit.value) { await focusFirstError(); return; }
  if (submitBlocked.value) return;
  const generation = lifecycleGeneration;
  const draft = currentDraft();
  if (!props.editing && defaultsError.value && !props.source?.logo && logo.value === null && !logoVersion) {
    delete draft.logo;
  }
  submitting.value = true;
  try {
    const invoice = await props.createMutation.createInvoice(draft);

    if(generation!==lifecycleGeneration || !props.visible)return;
    emit('created', invoice);
    emit('update:visible', false);
  } catch (error) {
    if(generation!==lifecycleGeneration || !props.visible)return;
    void refreshEligibility();
    const fields = invoiceServerFieldErrors(error);
    serverErrors.value = Object.fromEntries(Object.entries(fields).map(([path, message]) => [path, { message, value: fieldValue(path) }]));
    saveError.value = Object.keys(fields).length ? '' : error instanceof Error ? error.message : 'Changes were not saved. Review entries and retry.';
    if (Object.keys(fields).length) { submitting.value = false; await focusFirstError(); }
  } finally {
    if (generation === lifecycleGeneration) submitting.value = false;
  }
}
</script>

<template>
  <AppDialog
    :header="editing ? 'Edit invoice' : source ? 'Create from invoice' : 'Create invoice'"
    modal
    :closable="!isCreating"
    :dismissable-mask="!isCreating"
    :close-on-escape="!isCreating"
    :pt="{ root: 'w-screen max-w-[1000px] bg-app-bg rounded-lg border-divider', title: { class: 'text-text-dark' }, pcCloseButton: { root: { class: 'h-11 w-11 rounded-sm border border-divider bg-surface-primary text-brand' }, icon: { class: 'h-4 w-4' } }, header: 'bg-app-bg px-4 pt-4 pb-0 sm:px-6 sm:pt-6', content: 'bg-app-bg px-4 pt-4 pb-4 sm:px-6', footer: 'bg-app-bg px-4 pb-4 pt-0 sm:px-6 sm:pb-6' }"
    :visible="visible"
    @update:visible="handleVisibleChange"
  >
    <div
      ref="formElement"
      class="flex flex-col gap-4"
      :inert="isCreating || undefined"
      :aria-busy="isCreating"
    >
      <input
        ref="logoFile"
        type="file"
        hidden
        accept="image/png,image/svg+xml"
        aria-label="Upload invoice logo"
        @change="selectLogo"
      >
      <p class="text-text-muted text-xs">
        {{ editorCaption }}
      </p>
      <SurfaceCard
        border
        padding-class="p-4"
        body-class="flex flex-col gap-3"
      >
        <h2 class="text-text-dark text-lg font-semibold">
          Invoice information
        </h2>

        <InvoiceDocumentDates
          v-model:issue-date="issueDate"
          v-model:due-date="dueDate"
          :validation-triggered="validationTriggered"
          :errors="visibleFieldErrors"
        />

        <div
          data-testid="invoice-create-row-dates"
          class="flex flex-col gap-4 sm:flex-row sm:gap-3"
        >
          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <label
              for="invoice-create-date-range"
              class="text-text-dark text-[13px] font-medium"
            >Billing period *</label>
            <DatePicker
              :ref="datePicker.datePickerRef"
              v-model="dateRange"
              input-id="invoice-create-date-range"
              date-format="dd M yy"
              icon-display="input"
              :invalid="dateRangeError"
              aria-required="true"
              :aria-describedby="dateRangeError ? 'invoice-period-error' : undefined"
              :manual-input="false"
              selection-mode="range"
              show-button-bar
              show-icon
              class="w-full"
              :pt="{...invoiceDatePickerPt, pcInputText: {...invoiceDatePickerPt.pcInputText, root: {...invoiceDatePickerPt.pcInputText.root, 'aria-required': true, 'aria-describedby': dateRangeError ? 'invoice-period-error' : undefined}}}"
              @show="datePicker.handleShow"
            >
              <template #buttonbar>
                <DatePickerButtonBar
                  @cancel="datePicker.handleCancel"
                  @confirm="datePicker.handleConfirm"
                />
              </template>
            </DatePicker>
            <Message
              v-if="dateRangeError"
              id="invoice-period-error"
              severity="error"
              size="small"
              variant="simple"
            >
              {{ fieldError('dateFrom') || fieldError('dateTo') }}
            </Message>
          </div>
        </div>
        <div class="border-divider grid gap-3 border-t pt-3 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5">
            <label
              for="invoice-create-title"
              class="text-text-dark text-[13px] font-medium"
            >Invoice title *</label>
            <InputText
              id="invoice-create-title"
              v-model="title"
              maxlength="255"
              placeholder="Invoice title"
              :invalid="titleError"
              aria-required="true"
              :aria-describedby="titleError ? 'invoice-title-error' : undefined"
              class="text-text-dark h-[38px] w-full text-[13px] font-normal"
            />
            <Message
              v-if="titleError"
              id="invoice-title-error"
              severity="error"
              size="small"
              variant="simple"
            >
              {{ fieldError('title') }}
            </Message>
          </div>
          <InvoiceGroupSelect
            v-model="group"
            input-id="invoice-group"
            label="Personal group"
            :groups="groupsQuery.data.value?.groups ?? []"
            :loading="groupsQuery.isLoading.value"
            :failed="Boolean(groupsQuery.error.value)"
            @retry="groupsQuery.refetch()"
          />
        </div>
      </SurfaceCard>
      <div class="grid items-start gap-4 sm:grid-cols-2">
        <SurfaceCard
          v-for="{ id, party, label } in partySections"
          :key="id"
          border
          padding-class="p-4"
          body-class="flex flex-col gap-3"
        >
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-text-dark text-lg font-semibold">
              {{ label }}
            </h2>
            <template v-if="label === 'From'">
              <SplitButton
                label="Use settings"
                severity="secondary"
                outlined
                :model="logoActions"
                :pt="{
                  pcButton: { root: { class: 'h-[38px] text-[13px] text-brand' }, label: { class: 'font-medium' } },
                  pcDropdown: { root: { class: 'h-[38px] w-[38px] text-brand' } },
                }"
                :menu-button-props="{'aria-label': 'Invoice logo options'}"
                @click="useSettings()"
              />
            </template>
          </div>
          <p
            v-if="label === 'From'"
            class="text-text-muted text-xs"
          >
            Prefilled from Admin Settings. Changes apply to this invoice only.
          </p>
          <img
            v-if="label === 'From' && logo"
            :src="logo"
            alt="Invoice sender logo"
            class="max-h-16 max-w-full self-start object-contain"
          >
          <label
            v-for="key in (['name','address','email','taxId'] as const)"
            :key="key"
            class="text-text-dark flex flex-col gap-1.5 text-[13px] font-medium"
          >
            {{ {name: label === 'From' ? 'Sender / legal name' : 'Recipient / company', address: 'Address', email: 'Email', taxId: 'Tax ID'}[key] }}{{ key === 'taxId' ? '' : ' *' }}
            <Textarea
              v-if="key === 'address'"
              :id="`invoice-${id}-${key}`"
              v-model="party[key]"
              :aria-required="true"
              :invalid="Boolean(fieldError(`${id}.${key}`))"
              :aria-describedby="fieldError(`${id}.${key}`) ? `invoice-${id}-${key}-error` : undefined"
              rows="1"
              class="text-text-dark field-sizing-content min-h-[38px] w-full text-[13px] leading-5 font-normal"
            />
            <InputText
              v-else
              :id="`invoice-${id}-${key}`"
              v-model="party[key]"
              :aria-required="key !== 'taxId'"
              :invalid="Boolean(fieldError(`${id}.${key}`))"
              :aria-describedby="fieldError(`${id}.${key}`) ? `invoice-${id}-${key}-error` : undefined"
              class="text-text-dark h-[38px] w-full text-[13px] font-normal"
            />
            <Message
              v-if="fieldError(`${id}.${key}`)"
              :id="`invoice-${id}-${key}-error`"
              severity="error"
              size="small"
              variant="simple"
            >
              {{ fieldError(`${id}.${key}`) }}
            </Message>
          </label>
        </SurfaceCard>
      </div>
      <SurfaceCard
        border
        padding-class="p-4"
        body-class="flex flex-col gap-3"
      >
        <h2 class="text-text-dark text-lg font-semibold">
          Services and pricing
        </h2>
        <div class="flex flex-col gap-1.5">
          <label
            for="invoice-services"
            class="text-text-dark text-[13px] font-medium"
          >Services / what is being billed *</label>
          <Textarea
            id="invoice-services"
            v-model="services"
            aria-required="true"
            :invalid="Boolean(fieldError('services'))"
            :aria-describedby="fieldError('services') ? 'invoice-services-error' : undefined"
            class="text-text-dark h-[70px] w-full text-[13px] font-normal"
          />
          <Message
            v-if="fieldError('services')"
            id="invoice-services-error"
            severity="error"
            size="small"
            variant="simple"
          >
            {{ fieldError('services') }}
          </Message>
        </div>
        <div class="flex flex-col gap-1.5">
          <label
            for="invoice-create-project"
            class="text-text-dark text-[13px] font-medium"
          >Project{{ isAdmin ? '' : ' *' }}</label>
          <Select
            v-model="selectedProjectId"
            input-id="invoice-create-project"
            :options="projectOptions"
            option-label="name"
            option-value="id"
            placeholder="Select a project"
            show-clear
            :invalid="projectError"
            :aria-required="!isAdmin"
            :aria-describedby="projectError ? 'invoice-project-error' : undefined"
            class="w-full"
            :pt="{...invoiceSelectPt, label: {...invoiceSelectPt.label, 'aria-required': !isAdmin}}"
          />
          <Message
            v-if="projectError"
            id="invoice-project-error"
            severity="error"
            size="small"
            variant="simple"
          >
            Select a project.
          </Message>
        </div>
        <div
          data-testid="invoice-create-row-pricing"
          class="flex flex-col gap-4 sm:flex-row sm:gap-3"
        >
          <div class="flex w-full min-w-0 flex-col gap-1.5 sm:flex-1">
            <label
              for="invoice-create-hourly-rate"
              class="text-text-dark text-[13px] font-medium"
            >Hourly rate *</label>
            <InputNumber
              input-id="invoice-create-hourly-rate"
              :pt="{pcInputText: {root: {'aria-required': true, 'aria-describedby': fieldError('hourlyRate') ? 'invoice-rate-error' : undefined}}}"
              aria-required="true"
              :invalid="Boolean(fieldError('hourlyRate'))"
              :aria-describedby="fieldError('hourlyRate') ? 'invoice-rate-error' : undefined"
              placeholder="From settings"
              :max="99999999.99"
              :max-fraction-digits="2"
              :min="0"
              :model-value="hourlyRate"
              input-class="h-[38px] w-full text-[13px] font-normal text-text-dark"
              class="w-full"
              @update:model-value="handleRateUpdate"
            />
            <Message
              v-if="fieldError('hourlyRate')"
              id="invoice-rate-error"
              severity="error"
              size="small"
              variant="simple"
            >
              {{ fieldError('hourlyRate') }}
            </Message>
          </div>
          <div class="flex w-full min-w-0 flex-col gap-1.5 sm:flex-1">
            <label
              for="invoice-create-currency"
              class="text-text-dark text-[13px] font-medium"
            >Currency *</label>
            <Select
              input-id="invoice-create-currency"
              aria-label="Currency"
              aria-required="true"
              :invalid="Boolean(fieldError('currency'))"
              :aria-describedby="fieldError('currency') ? 'invoice-currency-error' : undefined"
              :model-value="currency"
              :options="currencyOptions"
              option-label="label"
              option-value="value"
              placeholder="Auto"
              show-clear
              class="w-full"
              :pt="{...invoiceSelectPt, label: {...invoiceSelectPt.label, 'aria-required': true}}"
              @update:model-value="handleCurrencyUpdate"
            />
            <Message
              v-if="fieldError('currency')"
              id="invoice-currency-error"
              severity="error"
              size="small"
              variant="simple"
            >
              {{ fieldError('currency') }}
            </Message>
          </div>

          <div class="flex w-full min-w-0 flex-col gap-1.5 sm:flex-1">
            <label
              for="invoice-create-rounding-step"
              class="text-text-dark text-[13px] font-medium"
            >Rounding</label>
            <Select
              input-id="invoice-create-rounding-step"
              aria-label="Rounding"
              :invalid="Boolean(fieldError('roundingStepMinutes'))"
              :aria-describedby="fieldError('roundingStepMinutes') ? 'invoice-rounding-error' : undefined"
              :model-value="roundingStepMinutes"
              :options="ROUNDING_STEP_OPTIONS"
              option-label="label"
              option-value="value"
              class="w-full"
              :pt="invoiceSelectPt"
              @update:model-value="handleRoundingStepUpdate"
            />
            <Message
              v-if="fieldError('roundingStepMinutes')"
              id="invoice-rounding-error"
              severity="error"
              size="small"
              variant="simple"
            >
              {{ fieldError('roundingStepMinutes') }}
            </Message>
          </div>
        </div>
      </SurfaceCard>
      <SurfaceCard
        v-if="unavailable.length"
        role="alert"
        border
        padding-class="p-5"
        body-class="flex flex-col items-start gap-4"
      >
        <h2 class="text-text-dark text-lg font-semibold">
          Changes were not saved
        </h2>
        <p class="text-text-muted text-sm">
          {{ unavailable.length === 1 ? 'One selected time entry is' : unavailable.length + ' selected time entries are' }} no longer available. Review the highlighted {{ unavailable.length === 1 ? 'entry' : 'entries' }} and retry.
        </p>
        <Button
          label="Review entries"
          icon="pi pi-list-check"
          class="h-[38px]"
          @click="reviewEntries"
        />
      </SurfaceCard>
      <Message
        v-if="saveError || calculationError || revisionConflict"
        severity="error"
      >
        {{ [revisionConflict && 'This invoice changed. Refresh the latest revision, review your edits, and retry.', saveError, calculationError].filter(Boolean).join(' ') }}
        <Button
          v-if="revisionConflict"
          label="Refresh latest revision"
          :loading="reviewPending"
          variant="text"
          @click="reviewLatestRevision"
        />
        <Button
          v-if="calculationFailed"
          label="Refresh entries and retry"
          variant="text"
          :loading="calculating"
          @click="retryCalculation"
        />
      </Message>
      <Message
        v-for="message in [defaultsError, logoError, fieldError('logo')].filter(Boolean)"
        :key="message"
        severity="error"
      >
        {{ message }}
      </Message>
      <Message
        v-if="reviewMessage"
        severity="info"
        class="whitespace-pre-line"
      >
        {{ reviewMessage }}
        <div
          v-if="reviewedSavedLogo !== undefined"
          class="mt-2 flex flex-wrap items-center gap-2"
        >
          <span>{{ reviewedSavedLogo ? 'Latest saved logo' : 'The latest saved revision has no logo.' }}</span>
          <img
            v-if="reviewedSavedLogo"
            :src="reviewedSavedLogo"
            alt="Latest saved invoice logo"
            class="max-h-12 max-w-32 object-contain"
          >
          <Button
            label="Use saved logo"
            variant="text"
            @click="useReviewedLogo"
          />
        </div>
      </Message>

      <InvoiceEditorEntries
        v-model="selectedEntries"
        v-model:time-display-mode="timeDisplayMode"
        :state="entriesState"
        :entries="preview?.entries ?? []"
        :unavailable="unavailable"
        :currency="calculatedPreview?.currency"
        @retry="refreshEligibility()"
      />
      <p
        v-if="calculating"
        role="status"
      >
        Calculating totals…
      </p>
      <SurfaceCard
        border
        padding-class="p-4"
      >
        <dl class="text-text-dark grid grid-cols-[1fr_auto] gap-x-3 gap-y-2.5 text-[13px]">
          <dt v-if="visibleTotals">
            <span class="sr-only">Subtotal · </span>{{ selectedEntries.length }} {{ selectedEntries.length === 1 ? 'entry' : 'entries' }} · {{ visibleTotals.totalHours }}h
          </dt>
          <dd
            v-if="visibleTotals"
            class="text-right"
          >
            {{ formatInvoiceAmount(visibleTotals.subtotal,visibleTotals.currency) }}
          </dd>
          <dt class="col-span-2">
            <div class="flex w-full min-w-0 flex-col gap-1.5 sm:flex-1">
              <label
                for="invoice-create-discount"
                class="text-text-dark text-[13px] font-medium"
              >Discount (%)</label>
              <InputNumber
                input-id="invoice-create-discount"
                :invalid="Boolean(fieldError('discountPercent'))"
                :aria-describedby="fieldError('discountPercent') ? 'invoice-discount-error' : undefined"
                suffix="%"
                :max="100"
                :max-fraction-digits="2"
                :min="0"
                :model-value="discountPercent"
                input-class="h-[38px] w-full text-[13px] font-normal text-text-dark"
                class="w-full"
                @update:model-value="handleDiscountUpdate"
              />
              <Message
                v-if="fieldError('discountPercent')"
                id="invoice-discount-error"
                severity="error"
                size="small"
                variant="simple"
              >
                {{ fieldError('discountPercent') }}
              </Message>
            </div>
          </dt>
          <dt v-if="visibleTotals">
            Discount · {{ discountPercent ?? 0 }}%
          </dt>
          <dd
            v-if="visibleTotals"
            class="text-right"
          >
            {{ (visibleTotals.discountAmount ? '−' : '') + formatInvoiceAmount(visibleTotals.discountAmount, visibleTotals.currency) }}
          </dd>
          <dt
            v-if="visibleTotals"
            class="border-divider col-span-2 border-t"
            aria-hidden="true"
          />
          <dt
            v-if="visibleTotals"
            class="text-base font-semibold"
          >
            Total
          </dt>
          <dd
            v-if="visibleTotals"
            class="text-brand text-right text-lg font-semibold sm:text-2xl"
          >
            {{ formatInvoiceAmount(visibleTotals.totalAmount,visibleTotals.currency) }}
          </dd>
        </dl>
      </SurfaceCard>
      <SurfaceCard
        border
        padding-class="p-4"
        body-class="flex flex-col gap-3"
      >
        <h2 class="text-text-dark text-lg font-semibold">
          How to pay
        </h2>
        <InvoicePaymentFields
          v-model="payment"
          require-complete
          :errors="visibleFieldErrors"
        />
        <label
          for="invoice-create-notes"
          class="text-text-dark flex flex-col gap-1.5 text-[13px] font-medium"
        >
          Notes
          <Textarea
            id="invoice-create-notes"
            v-model="notes"
            :invalid="Boolean(fieldError('notes'))"
            :aria-describedby="fieldError('notes') ? 'invoice-notes-error' : undefined"
            maxlength="5000"
            placeholder="Add notes..."
            class="text-text-dark h-[70px] w-full text-[13px] font-normal"
          />
        </label>
        <Message
          v-if="fieldError('notes')"
          id="invoice-notes-error"
          severity="error"
          size="small"
          variant="simple"
        >
          {{ fieldError('notes') }}
        </Message>
      </SurfaceCard>
    </div>
    <template #footer>
      <div class="flex w-full justify-end">
        <span
          v-if="isCreating"
          class="sr-only"
          role="status"
        >Saving invoice…</span>
        <Button
          :label="editing ? 'Save changes' : 'Create invoice'"
          data-testid="invoice-create-submit"
          class="h-[38px] w-full text-[13px] font-medium sm:w-auto"
          :pt="{ label: { class: 'font-medium' } }"
          :loading="isCreating"
          :disabled="submitBlocked"
          @click="handleCreate"
        />
      </div>
    </template>
  </AppDialog>
</template>
