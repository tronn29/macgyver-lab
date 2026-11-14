/// <reference types="vite/client" />

/** Modèles de contenu (public/content/fr/_modeles/*.json), voir vite.config.ts et MODELES.md. */
declare module 'virtual:modeles' {
  const modeles: Record<string, Record<string, unknown>>;
  export default modeles;
}
