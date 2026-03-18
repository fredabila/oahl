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
          bg: '#07080c',
          surface: '#0c0d16',
          surfaceRaised: '#111320',
          border: '#1a1c2a',
          borderStrong: '#262840',
          textMain: '#e4e6f2',
          textMuted: '#505268',
          textFaint: '#2e3045',
          accent: '#d47e5b',
          accentHover: '#bf6c4a',
          tech: '#7daa87',
          techHover: '#6b9876',
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