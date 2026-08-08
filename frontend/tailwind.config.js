/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ── Surfaces (darkest → raised) ───────────────────────────────────
        panel: {
          bg: '#060E13',       // page background
          rail: '#081419',     // icon rail / far sidebar
          card: '#0D1D25',     // card & panel fill
          raised: '#12282F',   // raised / hover fill
          border: '#17333D',   // hairline border
          ink: '#04090C',      // console / log body
          accent: '#3FE39B',   // brand accent (mint 400)
        },
        // ── Mint accent ramp — the single brand colour ────────────────────
        mint: {
          200: '#B6FBDC',
          300: '#7BF3C0',
          400: '#3FE39B',
          500: '#22D07E',
          600: '#15B96C',
          700: '#0E8F52',
          800: '#0A6B3E',
          900: '#07472A',
        },
        // ── Secondary glow partner (gradients / ambient light only) ───────
        aqua: {
          DEFAULT: '#22E5CE',
          400: '#22E5CE',
        },
        // Near-black used for text sitting on the mint gradient
        onmint: '#04231A',
        // ── Text ramp ─────────────────────────────────────────────────────
        ink: {
          primary: '#E7F5F1',
          secondary: '#CFE4E1',
          body: '#A6C2C6',
          muted: '#7B989F',
          dim: '#5F7E89',
          faint: '#47636D',
        },
      },
      borderRadius: {
        card: '16px',
        tile: '12px',
      },
      // Tint strengths the design language leans on (Tailwind's default scale
      // jumps 10 → 15 → 20, which reads too heavy for these translucent fills).
      opacity: {
        12: '0.12',
        18: '0.18',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.7)',
        glow: '0 0 0 1px rgba(63,227,155,0.35), 0 0 28px -6px rgba(63,227,155,0.45)',
        rail: '0 8px 20px -8px rgba(34,208,126,0.55)',
        btn: '0 6px 16px -8px rgba(34,208,126,0.7)',
        ring: '0 0 0 3px rgba(63,227,155,0.18)',
      },
      backgroundImage: {
        mint: 'linear-gradient(135deg, #3FE39B 0%, #22D07E 55%, #15B96C 100%)',
        'mint-tick': 'linear-gradient(180deg, #7BF3C0 0%, #15B96C 100%)',
        ambient: [
          'radial-gradient(60rem 34rem at 108% -8%, rgba(34,229,206,0.20), transparent 62%)',
          'radial-gradient(46rem 30rem at 100% 18%, rgba(34,208,126,0.14), transparent 60%)',
          'radial-gradient(34rem 26rem at -6% 96%, rgba(34,229,206,0.13), transparent 62%)',
        ].join(','),
      },
      transitionDuration: {
        DEFAULT: '160ms',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        halo: {
          '0%': { boxShadow: '0 0 0 0 rgba(63,227,155,0.55)' },
          '70%': { boxShadow: '0 0 0 6px rgba(63,227,155,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(63,227,155,0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 250ms ease-out',
        halo: 'halo 2s ease-out infinite',
      },
    },
  },
  plugins: [],
}
