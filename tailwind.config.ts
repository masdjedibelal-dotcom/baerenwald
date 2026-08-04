import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        "p2-head": ["var(--p2-font-head)"],
        "p2-body": ["var(--p2-font-body)"],
      },
      colors: {
        accent: {
          DEFAULT: "#2E7D52",
          dark: "#1A3D2B",
          light: "#E7F1E9",
          hover: "#2a724b",
          foreground: "#FFFFFF",
        },
        surface: {
          page: "#e6e8e6",
          card: "#ffffff",
          muted: "#EDEAE4",
          dark: "#1A3D2B",
        },
        text: {
          primary: "#16201B",
          secondary: "#404A45",
          tertiary: "#6A746F",
          inverse: "#FFFFFF",
          brand: "#2E7D52",
        },
        /** Portal 2.0 Mock `const C` — Nutzung: `bg-p2-bg`, `text-p2-ink`, … */
        p2: {
          bg: "#e6e8e6",
          panel: "#ffffff",
          line: "rgba(0,0,0,0.08)",
          line2: "rgba(0,0,0,0.05)",
          ink: "#16201B",
          sub: "#404A45",
          faint: "#6A746F",
          faint2: "#9AA39E",
          primary: "#2E7D52",
          "primary-dk": "#2a724b",
          "primary-soft": "#E7F1E9",
          "green-dark": "#1A3D2B",
          "green-50": "#E7F1E9",
        },
        "border-default": "var(--border-default)",
        "border-strong": "var(--border-strong)",
        "border-light": "var(--border-light)",
        acc: "var(--acc)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        "funnel-accent": "#2E7D52",
        "funnel-accent-bg": "rgba(46, 125, 82, 0.06)",
        "funnel-accent-hover": "rgba(46, 125, 82, 0.03)",
        info: {
          bg: "var(--info-bg)",
          border: "var(--info-border)",
          text: "var(--info-text)",
        },
        warning: {
          bg: "var(--warning-bg)",
          border: "var(--warning-border)",
          text: "var(--warning-text)",
        },
      },
      borderRadius: {
        none: "0",
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        full: "9999px",
        tile: "14px",
        card: "18px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 2px 16px rgba(0,0,0,0.08)",
        cardHover: "0 4px 24px rgba(0,0,0,0.12)",
        sm: "0 1px 6px rgba(0,0,0,0.08)",
        /** Portal 2.0 Mock `C.shadow` */
        p2: "var(--p2-shadow)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "funnel-spin": {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.25s ease-out forwards",
        "fade-in-screen": "fadeIn 0.25s ease-out forwards",
        "funnel-spin": "funnel-spin 2s linear infinite",
        "spin-slow": "spin 2s linear infinite",
      },
      spacing: {
        header: "60px",
        footer: "56px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
