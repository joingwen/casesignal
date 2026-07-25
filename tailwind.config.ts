import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1.25rem', lg: '2rem' },
      screens: { '2xl': '1360px' },
    },
    extend: {
      colors: {
        // Neutral foundation — 88% of the product surface.
        canvas: '#FFFFFF',
        page: '#F5F5F2',
        surface: '#EFEFEB',
        ink: {
          DEFAULT: '#111111',
          secondary: '#676762',
          muted: '#92928C',
        },
        line: {
          DEFAULT: '#DFDFD9',
          strong: '#C9C9C2',
        },
        // Product accent — citations, active state, evidence relationships.
        evidence: {
          DEFAULT: '#3F76C5',
          soft: '#EDF2FB',
          border: '#C5D6F0',
          deep: '#2F5AA0',
        },
        // Secondary signal — unresolved items, priority review.
        signal: {
          DEFAULT: '#E98243',
          soft: '#FDF0E7',
          border: '#F5D2B8',
        },
        status: {
          supported: '#3D7A5A',
          'supported-soft': '#EAF3EE',
          partial: '#A67A16',
          'partial-soft': '#FBF3E0',
          contradicted: '#B4544C',
          'contradicted-soft': '#F9EDEC',
          unresolved: '#E98243',
          'unresolved-soft': '#FDF0E7',
          context: '#767671',
          'context-soft': '#F0F0EC',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        editorial: [
          'ui-serif',
          'Iowan Old Style',
          'Palatino Linotype',
          'Palatino',
          'Georgia',
          'serif',
        ],
      },
      fontSize: {
        'display-xl': ['5.25rem', { lineHeight: '0.95', letterSpacing: '-0.038em' }],
        'display-lg': ['4.25rem', { lineHeight: '0.97', letterSpacing: '-0.035em' }],
        'display-md': ['3.25rem', { lineHeight: '1.0', letterSpacing: '-0.03em' }],
        'display-sm': ['2.5rem', { lineHeight: '1.05', letterSpacing: '-0.028em' }],
        'section': ['3.125rem', { lineHeight: '1.02', letterSpacing: '-0.03em' }],
        'section-sm': ['2.25rem', { lineHeight: '1.06', letterSpacing: '-0.025em' }],
        'title': ['1.9rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        'lede': ['1.0625rem', { lineHeight: '1.6', letterSpacing: '-0.005em' }],
      },
      borderRadius: {
        canvas: '28px',
        preview: '20px',
        panel: '12px',
        control: '8px',
      },
      boxShadow: {
        canvas: '0 40px 120px -40px rgba(17,17,17,0.28), 0 4px 20px -8px rgba(17,17,17,0.08)',
        preview: '0 24px 64px -28px rgba(17,17,17,0.22), 0 2px 8px -4px rgba(17,17,17,0.06)',
        float: '0 12px 32px -14px rgba(17,17,17,0.20), 0 1px 3px rgba(17,17,17,0.05)',
        panel: '0 1px 2px rgba(17,17,17,0.04)',
      },
      keyframes: {
        'draw-line': { from: { strokeDashoffset: 'var(--dash)' }, to: { strokeDashoffset: '0' } },
        'rise': { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'none' } },
        'fade': { from: { opacity: '0' }, to: { opacity: '1' } },
        'marquee': { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        'pulse-soft': { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.45' } },
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: {
        rise: 'rise 620ms cubic-bezier(0.16,1,0.3,1) both',
        fade: 'fade 500ms ease both',
        marquee: 'marquee 46s linear infinite',
        'pulse-soft': 'pulse-soft 1.8s ease-in-out infinite',
        'accordion-down': 'accordion-down 260ms cubic-bezier(0.16,1,0.3,1)',
        'accordion-up': 'accordion-up 220ms cubic-bezier(0.16,1,0.3,1)',
      },
      transitionTimingFunction: {
        editorial: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [animate],
}

export default config
