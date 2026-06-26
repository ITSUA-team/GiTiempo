import { definePreset } from "@primeuix/themes";
import Aura from "@primeuix/themes/aura";

export const giTiempoAutoCompleteOverlayClass = "w-full max-w-full overflow-hidden";

export const giTiempoAutoCompleteOverlayStyle = {
  boxSizing: "border-box",
  maxWidth: "100%",
  minWidth: "100%",
  width: "100%",
} as const;

export const giTiempoAutoCompletePt = {
  listContainer: { class: "max-w-full overflow-x-hidden" },
  option: { class: "max-w-full min-w-0 truncate" },
  overlay: {
    class: giTiempoAutoCompleteOverlayClass,
    style: giTiempoAutoCompleteOverlayStyle,
  },
  pcInputText: { root: { class: "truncate" } },
  root: { class: "relative w-full max-w-full min-w-0" },
} as const;

type PrimeVuePtSection = {
  class?: string;
  style?: Readonly<Record<string, string>>;
  [attribute: string]: unknown;
};

type AutoCompleteInputPt = {
  root?: PrimeVuePtSection;
};

export type GiTiempoAutoCompletePt = {
  chip?: PrimeVuePtSection;
  dropdown?: PrimeVuePtSection;
  inputMultiple?: PrimeVuePtSection;
  listContainer?: PrimeVuePtSection;
  option?: PrimeVuePtSection;
  overlay?: PrimeVuePtSection;
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

export function composeGiTiempoAutoCompletePt(
  override: GiTiempoAutoCompletePt = {},
): GiTiempoAutoCompletePt {
  const baseline = giTiempoAutoCompletePt as GiTiempoAutoCompletePt;

  return {
    ...baseline,
    ...override,
    chip: mergePtSection(baseline.chip, override.chip),
    dropdown: mergePtSection(baseline.dropdown, override.dropdown),
    inputMultiple: mergePtSection(baseline.inputMultiple, override.inputMultiple),
    listContainer: mergePtSection(
      baseline.listContainer,
      override.listContainer,
    ),
    option: mergePtSection(baseline.option, override.option),
    overlay: mergePtSection(baseline.overlay, override.overlay),
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
