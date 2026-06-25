import { describe, expect, it } from "vitest";

import {
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
});
