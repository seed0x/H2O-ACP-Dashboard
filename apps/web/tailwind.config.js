module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7C5CFC',
          dark: '#6344E6',
          light: '#9B7FFF',
        },
      },
      backgroundColor: {
        'dark-bg': '#0D1117',
        'dark-card': '#161B22',
        'dark-hover': '#1C2128',
      },
      borderColor: {
        'dark-border': '#30363D',
      },
      textColor: {
        'dark-primary': '#E6EDF3',
        'dark-secondary': '#8B949E',
      },
    },
  },
  plugins: [],
}
