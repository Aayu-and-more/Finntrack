/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        card: "var(--card)",
        cardHover: "var(--cardHover)",
        border: "var(--border)",
        accent: "var(--accent)",
        accentDim: "var(--accentDim)",
        danger: "var(--red)",
        dangerDim: "var(--redDim)",
        warning: "var(--amber)",
        warningDim: "var(--amberDim)",
        info: "var(--blue)",
        infoDim: "var(--blueDim)",
        purple: "var(--purple)",
        purpleDim: "var(--purpleDim)",
        text: "var(--text)",
        textMuted: "var(--textMuted)",
        textDim: "var(--textDim)",
      }
    },
  },
  plugins: [],
}
