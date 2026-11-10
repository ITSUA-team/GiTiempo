import { ref, shallowRef, type ComponentPublicInstance } from "vue";

/**
 * Minimal contract for the PrimeVue DatePicker instance accessed via template
 * ref. PrimeVue v4 uses Options API without an `expose` whitelist, so `data()`
 * properties and `$emit` are available on the public instance.
 */
interface DatePickerInstance
  extends ComponentPublicInstance {
  modelValue: unknown;
  overlayVisible: boolean;
}

/**
 * Manages Cancel/Confirm lifecycle for a PrimeVue DatePicker's `#buttonbar`
 * slot.
 *
 * PrimeVue's built-in `showButtonBar` only provides "Today" and "Clear"
 * actions — there is no way to close the overlay while keeping the current
 * selection, or to revert an in-progress selection. This composable fills that
 * gap:
 *
 * - `handleShow` saves a snapshot of the DatePicker's `modelValue` when the
 *   overlay opens (bind to `@show`).
 * - `handleConfirm` closes the overlay without touching the value — the
 *   DatePicker has already emitted `update:modelValue` for each date click.
 * - `handleCancel` reverts the value to the saved snapshot by emitting
 *   `update:modelValue` on the DatePicker instance, then closes the overlay.
 *
 * The overlay is closed by setting `overlayVisible` on the component instance.
 * This is an internal data property, but PrimeVue v4 exposes all `data()`
 * properties on the public instance (no `expose` whitelist), and there is no
 * public `hide()` method.
 *
 * Existing behaviour (click-outside, Escape, auto-close on single selection)
 * is preserved — the buttons are additive.
 *
 * @example
 * const picker = useDatePickerConfirmCancel<Date[]>();
 * // <DatePicker :ref="picker.datePickerRef" show-button-bar @show="picker.handleShow">
 * //   <template #buttonbar>
 * //     <DatePickerButtonBar @cancel="picker.handleCancel" @confirm="picker.handleConfirm" />
 * //   </template>
 * // </DatePicker>
 */
export function useDatePickerConfirmCancel<T = unknown>() {
  const datePickerRef = ref<DatePickerInstance | null>(null);
  const previousValue = shallowRef<T | null>(null);

  function handleShow(): void {
    const instance = datePickerRef.value;
    if (instance) {
      previousValue.value = (instance.modelValue as T) ?? null;
    }
  }

  function handleConfirm(): void {
    closeOverlay();
  }

  function handleCancel(): void {
    const instance = datePickerRef.value;
    if (instance) {
      instance.$emit("update:modelValue", previousValue.value);
    }
    closeOverlay();
  }

  function closeOverlay(): void {
    const instance = datePickerRef.value;
    if (instance) {
      instance.overlayVisible = false;
    }
  }

  return { datePickerRef, handleShow, handleConfirm, handleCancel };
}