import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        border: "var(--border)",
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        },
        profit: {
          light: "#10b981",
          DEFAULT: "#059669",
          dark: "#047857",
          bg: "rgba(16, 185, 129, 0.12)",
        },
        loss: {
          light: "#ef4444",
          DEFAULT: "#dc2626",
          dark: "#b91c1c",
          bg: "rgba(239, 68, 68, 0.12)",
        }
      },
    },
  },
  plugins: [],
};
export default config;
