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
        l2h: {
          black: "#09090b",
          dark: "#0c0c0e",
          charcoal: "#18181b",
          card: "#121215",
          border: "#27272a",
          surface: "#ffffff",
          muted: "#f4f4f5",
          accent: "#000000",
        },
        brand: {
          50: "#fafafa",
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#3f3f46",
          800: "#27272a",
          900: "#18181b",
          950: "#09090b",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        serif: ["var(--font-serif)", "Playfair Display", "Georgia", "serif"],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.05), 0 10px 20px -2px rgba(0, 0, 0, 0.02)',
        'luxury': '0 10px 30px -10px rgba(0, 0, 0, 0.08)',
        'luxury-hover': '0 20px 40px -15px rgba(0, 0, 0, 0.15)',
        'glow-dark': '0 0 30px -5px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
};
export default config;
