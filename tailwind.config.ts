import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#f4f8ff",
        mist: "#122742",
        accent: "#4fd4ff",
        accentDark: "#34d399",
      },
    },
  },
  plugins: [],
};

export default config;
