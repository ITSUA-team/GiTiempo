import { describe, expect, it } from "vitest";

import {
  composeGiTiempoAutoCompletePt,
  composeGiTiempoSelfAppendedAutoCompleteDropdownPt,
  composeGiTiempoSelfAppendedAutoCompletePt,
  giTiempoAutoCompleteDropdownPt,
  giTiempoAutoCompletePt,
  giTiempoConfirmDialogPt,
  giTiempoDatePickerPt,
  giTiempoDialogCloseButtonPt,
  giTiempoDialogPt,
  giTiempoDropdownControlInputClass,
  giTiempoSelectPt,
  giTiempoPrimeVueOptions,
  giTiempoSelfAppendedAutoCompleteDropdownPt,
  giTiempoSelfAppendedMultiAutoCompleteDropdownPt,
  giTiempoSelfAppendedAutoCompleteOverlayClass,
  giTiempoSelfAppendedAutoCompleteOverlayStyle,
  giTiempoSelfAppendedAutoCompletePt,
} from "./primevue";

describe("giTiempoPrimeVueOptions", () => {
  it("defines one shared autocomplete baseline", () => {
    expect(giTiempoAutoCompletePt).toMatchObject({
      listContainer: { class: "max-w-full overflow-x-hidden" },
      option: { class: "max-w-full min-w-0 truncate" },
      overlay: {
        class: "overflow-hidden",
      },
      pcInputText: { root: { class: "truncate" } },
      root: { class: "relative w-full max-w-full min-w-0" },
    });
    expect(giTiempoAutoCompletePt.overlay).not.toHaveProperty("style");
    expect(giTiempoPrimeVueOptions.pt.autocomplete).toBe(giTiempoAutoCompletePt);
  });

  it("defines one shared borderless dialog close button treatment", () => {
    expect(giTiempoDialogCloseButtonPt.root.class).toContain("rounded-none");
    expect(giTiempoDialogCloseButtonPt.root.class).toContain("border-0");
    expect(giTiempoDialogCloseButtonPt.root.class).toContain("bg-transparent");
    expect(giTiempoDialogCloseButtonPt.root.class).toContain("focus:outline-none");
    expect(giTiempoDialogCloseButtonPt.root.class).toContain("focus-visible:outline-none");
    expect(giTiempoDialogCloseButtonPt.root.class).not.toContain("rounded-full");
    expect(giTiempoDialogCloseButtonPt.root.class).not.toContain("focus-visible:outline-2");
    expect(giTiempoConfirmDialogPt.pcCloseButton).toBe(giTiempoDialogCloseButtonPt);
    expect(giTiempoDialogPt.pcCloseButton).toMatchObject(giTiempoDialogCloseButtonPt);
    expect(giTiempoPrimeVueOptions.pt.confirmdialog).toBe(giTiempoConfirmDialogPt);
    expect(giTiempoPrimeVueOptions.pt.dialog).toBe(giTiempoDialogPt);
  });

  it("composes autocomplete instance overrides with the shared baseline", () => {
    expect(
      composeGiTiempoAutoCompletePt({
        option: { class: "text-[13px]" },
        pcInputText: { root: { class: "h-[38px]" } },
        root: { class: "h-[38px]" },
      }),
    ).toMatchObject({
      listContainer: { class: "max-w-full overflow-x-hidden" },
      option: { class: "max-w-full min-w-0 truncate text-[13px]" },
      overlay: {
        class: "overflow-hidden",
      },
      pcInputText: { root: { class: "truncate h-[38px]" } },
      root: { class: "relative w-full max-w-full min-w-0 h-[38px]" },
    });
  });

  it("composes multiple autocomplete chip styles with valid PrimeVue pt keys", () => {
    expect(
      composeGiTiempoAutoCompletePt({
        pcChip: { root: { class: "bg-accent-tint" } },
      }).pcChip?.root,
    ).toMatchObject({
      class: "bg-accent-tint",
    });
  });

  it("defines one shared dropdown control treatment", () => {
    expect(giTiempoSelectPt.root.class).toContain("h-[38px]");
    expect(giTiempoSelectPt.root.class).toContain("border-divider");
    expect(giTiempoSelectPt.label.class).toContain("text-[14px]");
    expect(giTiempoSelectPt.dropdown.class).toContain("w-9");
    expect(giTiempoSelectPt.dropdown.class).toContain("bg-transparent");
    expect(giTiempoDatePickerPt.pcInputText.root.class).toBe(
      giTiempoDropdownControlInputClass,
    );
    expect(giTiempoAutoCompleteDropdownPt.root?.class).toContain("border-divider");
    expect(giTiempoAutoCompleteDropdownPt.pcInputText?.root?.class).toContain(
      "border-0",
    );
    expect(giTiempoAutoCompleteDropdownPt.dropdown?.class).toContain("h-[38px]");
    expect(giTiempoAutoCompleteDropdownPt.dropdown?.class).toContain("bg-transparent");
    expect(giTiempoSelfAppendedAutoCompleteDropdownPt.overlay?.style).toEqual(
      giTiempoSelfAppendedAutoCompleteOverlayStyle,
    );
    // Self-appended overlays render inside the root; overflow-hidden there
    // would clip the dropdown panel into invisibility.
    expect(giTiempoSelfAppendedAutoCompleteDropdownPt.root?.class).not.toContain(
      "overflow-hidden",
    );
    expect(
      composeGiTiempoSelfAppendedAutoCompleteDropdownPt({
        pcInputText: { root: { autocomplete: "off" } },
      }).pcInputText?.root,
    ).toMatchObject({
      autocomplete: "off",
      class: expect.stringContaining("border-0"),
    });
  });

  it("defines one shared multi autocomplete dropdown treatment", () => {
    expect(giTiempoSelfAppendedMultiAutoCompleteDropdownPt.root?.class).toContain(
      "min-h-[38px]",
    );
    expect(
      giTiempoSelfAppendedMultiAutoCompleteDropdownPt.root?.class,
    ).toContain("border-divider");
    expect(
      giTiempoSelfAppendedMultiAutoCompleteDropdownPt.root?.class,
    ).toContain("bg-surface-primary");
    expect(
      giTiempoSelfAppendedMultiAutoCompleteDropdownPt.inputMultiple?.class,
    ).toContain("text-[14px]");
    expect(giTiempoSelfAppendedMultiAutoCompleteDropdownPt.dropdown?.class).toContain(
      "bg-transparent",
    );
    expect(giTiempoSelfAppendedMultiAutoCompleteDropdownPt.pcChip?.root?.class).toContain(
      "bg-accent-tint",
    );
  });

  it("keeps width-constraining overlay styles explicit for self-appended autocomplete", () => {
    expect(giTiempoSelfAppendedAutoCompleteOverlayClass).toBe("w-full max-w-full");
    expect(giTiempoSelfAppendedAutoCompleteOverlayStyle).toEqual({
      boxSizing: "border-box",
      maxWidth: "100%",
      minWidth: "100%",
      width: "100%",
    });
    expect(giTiempoSelfAppendedAutoCompletePt).toMatchObject({
      overlay: {
        class: "overflow-hidden w-full max-w-full",
        style: giTiempoSelfAppendedAutoCompleteOverlayStyle,
      },
    });
    expect(
      composeGiTiempoSelfAppendedAutoCompletePt({
        overlay: { class: "rounded-md", style: { zIndex: "10" } },
      }),
    ).toMatchObject({
      overlay: {
        class: "overflow-hidden w-full max-w-full rounded-md",
        style: {
          ...giTiempoSelfAppendedAutoCompleteOverlayStyle,
          zIndex: "10",
        },
      },
    });
  });
});
