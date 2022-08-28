/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/pages/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  theme: {
    fontFamily: {
      sans: ['Lato', 'ui-sans-serif', 'system-ui'],
      serif: ['Roboto Serif', 'ui-serif', 'Georgia', 'Cambria', 'serif']
    },
    extend: {
      colors: {
        primary: 'hsl(310, 100%, 54%)',
        hn: 'hsl(21, 100%, 50%)'
      }
    }
  },
  plugins: [require('@tailwindcss/line-clamp')]
}
