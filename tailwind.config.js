module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    // add more if needed
  ],
  darkMode: 'class',
  theme: { extend: {
    animation: {
        'wave-in': 'waveIn 3s ease-in-out forwards',
      },
      keyframes: {
        'wave-in': {
          '0%': { transform: 'translateY(100%)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
      },
  } },
  plugins: [],
}

