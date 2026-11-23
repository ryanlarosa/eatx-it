/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './components/**/*.{ts,tsx}',
    './context/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        brand: {
          DEFAULT: '#0052CC',
          hover: '#0043A8',
          subtle: '#DEEBFF',
        },
        rail: {
          bg: '#141A24',
          hover: '#1D2534',
          active: '#222C3E',
          border: '#242E40',
        },
        slate: {
          850: '#1A2230',
          900: '#161C26',
          950: '#0F141C',
        },
      },
    },
  },
  plugins: [],
};
