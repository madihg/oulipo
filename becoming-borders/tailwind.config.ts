import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["'EB Garamond'", "Georgia", "serif"],
      },
      colors: {
        black: "#000000",
        white: "#ffffff",
        gray: {
          80: "rgba(0, 0, 0, 0.8)",
          60: "rgba(0, 0, 0, 0.6)",
          50: "rgba(0, 0, 0, 0.5)",
          40: "rgba(0, 0, 0, 0.4)",
          30: "rgba(0, 0, 0, 0.3)",
          20: "rgba(0, 0, 0, 0.2)",
          10: "rgba(0, 0, 0, 0.1)",
          5: "rgba(0, 0, 0, 0.05)",
        },
      },
      boxShadow: {
        subtle: "2px 3px 8px rgba(0, 0, 0, 0.08)",
        medium: "2px 3px 12px rgba(0, 0, 0, 0.1)",
        strong: "3px 4px 15px rgba(0, 0, 0, 0.15)",
        lift: "5px 8px 20px rgba(0, 0, 0, 0.2)",
      },
      letterSpacing: {
        open: "0.05em",
        wide: "0.1em",
        elegant: "0.15em",
      },
      keyframes: {
        pulse: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.1)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeOut: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
      },
      animation: {
        pulse: "pulse 2s ease-in-out infinite",
        "fade-in": "fadeIn 0.5s ease forwards",
        "fade-out": "fadeOut 0.5s ease forwards",
      },
    },
  },
  plugins: [],
};
export default config;
