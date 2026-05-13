/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#edfff2',
          100: '#d4ffe0',
          200: '#aaffbf',
          300: '#75f694',
          400: '#4ad569',
          500: '#4ad569',
          600: '#2dbf50',
          700: '#21983f',
          800: '#1d7836',
          900: '#185f2e',
        },
        mpl: {
          black: '#020705',
          dark: '#07100B',
          card: '#0D1812',
          card2: '#102018',
          border: '#20382A',
          gold: '#4ad569',
          'gold-light': '#B8FFC8',
          'gold-dim': 'rgba(74,213,105,0.25)',
          white: '#FFFFFF',
          'off-white': '#ECFFF1',
          gray: '#8EA899',
          'gray-dark': '#2B4A38',
        },
        status: {
          draft: '#666666',
          ready: '#D4AF37',
          published: '#22C55E',
          locked: '#EF4444',
          pending: '#F97316',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'gold': '0 0 22px rgba(74,213,105,0.22)',
        'gold-sm': '0 0 12px rgba(74,213,105,0.16)',
        'card': '0 4px 24px rgba(0,0,0,0.6)',
        'modal': '0 20px 60px rgba(0,0,0,0.8)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #4ad569 0%, #80ef99 50%, #2dbf50 100%)',
        'dark-gradient': 'linear-gradient(180deg, #0D1812 0%, #020705 100%)',
        'card-gradient': 'linear-gradient(135deg, #102018 0%, #0D1812 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in': 'slideIn 0.25s ease-out',
        'pulse-gold': 'pulseGold 2s infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-16px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(74,213,105,0.3)' },
          '50%': { boxShadow: '0 0 25px rgba(74,213,105,0.6)' },
        },
      },
    },
  },
  plugins: [],
}
