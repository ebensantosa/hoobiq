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
        // Hoobiq brand palette (per brand guidelines: collect · connect · trade)
        brand: {
          50:  "#FCE7F3",
          100: "#FBCFE6",
          200: "#F69EC9",
          300: "#F074AC",
          400: "#E7559F", // primary pink
          500: "#C13F84",
          600: "#962E68",
          700: "#6B1F49",
        },
        flame: {
          50:  "#FFF4E6",
          100: "#FFE2B8",
          200: "#FDC788",
          300: "#FCB766",
          400: "#FAA74A", // warm orange
          500: "#D78934",
          600: "#A4651F",
          700: "#6E430F",
        },
        ultra: {
          50:  "#ECEAF5",
          100: "#D5D1E8",
          200: "#ACA4D3",
          300: "#8979BD",
          400: "#6B61AB", // deep purple
          500: "#564E89",
          600: "#423B69",
          700: "#2D2848",
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
        sans: ["var(--font-sans)", "Nunito", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-sans)", "Nunito", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
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
        "gallery-light": "0 1px 0 rgba(0,0,0,0.02) inset, 0 12px 32px -16px rgba(231,85,159,0.14)",
        glow: "0 0 0 1px rgba(231,85,159,0.35), 0 0 36px -6px rgba(231,85,159,0.45)",
        "glow-brand": "0 10px 40px -10px rgba(231,85,159,0.55), 0 0 0 1px rgba(231,85,159,0.25)",
      },
      backgroundImage: {
        // Hoobiq signature gradient — purple → pink → orange, mirrors logo.
        "brand-sheen":
          "linear-gradient(135deg, #6B61AB 0%, #E7559F 55%, #FAA74A 100%)",
        "brand-soft":
          "linear-gradient(135deg, rgba(107,97,171,0.18) 0%, rgba(231,85,159,0.18) 55%, rgba(250,167,74,0.18) 100%)",
      },
    },
  },
  plugins: [],
};
