/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        sky: {
          50: '#F0F9FF', 100: '#E0F2FE', 200: '#BAE6FD', 300: '#7DD3FC',
          400: '#38BDF8', 500: '#0EA5E9', 600: '#0284C7', 700: '#0369A1',
          800: '#075985', 900: '#0C4A6E', 950: '#082F49'
        },
        brand: {
          primary: '#0EA5E9',
          secondary: '#6366F1',
          accent: '#14B8A6',
          danger: '#EF4444',
          warning: '#F59E0B',
          success: '#22C55E',
          dark: '#0F172A',
          muted: '#64748B',
        }
      }
    },
  },
  plugins: [],
};
