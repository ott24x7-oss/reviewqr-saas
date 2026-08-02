import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1280px"
      }
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          // WatShop midnight primary — violet ramp (#8B5CF6)
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
          800: "#5B21B6",
          900: "#4C1D95"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        /* ---- WatShop midnight brand tokens (RGB-channel driven) ---- */
        canvas: "rgb(var(--c-bg) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        elevated: "rgb(var(--c-elevated) / <alpha-value>)",
        brand: "rgb(var(--c-primary) / <alpha-value>)",
        tertiary: "rgb(var(--c-tertiary) / <alpha-value>)",
        accent2: "rgb(var(--c-accent2) / <alpha-value>)",
        "on-primary": "rgb(var(--c-on-primary) / <alpha-value>)",
        "on-accent": "rgb(var(--c-on-accent) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        "muted-ink": "rgb(var(--c-muted) / <alpha-value>)",
        bluegray: "rgb(var(--c-bluegray) / <alpha-value>)"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem"
      },
      boxShadow: {
        soft: "0 2px 8px 0 rgb(0 0 0 / 0.25), 0 1px 3px 0 rgb(0 0 0 / 0.3)",
        card: "0 4px 24px -2px rgb(0 0 0 / 0.4), 0 2px 8px -2px rgb(0 0 0 / 0.3)",
        neu: "8px 8px 20px rgb(var(--neu-lo) / var(--neu-lo-a)), -8px -8px 20px rgb(var(--neu-hi) / var(--neu-hi-a))",
        "neu-sm": "3px 3px 8px rgb(var(--neu-lo) / var(--neu-lo-a)), -3px -3px 8px rgb(var(--neu-hi) / var(--neu-hi-a))",
        "neu-inset": "inset 5px 5px 12px rgb(var(--neu-lo) / var(--neu-lo-a)), inset -5px -5px 12px rgb(var(--neu-hi) / var(--neu-hi-a))",
        glow: "0 0 30px rgb(var(--c-primary) / 0.35)",
        "glow-cyan": "0 0 30px rgb(var(--c-tertiary) / 0.30)",
        "glow-emerald": "0 0 26px rgb(var(--c-accent) / 0.30)"
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" }
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "slide-in": {
          "0%": { transform: "translateX(-10px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" }
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" }
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "70%": { transform: "scale(1.3)", opacity: "0" },
          "100%": { opacity: "0" }
        },
        drift: {
          "0%": { transform: "translate3d(0,0,0) scale(1)" },
          "33%": { transform: "translate3d(4%, -6%, 0) scale(1.08)" },
          "66%": { transform: "translate3d(-5%, 4%, 0) scale(0.95)" },
          "100%": { transform: "translate3d(0,0,0) scale(1)" }
        },
        "drift-rev": {
          "0%": { transform: "translate3d(0,0,0) scale(1.05)" },
          "50%": { transform: "translate3d(-6%, 5%, 0) scale(0.94)" },
          "100%": { transform: "translate3d(0,0,0) scale(1.05)" }
        },
        sweep: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" }
        },
        "grid-pan": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "60px 60px" }
        },
        "beam-fall": {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "10%": { opacity: "1" },
          "90%": { opacity: "1" },
          "100%": { transform: "translateY(100vh)", opacity: "0" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "float-slow": "float-slow 9s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
        "pulse-ring": "pulse-ring 2.4s cubic-bezier(0.4,0,0.6,1) infinite",
        drift: "drift 26s ease-in-out infinite",
        "drift-rev": "drift-rev 32s ease-in-out infinite",
        sweep: "sweep 40s linear infinite",
        "grid-pan": "grid-pan 8s linear infinite",
        "beam-fall": "beam-fall 9s linear infinite"
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(to right, rgb(var(--c-ink) / 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--c-ink) / 0.05) 1px, transparent 1px)",
        "grad-brand":
          "linear-gradient(135deg, rgb(var(--c-primary)) 0%, rgb(var(--c-secondary)) 50%, rgb(var(--c-tertiary)) 100%)",
        "grad-accent":
          "linear-gradient(135deg, rgb(var(--c-accent)) 0%, rgb(var(--c-accent2)) 100%)",
        "grad-hero":
          "radial-gradient(1200px 600px at 50% -10%, rgb(var(--c-primary) / 0.18), transparent 60%), radial-gradient(900px 500px at 90% 10%, rgb(var(--c-tertiary) / 0.12), transparent 55%)"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;
