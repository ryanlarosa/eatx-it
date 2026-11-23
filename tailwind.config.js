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
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        ops: {
          canvas: '#F4F5F7',
          surface: '#FFFFFF',
          subtle: '#F8F9FB',
          border: '#E4E6EB',
          ink: '#111318',
          muted: '#5A6270',
          darkCanvas: '#0B0D11',
          darkSurface: '#12151C',
          darkElevated: '#181C25',
          darkBorder: '#222733',
          darkInk: '#F1F3F7',
          darkMuted: '#8B94A5',
        },
        slate: {
          850: '#161A23',
          900: '#12151C',
          950: '#0B0D11',
        },
      },
    },
  },
  plugins: [],
};
