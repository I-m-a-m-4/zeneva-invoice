/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "'DM Sans'", "var(--font-jakarta)", "'Plus Jakarta Sans'", '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        body: ["var(--font-dm-sans)", "'DM Sans'", "var(--font-jakarta)", "'Plus Jakarta Sans'", '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ["'Bricolage Grotesque'", "var(--font-dm-sans)", "'DM Sans'", 'sans-serif'],
        headline: ["'Bricolage Grotesque'", "var(--font-dm-sans)", "'DM Sans'", 'sans-serif'],
        mono: ["'Source Code Pro'", 'monospace'],
        code: ["'Source Code Pro'", 'monospace'],
        clash: ["'Clash Display'", 'sans-serif'],
        nexa: ["var(--font-dm-sans)", "'DM Sans'", 'sans-serif'],
        dm: ["var(--font-dm-sans)", "'DM Sans'", 'sans-serif'],
        sidebar: ["var(--font-dm-sans)", "'DM Sans'", 'sans-serif'],
        jakarta: ["var(--font-jakarta)", "'Plus Jakarta Sans'", 'sans-serif'],
        serif: ["'Instrument Serif'", 'serif'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
