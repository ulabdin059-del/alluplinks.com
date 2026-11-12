/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#17202e', 700: '#273142', 600: '#3b4556', 500: '#5b6576', 400: '#868f9d' },
        // Canadian red, used sparingly on white and soft warm greys
        brand: { 50: '#fff5f5', 100: '#ffe6e7', 200: '#fdcbcd', 300: '#f9a1a6', 400: '#ee5f68', 500: '#dc2f3c', 600: '#c8102e', 700: '#a50d26' },
        mist: { 50: '#fbfaf9', 100: '#f6f4f2', 200: '#ebe7e3', 300: '#dcd6d0' }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 2px rgba(23,32,46,.04), 0 4px 16px -4px rgba(23,32,46,.08)',
        lift: '0 2px 4px rgba(23,32,46,.04), 0 16px 40px -12px rgba(23,32,46,.18)',
        ring: '0 0 0 4px rgba(200,16,46,.14)'
      },
      borderRadius: { xl2: '1.25rem' },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'none' } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } }
      },
      animation: { 'fade-up': 'fade-up .5s cubic-bezier(.2,.7,.2,1) both', 'fade-in': 'fade-in .3s ease both' }
    }
  },
  plugins: []
};
