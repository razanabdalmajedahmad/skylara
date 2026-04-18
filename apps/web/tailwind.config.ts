import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';
import path from 'path';

const webDir = path.resolve(__dirname);

const config: Config = {
  darkMode: 'class',
  content: [
    path.join(webDir, 'src/pages/**/*.{js,ts,jsx,tsx,mdx}'),
    path.join(webDir, 'src/components/**/*.{js,ts,jsx,tsx,mdx}'),
    path.join(webDir, 'src/app/**/*.{js,ts,jsx,tsx,mdx}'),
    path.join(webDir, '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}'),
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans]
      },
      colors: {
        // SkyLara Brand Colors
        primary: {
          50: '#F0F7FF',
          100: '#E0EFFE',
          200: '#C7E0FD',
          300: '#A4CBFC',
          400: '#76AFF8',
          500: '#1B4F72', // Primary Navy
          600: '#1A4866',
          700: '#164056',
          800: '#133847',
          900: '#102A35',
          950: '#0C1E27'
        },
        secondary: {
          50: '#F0F7FF',
          100: '#E0EFFE',
          200: '#C7E0FD',
          300: '#A4CBFC',
          400: '#76AFF8',
          500: '#2E86C1', // Secondary Blue
          600: '#2A79AE',
          700: '#256B9A',
          800: '#205E87',
          900: '#1B5073',
          950: '#144359'
        },
        accent: {
          50: '#FFF5F0',
          100: '#FFE8E0',
          200: '#FFCCBF',
          300: '#FFA89E',
          400: '#FF8A70',
          500: '#E74C3C', // Accent Red
          600: '#D63C2B',
          700: '#C73120',
          800: '#B82A1A',
          900: '#A92315',
          950: '#8B1A0F'
        },
        success: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#27AE60', // Success Green
          600: '#22C55E',
          700: '#16A34A',
          800: '#15803D',
          900: '#166534',
          950: '#0F2E1F'
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
          950: '#451A03'
        },
        danger: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
          950: '#500724'
        },
        neutral: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#EEEEEE',
          300: '#E0E0E0',
          400: '#BDBDBD',
          500: '#9E9E9E',
          600: '#757575',
          700: '#616161',
          800: '#424242',
          900: '#212121',
          950: '#0A0A0A'
        }
      },
      spacing: {
        xs: '0.25rem', // 4px
        sm: '0.5rem', // 8px
        md: '1rem', // 16px
        lg: '1.5rem', // 24px
        xl: '2rem', // 32px
        '2xl': '3rem', // 48px
        '3xl': '4rem' // 64px
      },
      borderRadius: {
        none: '0',
        xs: '0.25rem',
        sm: '0.375rem',
        base: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        '2xl': '2rem',
        full: '9999px'
      },
      shadows: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        none: 'none'
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in-up': 'slideInUp 0.3s ease-out',
        'slide-in-down': 'slideInDown 0.3s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideInUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideInDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio')
  ]
};

export default config;
