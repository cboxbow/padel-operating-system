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
          50: '#fdf8e7',
          100: '#faefc2',
          200: '#f5dc8a',
          300: '#efc450',
          400: '#e8ad28',
          500: '#D4AF37',
          600: '#C9A84C',
          700: '#a8891a',
          800: '#896c14',
          900: '#6e5210',
        },
        mpl: {
          black: '#0A0A0A',
          dark: '#111111',
          card: '#1A1A1A',
          card2: '#1E1E1E',
          border: '#2A2A2A',
          gold: '#D4AF37',
          'gold-light': '#E8C84A',
          'gold-dim': 'rgba(212,175,55,0.25)',
          white: '#FFFFFF',
          'off-white': '#F0EDE6',
          gray: '#888888',
          'gray-dark': '#444444',
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
        'gold': '0 0 20px rgba(212,175,55,0.2)',
        'gold-sm': '0 0 10px rgba(212,175,55,0.15)',
        'card': '0 4px 24px rgba(0,0,0,0.6)',
        'modal': '0 20px 60px rgba(0,0,0,0.8)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #D4AF37 0%, #C9A84C 50%, #a8891a 100%)',
        'dark-gradient': 'linear-gradient(180deg, #1A1A1A 0%, #0A0A0A 100%)',
        'card-gradient': 'linear-gradient(135deg, #1E1E1E 0%, #1A1A1A 100%)',
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
          '0%, 100%': { boxShadow: '0 0 10px rgba(212,175,55,0.3)' },
          '50%': { boxShadow: '0 0 25px rgba(212,175,55,0.6)' },
        },
      },
    },
  },
  plugins: [],
}
