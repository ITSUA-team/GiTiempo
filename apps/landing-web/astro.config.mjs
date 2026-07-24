import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

import { getPublicConfig } from './src/lib/public-config.mjs';

export default defineConfig(({ mode }) => {
  const config = getPublicConfig(loadEnv(mode, process.cwd(), 'PUBLIC_'));

  return {
    site: config.siteUrl,
    output: 'static',
  };
});
