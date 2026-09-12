import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        // Brighter moss for text/links on a dark surface — see globals.css
        // :root's --accent-bright comment for why this differs from --primary.
        'accent-bright': 'hsl(var(--accent-bright))',
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        // Bruno Physical Rehabilitation brand colours — BA One Design System v4
        // (moss/health pillar). Values changed, keys kept so the 7 existing
        // callers (patient detail, scans, evidence report, foot-scan,
        // admin-login-form) inherit the new palette without editing each one.
        // slate = ink family (neutral/structural, e.g. subtle gradients);
        // turquoise = moss (the actual brand accent — icons, buttons, active
        // states). Kept distinct on purpose: they used to be two different
        // hues, and at least one caller (evidence-report-tab.tsx) blends
        // them in a gradient that goes flat if both resolve to the same hex.
        bruno: {
          slate: '#3A4150',
          'slate-dark': '#20242D',
          'slate-light': '#5A6478',
          turquoise: '#4F7361',
          'turquoise-dark': '#3D5A4D',
          'turquoise-light': '#7DA391',
        },
        // Dynamic clinic theme colors (CSS Variables) — fallback is BA One
        // moss; a tenant's own Clinic.primaryColor/secondaryColor (injected
        // as --clinic-primary/--clinic-secondary) still wins when set.
        clinic: {
          primary: 'var(--clinic-primary, #4F7361)',
          'primary-light': 'var(--clinic-primary-light, #7DA391)',
          'primary-dark': 'var(--clinic-primary-dark, #3D5A4D)',
          secondary: 'var(--clinic-secondary, #3D5A4D)',
          'secondary-light': 'var(--clinic-secondary-light, #7DA391)',
          'secondary-dark': 'var(--clinic-secondary-dark, #2E453B)',
        },
        // BA1 Design System v4 — public-site only (Home, Articles, Services, etc.)
        ba1: {
          ink: '#20242D',
          'ink-2': '#3A4150',
          bone: '#F5F4F1',
          card: '#FFFFFF',
          line: '#E4E3DF',
          muted: '#767B85',
          greige: '#CDC7BE',
          'greige-press': '#BFB8AD',
          health: '#4F7361',
          'health-soft': '#EDF3EF',
          ok: '#55705F',
          warn: '#8A6D3B',
          bad: '#A85A4B',
        },
      },
      fontFamily: {
        sora: ['var(--font-sora)', 'Sora', 'sans-serif'],
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', opacity: '1' },
          '50%': { transform: 'scale(1)', opacity: '0.5' },
          '100%': { transform: 'scale(0.95)', opacity: '1' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
        'scan-line': 'scan-line 2s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
