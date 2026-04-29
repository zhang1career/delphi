/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#6366f1",
          muted: "#a5b4fc",
          dark: "#4338ca",
        },
        surface: {
          DEFAULT: "#0f172a",
          card: "#1e293b",
          border: "#334155",
        },
      },
    },
  },
  plugins: [],
};
