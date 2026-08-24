import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        graphite: { DEFAULT: "#14171A", panel: "#1C2024", line: "#2A2F35" },
        paper: "#EDEAE1",
        amber: { DEFAULT: "#F2A93B", dim: "#8A6420" },
        teal: { DEFAULT: "#3E8C93", dim: "#1F4448" },
        rust: { DEFAULT: "#C0522D" },
        ink: "#0F1113",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'IBM Plex Sans'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      backgroundImage: {
        grain: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.035) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
};
export default config;
