import { describe, expect, it } from "vitest";

import {
  composeGiTiempoAutoCompletePt,
  giTiempoAutoCompleteOverlayClass,
  giTiempoAutoCompleteOverlayStyle,
  giTiempoAutoCompletePt,
  giTiempoPrimeVueOptions,
} from "./primevue";

describe("giTiempoPrimeVueOptions", () => {
  it("defines one shared autocomplete baseline", () => {
    expect(giTiempoAutoCompleteOverlayClass).toBe("w-full max-w-full overflow-hidden");
    expect(giTiempoAutoCompleteOverlayStyle).toEqual({
      boxSizing: "border-box",
      maxWidth: "100%",
      minWidth: "100%",
      width: "100%",
    });
    expect(giTiempoAutoCompletePt).toMatchObject({
      listContainer: { class: "max-w-full overflow-x-hidden" },
      option: { class: "max-w-full min-w-0 truncate" },
      overlay: {
        class: giTiempoAutoCompleteOverlayClass,
        style: giTiempoAutoCompleteOverlayStyle,
      },
      pcInputText: { root: { class: "truncate" } },
      root: { class: "relative w-full max-w-full min-w-0" },
    });
    expect(giTiempoPrimeVueOptions.pt.autocomplete).toBe(giTiempoAutoCompletePt);
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
        class: giTiempoAutoCompleteOverlayClass,
        style: giTiempoAutoCompleteOverlayStyle,
      },
      pcInputText: { root: { class: "truncate h-[34px]" } },
      root: { class: "relative w-full max-w-full min-w-0 h-[34px]" },
    });
  });
});
