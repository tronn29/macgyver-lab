import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

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
      // Les modèles de contenu (public/content/*/_modeles/) ne sont jamais publiés :
      // la page #/modeles les embarque déjà dans son propre fichier JavaScript.
      for (const lang of readdirSync(join(outDir, 'content'))) {
        const dir = join(outDir, 'content', lang, '_modeles');
        if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
        if (existsSync(dir)) throw new Error(`[modèles] ${dir} n'a pas pu être exclu du build`);
      }
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

/**
 * Module virtuel « virtual:modeles » : les modèles de public/content/fr/_modeles/ lus au build,
 * embarqués seulement dans le fichier JavaScript de la page cachée #/modeles (chargée à la demande).
 */
function modelesPlugin(): Plugin {
  const ID = 'virtual:modeles';
  const RESOLVED = `\0${ID}`;
  const DIR = resolve('public/content/fr/_modeles');
  return {
    name: 'macgyver-modeles',
    resolveId: (id) => (id === ID ? RESOLVED : null),
    load(id) {
      if (id !== RESOLVED) return null;
      const files = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();
      const data: Record<string, unknown> = {};
      for (const f of files) {
        this.addWatchFile(join(DIR, f));
        data[f.replace(/\.json$/, '')] = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
      }
      return `export default ${JSON.stringify(data)};`;
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
  plugins: [modelesPlugin(), serviceWorkerPlugin()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
} as Parameters<typeof defineConfig>[0]);
