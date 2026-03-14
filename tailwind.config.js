/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        musilab: {
          accent:   '#5B5FEA',
          'accent-dark': '#818cf8',
          bg:       '#F6F8FB',
          sidebar:  '#F1F4F8',
          hover:    '#E8EDF4',
          border:   '#E6EAF0',
          'dark-bg':      '#0F172A',
          'dark-sidebar': '#111827',
          'dark-surface': '#1F2937',
          'dark-border':  '#374151',
          'dark-header':  '#1E2A4A',
        },
      },
      transitionDuration: { '120': '120ms' },
    },
  },
  plugins: [],
}
