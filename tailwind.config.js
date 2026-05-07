/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        // ステータス用カラーパレット (Tailwind の標準色をエイリアス)
        safe:    { bg: '#dcfce7', fg: '#166534', dotBg: '#bbf7d0', dotFg: '#15803d' },
        neutral2:{ bg: '#e0e7ff', fg: '#3730a3', dotBg: '#c7d2fe', dotFg: '#4338ca' },
        caution: { bg: '#fef9c3', fg: '#854d0e', dotBg: '#fef08a', dotFg: '#a16207' },
        danger:  { bg: '#fee2e2', fg: '#991b1b', dotBg: '#fecaca', dotFg: '#b91c1c' },
      },
    },
  },
  plugins: [],
};
