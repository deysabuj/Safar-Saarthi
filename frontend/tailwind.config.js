/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand palette
        navy: {
          50: '#F2F5F8',
          100: '#DEE5EC',
          200: '#BDCDDB',
          300: '#93ADBE',
          400: '#688A9F',
          500: '#4A6D83',
          600: '#355366',
          700: '#263E4E',
          800: '#1B3242',
          900: '#142B3B', // Primary Navy
          950: '#0E1D28',
          DEFAULT: '#142B3B',
        },
        teal: {
          50: '#F0F8F7',
          100: '#D8ECE9',
          200: '#B4DAD4',
          300: '#84C0B6',
          400: '#4FA095',
          500: '#2E867E',
          600: '#24766F', // Teal Accent
          700: '#1D605A',
          800: '#174C47',
          900: '#113A36',
          950: '#0A2422',
          DEFAULT: '#24766F',
        },
        ivory: {
          50: '#FCFBF9',
          100: '#F7F5F0', // Main Background
          200: '#EFECE3',
          300: '#E4DFD2',
          DEFAULT: '#F7F5F0',
        },
        charcoal: {
          DEFAULT: '#202B33', // Primary Text
          muted: '#586875', // Secondary Text
          950: '#151D22',
          900: '#202B33',
          800: '#2F3C47',
          700: '#435360',
          600: '#586875',
          500: '#738390',
          400: '#96A4B0',
          300: '#BDC7D0',
          200: '#E3E7E5', // Border default
          100: '#F0F3F2',
        },
        amber: {
          50: '#FAF5EA',
          100: '#F4E9D0',
          200: '#EBD5A4',
          300: '#E1C078',
          400: '#DCAE5A',
          500: '#D7A45B', // Highlight
          600: '#BA893D',
          700: '#9B6E27',
          800: '#7A541A',
          900: '#5A3C10',
          DEFAULT: '#D7A45B',
        },
        border: {
          DEFAULT: '#E3E7E5',
          subtle: '#EEF1F0',
          dark: '#355366',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Manrope', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
