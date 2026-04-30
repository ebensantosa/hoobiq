/**
 * Hoobiq design tokens — Tailwind preset.
 *
 * Brand gradient (from logo): purple → magenta → orange
 *   ultra (#A855F7)  →  brand (#E91E63)  →  flame (#FF6B1A)
 *
 * Palette roles:
 *   ink    — dark gallery surfaces (app bg, panels)
 *   brand  — primary (CTA, highlights, commerce)
 *   flame  — hot / boosted / sale
 *   ultra  — reputation / EXP / secondary accent
 *   parch  — cream reading surfaces (light mode)
 *
 * Semantic layer (canvas/panel/fg/...) lives in globals.css. Light is the
 * default; dark mode is opt-in via the `.dark` class on <html>.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#F5F6FA",
          100: "#E6E8F0",
          200: "#C9CCD9",
          300: "#9A9EB0",
          400: "#6B6F82",
          500: "#3F4355",
          600: "#272A39",
          700: "#1B1D29",
          800: "#13141D",
          900: "#0B0C13",
          950: "#07080D",
        },
        // Hoobiq brand palette — sampled from logo gradient
        // (purple → magenta → orange) for vivid contrast.
        brand: {
          50:  "#FFE7F1",
          100: "#FFCEE3",
          200: "#FF9DC7",
          300: "#FB6AAB",
          400: "#EC4899", // primary magenta-pink (logo middle)
          500: "#D31E7C",
          600: "#A8155F",
          700: "#760D43",
        },
        flame: {
          50:  "#FFF1E6",
          100: "#FFDDBF",
          200: "#FFB783",
          300: "#FF8F4A",
          400: "#FF6B1A", // vivid orange (logo right tip)
          500: "#E04E00",
          600: "#A83A00",
          700: "#732800",
        },
        ultra: {
          50:  "#F5EBFE",
          100: "#E9D5FD",
          200: "#D2A8FB",
          300: "#BC7BF9",
          400: "#A855F7", // vivid purple (logo left tip)
          500: "#8B3DD9",
          600: "#6A28AC",
          700: "#491A78",
        },
        sky: {
          50:  "#EEF3FA",
          100: "#D8E2F2",
          200: "#B0C2E5",
          300: "#8BA4D6",
          400: "#6F8DC8", // cool blue accent
          500: "#5872A8",
          600: "#425683",
          700: "#2C3958",
        },
        parch: {
          50: "#FBF7ED",
          100: "#F5EEDB",
          200: "#EADFBE",
          300: "#D9C99B",
          400: "#B9A26D",
          500: "#8E7947",
        },
        // semantic — consume via bg-canvas, text-fg, border-rule, etc.
        canvas: "hsl(var(--canvas) / <alpha-value>)",
        panel: "hsl(var(--panel) / <alpha-value>)",
        "panel-2": "hsl(var(--panel-2) / <alpha-value>)",
        rule: "hsl(var(--rule) / <alpha-value>)",
        "rule-strong": "hsl(var(--rule-strong) / <alpha-value>)",
        fg: "hsl(var(--fg) / <alpha-value>)",
        "fg-muted": "hsl(var(--fg-muted) / <alpha-value>)",
        "fg-subtle": "hsl(var(--fg-subtle) / <alpha-value>)",
      },
      fontFamily: {
        // All families resolve to Nunito — single typeface across the app.
        // `mono` keeps `font-variant-numeric: tabular-nums` semantics via the
        // utility but renders in Nunito so numbers and code line up with
        // the rest of the UI.
        sans: ["var(--font-sans)", "Nunito", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-sans)", "Nunito", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-sans)", "Nunito", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-lg": ["clamp(3rem, 6vw, 5.5rem)", { lineHeight: "1.02", letterSpacing: "-0.035em", fontWeight: "800" }],
        "display-md": ["clamp(2.25rem, 4vw, 3.5rem)", { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "800" }],
        "display-sm": ["clamp(1.75rem, 3vw, 2.25rem)", { lineHeight: "1.1", letterSpacing: "-0.025em", fontWeight: "700" }],
        eyebrow: ["0.6875rem", { lineHeight: "1", letterSpacing: "0.18em", fontWeight: "600" }],
      },
      borderRadius: {
        card: "16px",
        pill: "999px",
      },
      boxShadow: {
        gallery: "0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 48px -24px rgba(0,0,0,0.6)",
        "gallery-light": "0 1px 0 rgba(0,0,0,0.02) inset, 0 12px 32px -16px rgba(236,72,153,0.18)",
        glow: "0 0 0 1px rgba(236,72,153,0.4), 0 0 36px -6px rgba(236,72,153,0.5)",
        "glow-brand": "0 10px 40px -10px rgba(236,72,153,0.6), 0 0 0 1px rgba(236,72,153,0.3)",
      },
      backgroundImage: {
        // Hoobiq signature gradient — purple → magenta → orange (mirrors logo).
        "brand-sheen":
          "linear-gradient(135deg, #A855F7 0%, #EC4899 55%, #FF6B1A 100%)",
        "brand-soft":
          "linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(236,72,153,0.18) 55%, rgba(255,107,26,0.18) 100%)",
      },
    },
  },
  plugins: [],
};
