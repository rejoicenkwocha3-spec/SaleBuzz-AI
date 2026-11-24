import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#102A43", deep: "#0B1F33" },
        teal: { DEFAULT: "#0D9488" },
        emerald: { DEFAULT: "#10B981" },
        lime: { DEFAULT: "#84CC16" },
        mint: "#DDF7EF",
        canvas: "#F7F9FC",
        ink: "#172B4D",
        muted: "#64748B",
      },
      fontFamily: { heading: ["Manrope", "sans-serif"], sans: ["Inter", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;
