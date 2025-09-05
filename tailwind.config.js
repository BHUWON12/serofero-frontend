/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
      },
    },
    extend: {
      boxShadow: {
        'soft': '0 2px 12px 0 rgb(0 0 0 / 0.08)',
      },
      colors: {
        // These are used in your styles.css.
        // You can replace these with your actual color palette.
        border: '#e5e7eb', // Example: gray-200
        background: '#ffffff', // Example: white
        foreground: '#111827', // Example: gray-900
        primary: {
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        secondary: {
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        error: {
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        success: {
          500: '#22c55e',
        },
        warning: {
          500: '#f97316',
        }
      }
    },
  },
  plugins: [],
}