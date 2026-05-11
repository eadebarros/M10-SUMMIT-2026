import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        void: '#0a0a0a',
        amber: {
          core: '#FFB347',
          glow: '#FF8C00',
          deep: '#CC5500',
        },
      },
    },
  },
  plugins: [],
};

export default config;
