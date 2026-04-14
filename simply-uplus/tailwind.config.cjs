/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      mono: ['"IBM Plex Mono"', '"Space Mono"', 'monospace'],
      sans: ['Pretendard', '"Noto Sans KR"', '-apple-system', 'sans-serif'],
    },
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0E0F0E',
          card: '#1A1D18',
          inner: '#111410',
          border: '#2E3329',
          track: '#2A2E25',
        },
        txt: {
          primary: '#E8EDE0',
          muted: '#8A9980',
        },
        accent: { green: '#5EE86A' },
        signal: {
          blue: '#0D77EE',
          green: '#5EE86A',
          orange: '#F97316',
          red: '#EF4444',
        },
      },
    },
  },
  plugins: [],
}
