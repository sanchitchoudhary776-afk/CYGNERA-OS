/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Cognitive Sanctuary palette
        background:    "#0e1510",
        surface: {
          lowest:  "#09100b",
          low:     "#161d18",
          DEFAULT: "#1a211c",
          high:    "#242c26",
          highest: "#2f3731",
        },
        primary: {
          DEFAULT: "#09cd83",
          light:   "#44ea9d",
          dim:     "#37e195",
          fixed:   "#5dfeaf",
          on:      "#003921",
        },
        secondary: {
          DEFAULT: "#9ad3af",
          container: "#1b5337",
          fixed:   "#b6f0ca",
        },
        tertiary: {
          DEFAULT: "#e9cd6e",
          container: "#ccb256",
          fixed:   "#fee17f",
        },
        outline: {
          DEFAULT: "#859489",
          variant: "#3c4a40",
        },
        onSurface: "#dde5dc",
        onSurfaceVariant: "#bbcabd",
        error: "#ffb4ab",
      },
      fontFamily: {
        jakarta: ["Plus Jakarta Sans", "sans-serif"],
        sans:    ["Plus Jakarta Sans", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "1rem",
        lg: "1.5rem",
        xl: "2rem",
        "2xl": "3rem",
        full: "9999px",
      },
      backdropBlur: {
        xs: "2px",
        sm: "8px",
        DEFAULT: "16px",
        lg: "24px",
        xl: "40px",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
        "glass-lg": "0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
        glow: "0 0 40px rgba(9,205,131,0.2)",
        "glow-lg": "0 0 80px rgba(9,205,131,0.3)",
        "glow-sm": "0 0 20px rgba(9,205,131,0.15)",
        inner: "inset 0 2px 4px rgba(0,0,0,0.3)",
      },
      animation: {
        "fade-up":    "fadeUp 0.5s ease forwards",
        "fade-in":    "fadeIn 0.4s ease forwards",
        "scale-in":   "scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards",
        "slide-right":"slideRight 0.4s ease forwards",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "spin-slow":  "spin 3s linear infinite",
        "float":      "float 3s ease-in-out infinite",
        "shimmer":    "shimmer 2s linear infinite",
        "draw-line":  "drawLine 1s ease forwards",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%":   { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideRight: {
          "0%":   { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(9,205,131,0.15)" },
          "50%":      { boxShadow: "0 0 60px rgba(9,205,131,0.4)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-6px)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        drawLine: {
          "0%":   { strokeDashoffset: "1000" },
          "100%": { strokeDashoffset: "0" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "aura-glow": "radial-gradient(circle at top right, rgba(9,205,131,0.15), transparent 60%), radial-gradient(circle at bottom left, rgba(76,130,99,0.1), transparent 50%)",
        "glass-shine": "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)",
        "shimmer-gradient": "linear-gradient(90deg, transparent 0%, rgba(9,205,131,0.1) 50%, transparent 100%)",
      },
      transitionTimingFunction: {
        bounce:   "cubic-bezier(0.34,1.56,0.64,1)",
        spring:   "cubic-bezier(0.68,-0.55,0.265,1.55)",
        smooth:   "cubic-bezier(0.4,0,0.2,1)",
      },
    },
  },
  plugins: [],
};
