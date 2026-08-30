/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy900: "#0F3352",
        navy800: "#1B5386",
        navy700: "#2C6BA0",
        navy100: "#DCE7F1",
        navy50: "#EFF4F9",
        gold400: "#F6D374",
        gold600: "#D9A536",
        ink: "#132433",
        muted: "#5C7488",
      },
      fontFamily: {
        sora: ["Sora", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
