/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', 'body.dark'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
