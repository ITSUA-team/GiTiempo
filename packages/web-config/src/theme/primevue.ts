import { definePreset } from "@primeuix/themes";
import Aura from "@primeuix/themes/aura";

export const giTiempoAutoCompleteOverlayClass = "overflow-hidden";

export const giTiempoSelfAppendedAutoCompleteOverlayClass = "w-full max-w-full";

export const giTiempoSelfAppendedAutoCompleteOverlayStyle = {
  boxSizing: "border-box",
  maxWidth: "100%",
  minWidth: "100%",
  width: "100%",
} as const;

export const giTiempoDropdownControlBaseClass =
  "border-divider bg-surface-primary h-[38px] border font-sans text-[14px] font-medium text-text-dark shadow-none";

export const giTiempoDropdownControlInputClass =
  `${giTiempoDropdownControlBaseClass} w-full rounded-[6px] px-3`;

export const giTiempoDropdownControlJoinedInputClass =
  `${giTiempoDropdownControlBaseClass} w-full rounded-l-[6px] rounded-r-none px-3`;

export const giTiempoDropdownControlRootClass =
  `${giTiempoDropdownControlBaseClass} w-full rounded-[6px]`;

export const giTiempoDropdownControlLabelClass =
  "flex h-full items-center px-3 py-0 font-sans text-[14px] font-medium text-text-dark";

export const giTiempoDropdownControlTriggerClass =
  "h-[38px] w-9 text-text-muted";

export const giTiempoSelectPt = {
  root: { class: giTiempoDropdownControlRootClass },
  label: { class: giTiempoDropdownControlLabelClass },
  dropdown: { class: giTiempoDropdownControlTriggerClass },
} as const;

export const giTiempoDatePickerPt = {
  root: { class: "h-[38px] w-full" },
  pcInputText: {
    root: { class: giTiempoDropdownControlInputClass },
  },
  dropdown: { class: giTiempoDropdownControlTriggerClass },
  panel: {
    class:
      "border-divider bg-surface-primary rounded-md border text-text-dark shadow-popover",
  },
} as const;

export const giTiempoDropdownAutoCompletePt = {
  root: { class: "h-[38px]" },
  pcInputText: {
    root: { class: giTiempoDropdownControlJoinedInputClass },
  },
  dropdown: { class: giTiempoDropdownControlTriggerClass },
  option: { class: "font-sans text-[14px]" },
} satisfies GiTiempoAutoCompletePt;

export const giTiempoAutoCompletePt = {
  listContainer: { class: "max-w-full overflow-x-hidden" },
  option: { class: "max-w-full min-w-0 truncate" },
  overlay: {
    class: giTiempoAutoCompleteOverlayClass,
  },
  pcInputText: { root: { class: "truncate" } },
  root: { class: "relative w-full max-w-full min-w-0" },
} as const;

export const giTiempoDialogCloseButtonPt = {
  root: {
    class:
      "rounded-none border-0 bg-transparent text-text-muted shadow-none ring-0 hover:border-transparent hover:bg-transparent hover:text-text-dark focus:border-transparent focus:bg-transparent focus:outline-none focus:ring-0 focus:shadow-none focus-visible:outline-none focus-visible:ring-0 active:border-transparent active:bg-transparent",
  },
} as const;

export const giTiempoConfirmDialogPt = {
  pcCloseButton: giTiempoDialogCloseButtonPt,
} as const;

export const giTiempoDialogPt = {
  pcCloseButton: {
    ...giTiempoDialogCloseButtonPt,
  },
} as const;

type PrimeVuePtSection = {
  class?: string;
  style?: Readonly<Record<string, string>>;
  [attribute: string]: unknown;
};

type AutoCompleteInputPt = {
  root?: PrimeVuePtSection;
};

type AutoCompleteNestedPt = {
  root?: PrimeVuePtSection;
  [attribute: string]: unknown;
};

export type GiTiempoAutoCompletePt = {
  chipIcon?: PrimeVuePtSection;
  chipItem?: PrimeVuePtSection;
  dropdown?: PrimeVuePtSection;
  inputMultiple?: PrimeVuePtSection;
  listContainer?: PrimeVuePtSection;
  option?: PrimeVuePtSection;
  overlay?: PrimeVuePtSection;
  pcChip?: AutoCompleteNestedPt;
  pcInputText?: AutoCompleteInputPt;
  root?: PrimeVuePtSection;
};

function mergeClassNames(
  baseClass: string | undefined,
  overrideClass: string | undefined,
): string | undefined {
  return [baseClass, overrideClass].filter(Boolean).join(" ") || undefined;
}

function mergeStyles(
  baseStyle: Readonly<Record<string, string>> | undefined,
  overrideStyle: Readonly<Record<string, string>> | undefined,
): Readonly<Record<string, string>> | undefined {
  const style = {
    ...(baseStyle ?? {}),
    ...(overrideStyle ?? {}),
  };

  return Object.keys(style).length > 0 ? style : undefined;
}

function mergePtSection(
  base: PrimeVuePtSection | undefined,
  override: PrimeVuePtSection | undefined,
): PrimeVuePtSection | undefined {
  if (!base) {
    return override;
  }

  if (!override) {
    return base;
  }

  return {
    ...base,
    ...override,
    class: mergeClassNames(base.class, override.class),
    style: mergeStyles(base.style, override.style),
  };
}

function mergeNestedPtSection(
  base: AutoCompleteNestedPt | undefined,
  override: AutoCompleteNestedPt | undefined,
): AutoCompleteNestedPt | undefined {
  if (!base) {
    return override;
  }

  if (!override) {
    return base;
  }

  return {
    ...base,
    ...override,
    root: mergePtSection(base.root, override.root),
  };
}

function composeAutoCompletePt(
  baseline: GiTiempoAutoCompletePt,
  override: GiTiempoAutoCompletePt,
): GiTiempoAutoCompletePt {
  return {
    ...baseline,
    ...override,
    chipIcon: mergePtSection(baseline.chipIcon, override.chipIcon),
    chipItem: mergePtSection(baseline.chipItem, override.chipItem),
    dropdown: mergePtSection(baseline.dropdown, override.dropdown),
    inputMultiple: mergePtSection(baseline.inputMultiple, override.inputMultiple),
    listContainer: mergePtSection(
      baseline.listContainer,
      override.listContainer,
    ),
    option: mergePtSection(baseline.option, override.option),
    overlay: mergePtSection(baseline.overlay, override.overlay),
    pcChip: mergeNestedPtSection(baseline.pcChip, override.pcChip),
    pcInputText: {
      ...baseline.pcInputText,
      ...override.pcInputText,
      root: mergePtSection(
        baseline.pcInputText?.root,
        override.pcInputText?.root,
      ),
    },
    root: mergePtSection(baseline.root, override.root),
  };
}

export function composeGiTiempoAutoCompletePt(
  override: GiTiempoAutoCompletePt = {},
): GiTiempoAutoCompletePt {
  return composeAutoCompletePt(
    giTiempoAutoCompletePt as GiTiempoAutoCompletePt,
    override,
  );
}

export const giTiempoSelfAppendedAutoCompletePt = composeGiTiempoAutoCompletePt({
  overlay: {
    class: giTiempoSelfAppendedAutoCompleteOverlayClass,
    style: giTiempoSelfAppendedAutoCompleteOverlayStyle,
  },
});

export const giTiempoAutoCompleteDropdownPt = composeGiTiempoAutoCompletePt(
  giTiempoDropdownAutoCompletePt,
);

export const giTiempoSelfAppendedAutoCompleteDropdownPt =
  composeGiTiempoSelfAppendedAutoCompletePt(giTiempoDropdownAutoCompletePt);

export function composeGiTiempoSelfAppendedAutoCompletePt(
  override: GiTiempoAutoCompletePt = {},
): GiTiempoAutoCompletePt {
  return composeAutoCompletePt(giTiempoSelfAppendedAutoCompletePt, override);
}

export function composeGiTiempoSelfAppendedAutoCompleteDropdownPt(
  override: GiTiempoAutoCompletePt = {},
): GiTiempoAutoCompletePt {
  return composeAutoCompletePt(
    giTiempoSelfAppendedAutoCompleteDropdownPt,
    override,
  );
}

export const giTiempoThemePreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: "#f3eef8",
      100: "#E8E1F5",
      200: "#c9b5e0",
      300: "#ab89cb",
      400: "#8c5db6",
      500: "#5D2B85",
      600: "#4e2470",
      700: "#3f1d5b",
      800: "#301646",
      900: "#210f31",
      950: "#12081c",
    },
    colorScheme: {
      light: {
        primary: {
          color: "#5D2B85",
          contrastColor: "#ffffff",
          hoverColor: "#4e2470",
          activeColor: "#3f1d5b",
        },
        surface: {
          0: "#ffffff",
          50: "#F4F4F5",
          100: "#EEEEEE",
          200: "#e0e0e0",
          300: "#c7c7c7",
          400: "#a0a0a0",
          500: "#666666",
          600: "#555555",
          700: "#444444",
          800: "#333333",
          900: "#1A1A1A",
          950: "#0d0d0d",
        },
      },
    },
  },
  components: {
    button: {
      css: `
        .p-button-outlined.p-button-secondary {
          background: var(--p-surface-0);
        }
      `,
    },
  },
});

export const giTiempoPrimeVueOptions = {
  pt: {
    autocomplete: giTiempoAutoCompletePt,
    confirmdialog: giTiempoConfirmDialogPt,
    dialog: giTiempoDialogPt,
  },
  theme: {
    preset: giTiempoThemePreset,
    options: {
      darkModeSelector: false,
      cssLayer: {
        name: "primevue",
        order: "theme, base, primevue, components, utilities",
      },
    },
  },
} as const;
