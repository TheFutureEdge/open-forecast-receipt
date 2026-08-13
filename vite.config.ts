import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'

// Custom plugin to handle ?import&react syntax (alias to ?react)
const svgImportPlugin = () => ({
  name: 'svg-import-alias',
  resolveId(id: string) {
    // Transform ?import&react to ?react for vite-plugin-svgr
    if (id.includes('?import&react')) {
      return id.replace('?import&react', '?react');
    }
    return null;
  },
});

const seoEnvironmentPlugin = (mode: string) => ({
  name: 'ofl-seo-environment',
  transformIndexHtml(html: string) {
    const robots = mode === 'production'
      ? 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'
      : 'noindex,nofollow';
    return html.replace('__OFL_ROBOTS__', robots);
  },
});

/// <reference types="vitest" />
function normalizeViteBase(value: string | undefined): string {
  const trimmed = String(value || '').trim();
  if (!trimmed || trimmed === '/') return '/';
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}/`;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: normalizeViteBase(process.env.VITE_BASE_PATH),
  plugins: [
    react(),
    seoEnvironmentPlugin(mode),
    tailwindcss(),
    svgImportPlugin(),
    svgr({
      // Support named ReactComponent export (for ?react syntax)
      svgrOptions: {
        exportType: 'named',
        namedExport: 'ReactComponent',
        ref: true,
        svgo: false,
        titleProp: true,
      },
      include: '**/*.svg?react',
    }),
  ],
  server: {
    allowedHosts: true as const,
    hmr: false,
    watch: {
      ignored: ['**/native-builder/upload-ready/**'],
    },
  },
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/native-builder/upload-ready/**',
    ],
  },
}))
