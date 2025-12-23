import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#0F172A", // Slate 900
                secondary: "#334155", // Slate 700
                accent: "#3B82F6", // Blue 500
            },
        },
    },
    plugins: [],
};
export default config;
