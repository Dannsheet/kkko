/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        'doja-bg': '#ffffff',
        'doja-dark': '#131e29',
        'doja-cyan': '#131e29',
        'doja-light-cyan': '#ffffff',
        'doja-white': '#ffffff',
      }
    },
  },
  plugins: [],
}
