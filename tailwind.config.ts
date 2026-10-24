import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme-aware semantic color variables
        page: "var(--bg-page)",
        surface: "var(--surface-card)",
        "surface-elevated": "var(--surface-elevated)",
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)",
        border: "var(--border-subtle)",
        "border-focus": "var(--border-focus)",

        // Bespoke Atelier Design Tokens
        parchment: "#F6F0E8",
        cream: "#FBF8F3",
        aubergine: {
          DEFAULT: "#342238",
          dark: "#201923",
          deep: "#161118",
          surface: "#2A212E",
        },
        plum: {
          DEFAULT: "#342238",
          dark: "#201923",
          light: "#4E3553",
        },
        wine: {
          DEFAULT: "#694451",
          light: "#825766",
          dark: "#4E323D",
        },
        coral: {
          DEFAULT: "#D97768",
          hover: "#C86455",
          light: "#FDF4F2",
          dark: "#E48E80",
        },
        champagne: {
          DEFAULT: "#C6A66B",
          dark: "#9E7D3B",
          light: "#FAF4E9",
        },
        taupe: {
          DEFAULT: "#E5DDD1",
          light: "#EFE8DE",
          dark: "#36293A",
        },
        status: {
          success: "#2A7942",
          warning: "#B45309",
          error: "#C53030",
        },
      },
      fontFamily: {
        serif: ["var(--font-editorial)", "Playfair Display", "Georgia", "Cambria", "serif"],
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(52, 34, 56, 0.04), 0 1px 2px -1px rgba(52, 34, 56, 0.04)",
        card: "0 4px 20px -2px rgba(52, 34, 56, 0.06)",
        atelier: "0 10px 30px -10px rgba(52, 34, 56, 0.08)",
        coral: "0 8px 24px -4px rgba(217, 119, 104, 0.25)",
        dropdown: "0 10px 30px -5px rgba(52, 34, 56, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
