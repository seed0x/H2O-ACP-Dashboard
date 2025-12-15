module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0a0e14',
          panel: '#111820',
          card: '#1a2332',
          hover: '#243041',
          border: '#2d3748',
          text: '#e2e8f0',
          muted: '#94a3b8',
        },
        primary: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
        },
      },
    },
  },
  plugins: [],
}
