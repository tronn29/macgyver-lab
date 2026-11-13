import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * Génère dist/sw.js à partir de scripts/sw-template.js après la construction :
 * liste de pré-cache (coquille, contenu, schémas, polices latines) + version
 * calculée sur le contenu des fichiers. Aucune dépendance externe.
 */
function serviceWorkerPlugin(): Plugin {
  let outDir = 'dist';
  return {
    name: 'macgyver-sw',
    apply: 'build',
    configResolved(cfg) {
      outDir = cfg.build.outDir;
    },
    closeBundle() {
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
          const full = join(dir, name);
          if (statSync(full).isDirectory()) walk(full);
          else files.push(relative(outDir, full).split(sep).join('/'));
        }
      };
      walk(outDir);
      const precache = files
        .filter((f) => f !== 'sw.js' && !f.endsWith('.map') && !f.startsWith('.'))
        .filter((f) => !/\.woff2?$/.test(f) || (/-latin-/.test(f) && !/latin-ext/.test(f)))
        .filter((f) => !/\.woff$/.test(f))
        .sort();
      const hash = createHash('sha256');
      for (const f of precache) hash.update(f).update(readFileSync(join(outDir, f)));
      const version = hash.digest('hex').slice(0, 12);
      const template = readFileSync('scripts/sw-template.js', 'utf8');
      const sw = template
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(['./', ...precache], null, 0));
      writeFileSync(join(outDir, 'sw.js'), sw);
      // eslint-disable-next-line no-console
      console.log(`\n[sw] ${precache.length} fichiers pré-cachés — version ${version}`);
    },
  };
}

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    sourcemap: false,
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.0.0'),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  plugins: [serviceWorkerPlugin()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
} as Parameters<typeof defineConfig>[0]);
