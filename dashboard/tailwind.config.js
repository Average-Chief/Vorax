/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    borderRadius: {
      none: '0px',
      sm: '0px',
      DEFAULT: '0px',
      md: '0px',
      lg: '0px',
      xl: '0px',
      '2xl': '0px',
      '3xl': '0px',
      full: '0px',
    },
    extend: {
      colors: {
        background: '#000000',
        card: '#0a0a0a',
        border: '#1f1f1f',
        muted: '#737373',
      },
      animation: {
        'pulse-subtle': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
