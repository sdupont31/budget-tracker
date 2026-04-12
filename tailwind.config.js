/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      borderRadius: {
        apple:    '12px',
        'apple-lg': '16px',
      },

      boxShadow: {
        'apple-sm': [
          '0 1px 3px rgba(0,0,0,0.08)',
          '0 1px 2px rgba(0,0,0,0.05)',
        ].join(', '),
        apple: [
          '0 4px 16px rgba(0,0,0,0.10)',
          '0 2px 4px  rgba(0,0,0,0.06)',
        ].join(', '),
        'apple-lg': [
          '0 8px 30px rgba(0,0,0,0.14)',
          '0 4px 8px  rgba(0,0,0,0.08)',
        ].join(', '),
      },

      backdropBlur: {
        apple: '20px',
      },

      colors: {
        'apple-blue': '#007AFF',
        'apple-red':  '#FF3B30',
        // iOS gray palette (gray-1 = darkest label, gray-6 = lightest fill)
        'apple-gray': {
          1: '#8E8E93',
          2: '#AEAEB2',
          3: '#C7C7CC',
          4: '#D1D1D6',
          5: '#E5E5EA',
          6: '#F2F2F7',
        },
      },

      fontSize: {
        // Common Apple text sizes
        'apple-caption2': ['11px', { lineHeight: '13px', letterSpacing: '0.06em' }],
        'apple-caption1': ['12px', { lineHeight: '16px' }],
        'apple-footnote': ['13px', { lineHeight: '18px' }],
        'apple-subhead':  ['15px', { lineHeight: '20px' }],
        'apple-body':     ['17px', { lineHeight: '22px' }],
        'apple-title3':   ['20px', { lineHeight: '25px' }],
        'apple-title2':   ['22px', { lineHeight: '28px', letterSpacing: '-0.02em' }],
        'apple-title1':   ['28px', { lineHeight: '34px', letterSpacing: '-0.02em' }],
        'apple-largetitle': ['34px', { lineHeight: '41px', letterSpacing: '-0.03em' }],
      },

      transitionDuration: {
        apple: '250ms',
      },

      transitionTimingFunction: {
        apple: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },

      keyframes: {
        'slide-in': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },

      animation: {
        'slide-in': 'slide-in 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94) both',
      },
    },
  },
  plugins: [],
};
