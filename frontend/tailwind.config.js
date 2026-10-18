/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        civic: {
          navy: {
            DEFAULT: '#0F172A',
            dark: '#0A0F1D',
            light: '#1E293B',
            muted: '#334155',
          },
          blue: {
            DEFAULT: '#1E3A8A',
            light: '#2563EB',
            accent: '#3B82F6',
            soft: '#EFF6FF',
          },
          saffron: {
            DEFAULT: '#EA580C',
            light: '#F97316',
            soft: '#FFF7ED',
          },
          green: {
            DEFAULT: '#16A34A',
            dark: '#15803D',
            light: '#22C55E',
            soft: '#F0FDF4',
          },
          bg: {
            DEFAULT: '#FFFFFF',
            warm: '#F8FAFC',
            subtle: '#F1F5F9',
          },
          border: {
            DEFAULT: '#E2E8F0',
            dark: '#CBD5E1',
          }
        }
      }
    },
  },
  plugins: [],
}
