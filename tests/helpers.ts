import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildContent } from '../src/core/content';

const dir = join(__dirname, '..', 'public', 'content', 'fr');
const read = (f: string) => JSON.parse(readFileSync(join(dir, f), 'utf8'));

export function loadAll() {
  const idx = read('index.json');
  const col = (k: string) => (idx[k] as string[]).flatMap(read);
  return buildContent({
    version: idx.version,
    categories: col('categories'),
    fiches: col('theorie'),
    objets: col('objets'),
    fonctions: col('equivalences'),
    experiences: col('pratique'),
    missions: col('missions'),
    termes: col('glossaire'),
    parcours: col('parcours'),
  });
}
