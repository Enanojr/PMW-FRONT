/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Acento de marca (rojo Kyocera) — usar con moderación
        kyocera: {
          50: '#fdf2f4',
          100: '#fbe5e9',
          500: '#c8102e',
          600: '#a70d26',
          700: '#870a1f',
          900: '#4a0511',
        },
        // Neutros estilo Apple
        ink: '#1d1d1f',
        silver: '#86868b',
        smoke: '#f5f5f7',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Segoe UI"',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -12px rgba(0,0,0,0.06)',
        pop: '0 12px 32px -8px rgba(0,0,0,0.18)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};
