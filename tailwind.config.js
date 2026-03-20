/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          bg: '#f5f5f5',
          grid: '#e0e0e0'
        },
        card: {
          bg: '#fefefe',
          border: '#e8e8e8'
        }
      }
    },
  },
  plugins: [],
}
