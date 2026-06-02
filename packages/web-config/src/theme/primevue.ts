import { definePreset } from "@primeuix/themes";
import Aura from "@primeuix/themes/aura";

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
