/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx,css}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        success: '#22c55e',
      },
    },
  },
  plugins: [],
};
