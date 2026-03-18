/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        oahl: {
          bg:           '#0c0b0a',
          surface:      '#141210',
          surfaceHigh:  '#1c1a18',
          border:       '#2a2724',
          borderStrong: '#3a3734',
          accent:       '#D47E5B',
          accentHover:  '#C4704E',
          tech:         '#7daa87',
          techDim:      'rgba(125,170,135,0.10)',
          textMain:     '#edeae4',
          textMuted:    '#8a8680',
          textFaint:    '#3a3830',
        },
      },
      animation: {
        'marquee': 'marquee 40s linear infinite',
        'shimmer': 'shimmer 1.8s linear infinite',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
      },
      keyframes: {
        marquee: {
          '0%':   { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
