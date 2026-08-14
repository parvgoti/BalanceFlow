import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand greens — matched to reference
        primary: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#1B8A4A',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        // Custom brand — emerald green
        brand: {
          DEFAULT: '#1B8A4A',
          light:   '#22A85A',
          subtle:  '#E8F5E9',
          dark:    '#145C32',
        },
        // Navy text
        navy: {
          DEFAULT: '#1A1D26',
          light:   '#2D3142',
          muted:   '#6B7280',
        },
        // Mint backgrounds
        mint: {
          50:  '#F0FFF4',
          100: '#E8F5E9',
          200: '#C8E6C9',
        },
        // Sidebar
        sidebar: {
          bg:       '#1B8A4A',
          hover:    '#1F9E55',
          active:   '#22A85A',
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
          raised:   '#F8F9FA',
          overlay:  '#f3f4f6',
          dark:     '#111827',
          'dark-raised': '#1f2937',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
      boxShadow: {
        card:       '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 4px 12px 0 rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        'card-lg':  '0 2px 8px 0 rgba(0, 0, 0, 0.06)',
        modal:      '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        glow:       '0 0 20px -5px rgba(27, 138, 74, 0.3)',
        nav:        '0 -1px 3px 0 rgba(0, 0, 0, 0.05)',
      },
      animation: {
        'slide-in':       'slideIn 0.2s ease-out',
        'slide-up':       'slideUp 0.25s ease-out',
        'fade-in':        'fadeIn 0.15s ease-in',
        'scale-in':       'scaleIn 0.2s ease-out',
        'pulse-subtle':   'pulseSubtle 2s ease-in-out infinite',
        'shimmer':        'shimmer 1.5s infinite',
        'bounce-slow':    'bounceSlow 2s ease-in-out infinite',
        'fade-in-up':     'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'spin-slow':      'spin 3s linear infinite',
      },
      keyframes: {
        slideIn:  { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        slideUp:  { from: { transform: 'translateY(10px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        fadeIn:   { from: { opacity: '0' }, to: { opacity: '1' } },
        scaleIn:  { 
          from: { transform: 'translate(-50%, -50%) scale(0.95)', opacity: '0' }, 
          to: { transform: 'translate(-50%, -50%) scale(1)', opacity: '1' } 
        },
        pulseSubtle: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.7' } },
        shimmer:  { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        bounceSlow: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        fadeInUp: { from: { opacity: '0', transform: 'translateY(15px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

export default config
