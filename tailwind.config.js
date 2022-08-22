/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/pages/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  theme: {
    fontFamily: {
      sans: ['Lato', 'ui-sans-serif', 'system-ui']
    },
    extend: {
      colors: {
        primary: 'hsl(310, 100%, 54%)'
      }
    }
  },
  plugins: []
}
