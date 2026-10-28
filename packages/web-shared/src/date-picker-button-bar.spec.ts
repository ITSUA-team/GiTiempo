import { describe, expect, it, vi } from "vitest";

import { useDatePickerConfirmCancel } from "./date-picker-button-bar";

function createMockInstance(
  modelValue: unknown,
  overlayVisible: boolean,
): {
  instance: Record<string, unknown>;
  setModelValue: (value: unknown) => void;
} {
  const props = { modelValue };
  const data = { overlayVisible };
  const emit = vi.fn();

  const instance = {
    modelValue: props.modelValue,
    overlayVisible: data.overlayVisible,
    $emit: emit,
  };

  return {
    instance,
    setModelValue: (value: unknown) => {
      instance.modelValue = value;
    },
  };
}

describe("useDatePickerConfirmCancel", () => {
  it("saves the current modelValue when the overlay opens", () => {
    const picker = useDatePickerConfirmCancel<Date[]>();
    const { instance } = createMockInstance(
      [new Date("2026-01-01"), new Date("2026-01-31")],
      false,
    );
    picker.datePickerRef.value = instance as never;

    picker.handleShow();

    // previousValue is internal, but handleCancel reverts to it — verify
    // by checking that cancel emits the saved value.
    (instance as { modelValue: unknown }).modelValue = [
      new Date("2026-02-01"),
      new Date("2026-02-28"),
    ];
    picker.handleCancel();

    expect(instance.$emit).toHaveBeenCalledWith("update:modelValue", [
      new Date("2026-01-01"),
      new Date("2026-01-31"),
    ]);
  });

  it("reverts to the previous value and closes the overlay on cancel", () => {
    const picker = useDatePickerConfirmCancel<Date | null>();
    const { instance } = createMockInstance(
      new Date("2026-03-15"),
      true,
    );
    picker.datePickerRef.value = instance as never;

    picker.handleShow();
    // Simulate the user picking a different date.
    (instance as { modelValue: unknown }).modelValue = new Date("2026-04-20");
    picker.handleCancel();

    expect(instance.$emit).toHaveBeenCalledWith(
      "update:modelValue",
      new Date("2026-03-15"),
    );
    expect(instance.overlayVisible).toBe(false);
  });

  it("closes the overlay without changing the value on confirm", () => {
    const picker = useDatePickerConfirmCancel<Date[]>();
    const { instance } = createMockInstance(
      [new Date("2026-05-01"), new Date("2026-05-31")],
      true,
    );
    picker.datePickerRef.value = instance as never;

    picker.handleShow();
    // Simulate the user picking new dates.
    (instance as { modelValue: unknown }).modelValue = [
      new Date("2026-06-01"),
      new Date("2026-06-30"),
    ];
    picker.handleConfirm();

    // Confirm must NOT emit update:modelValue — the DatePicker already emitted
    // it for each date click.
    expect(instance.$emit).not.toHaveBeenCalled();
    expect(instance.overlayVisible).toBe(false);
  });

  it("handles null previous value correctly on cancel", () => {
    const picker = useDatePickerConfirmCancel<Date[] | null>();
    const { instance } = createMockInstance(null, true);
    picker.datePickerRef.value = instance as never;

    picker.handleShow();
    (instance as { modelValue: unknown }).modelValue = [
      new Date("2026-07-01"),
      new Date("2026-07-31"),
    ];
    picker.handleCancel();

    expect(instance.$emit).toHaveBeenCalledWith("update:modelValue", null);
    expect(instance.overlayVisible).toBe(false);
  });

  it("does not throw when the ref is not yet mounted", () => {
    const picker = useDatePickerConfirmCancel();
    picker.datePickerRef.value = null;

    expect(() => picker.handleShow()).not.toThrow();
    expect(() => picker.handleConfirm()).not.toThrow();
    expect(() => picker.handleCancel()).not.toThrow();
  });
});