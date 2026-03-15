/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        oahl: {
          bg: '#0a0a0a',
          surface: '#121212',
          border: '#2a2a2a',
          textMain: '#ffffff',
          textMuted: '#8a8a8a',
          accent: '#d47e5b',
          accentHover: '#bf6c4b',
          tech: '#739580',
        },
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}