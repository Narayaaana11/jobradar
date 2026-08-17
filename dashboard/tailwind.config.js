/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        canvas: '#09090b',
        card: '#121215',
        cardHover: '#18181b',
        cardBorder: '#27272a',
        accentSilver: '#828387',
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '28px',
        '4xl': '36px',
      },
    },
  },
  plugins: [],
}
