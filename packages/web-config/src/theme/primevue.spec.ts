import { describe, expect, it } from "vitest";

import {
  composeGiTiempoAutoCompletePt,
  composeGiTiempoSelfAppendedAutoCompletePt,
  giTiempoAutoCompletePt,
  giTiempoConfirmDialogPt,
  giTiempoDialogCloseButtonPt,
  giTiempoDialogPt,
  giTiempoPrimeVueOptions,
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
        option: { class: "text-[12px]" },
        pcInputText: { root: { class: "h-[34px]" } },
        root: { class: "h-[34px]" },
      }),
    ).toMatchObject({
      listContainer: { class: "max-w-full overflow-x-hidden" },
      option: { class: "max-w-full min-w-0 truncate text-[12px]" },
      overlay: {
        class: "overflow-hidden",
      },
      pcInputText: { root: { class: "truncate h-[34px]" } },
      root: { class: "relative w-full max-w-full min-w-0 h-[34px]" },
    });
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
