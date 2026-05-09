import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0b",
        paper: "#f4f1ea",
        mist: "#1a1a1d",
        bone: "#e8e3d8",
        flag: "#d4ff00",   // sharp acid yellow accent
        edge: "#00d4a8",   // value bet teal
        warn: "#ff5c3d",
      },
      fontFamily: {
        display: ['"Fraunces"', "ui-serif", "Georgia", "serif"],
        sans: ['"Geist"', "system-ui", "sans-serif"],
        mono: ['"Geist Mono"', "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tighter: "-0.04em",
      },
    },
  },
  plugins: [],
};

export default config;
