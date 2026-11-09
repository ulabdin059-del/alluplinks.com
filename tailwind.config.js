/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0f1d3a', 700: '#1e2d4f', 600: '#334366', 500: '#55627d', 400: '#7b879e' },
        brand: { 50: '#eef5ff', 100: '#dbeafe', 200: '#bfdcfb', 300: '#93c3f7', 400: '#5aa2f0', 500: '#2f80e6', 600: '#1f66cc', 700: '#1a52a6' },
        mist: { 50: '#f8fafc', 100: '#f3f6fa', 200: '#e7edf4', 300: '#d6dfea' }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,29,58,.04), 0 4px 16px -4px rgba(15,29,58,.08)',
        lift: '0 2px 4px rgba(15,29,58,.04), 0 16px 40px -12px rgba(15,29,58,.18)',
        ring: '0 0 0 4px rgba(47,128,230,.15)'
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
