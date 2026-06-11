import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand greens
        primary: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        // Custom brand
        brand: {
          DEFAULT: '#1A5C38',
          light:   '#2D9D5C',
          subtle:  '#F0F7F2',
          dark:    '#0F2E1C',
        },
        // Sidebar
        sidebar: {
          bg:       '#1A5C38',
          hover:    '#1F6E43',
          active:   '#2D9D5C',
          text:     '#D1FAE5',
          muted:    '#6EE7B7',
        },
        // Semantic
        success:  { DEFAULT: '#22c55e', light: '#dcfce7', dark: '#15803d' },
        warning:  { DEFAULT: '#f59e0b', light: '#fef3c7', dark: '#92400e' },
        danger:   { DEFAULT: '#ef4444', light: '#fee2e2', dark: '#991b1b' },
        info:     { DEFAULT: '#3b82f6', light: '#dbeafe', dark: '#1e40af' },
        // Neutrals for backgrounds
        surface: {
          DEFAULT:  '#ffffff',
          raised:   '#f9fafb',
          overlay:  '#f3f4f6',
          dark:     '#111827',
          'dark-raised': '#1f2937',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card:   '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06)',
        modal:  '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        glow:   '0 0 20px -5px rgb(45 157 92 / 0.4)',
      },
      animation: {
        'slide-in':       'slideIn 0.2s ease-out',
        'slide-up':       'slideUp 0.25s ease-out',
        'fade-in':        'fadeIn 0.15s ease-in',
        'scale-in':       'scaleIn 0.2s ease-out',
        'pulse-subtle':   'pulseSubtle 2s ease-in-out infinite',
        'shimmer':        'shimmer 1.5s infinite',
      },
      keyframes: {
        slideIn:  { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        slideUp:  { from: { transform: 'translateY(10px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        fadeIn:   { from: { opacity: '0' }, to: { opacity: '1' } },
        scaleIn:  { from: { transform: 'scale(0.95)', opacity: '0' }, to: { transform: 'scale(1)', opacity: '1' } },
        pulseSubtle: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.7' } },
        shimmer:  { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

export default config
