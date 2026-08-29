/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Palette RépétIA — identique au client web (frontend/src/index.css).
      colors: {
        brand: {
          paper: '#fbf7ee',
          green: '#0f5f52',
          'green-dark': '#0a453c',
          gold: '#d99a1f',
          'gold-soft': '#f6e9c7',
          ink: '#20302b',
          'correct-text': '#0f8a5f',
          'correct-bg': '#e7f6ec',
          'wrong-text': '#c0432f',
          'wrong-bg': '#fbeae3',
          lines: '#e7ddc7',
        },
      },
    },
  },
  plugins: [],
};
