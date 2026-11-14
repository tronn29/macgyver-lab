/* Aperçu d'une page avec le vrai design, sans effet sur la progression (modèles, éditeur). */

/**
 * Prépare une vue pour l'aperçu : titre principal ramené au niveau 2 (la page qui l'affiche a déjà
 * son h1), liens de retour et pager masqués, commandes qui écriraient dans la progression estompées
 * et non interactives.
 */
export function asPreview(node: HTMLElement, inertSelectors: string[] = []): HTMLElement {
  node.classList.remove('view-enter');
  node.querySelectorAll('h1').forEach((el) => {
    el.setAttribute('role', 'heading');
    el.setAttribute('aria-level', '2');
    el.removeAttribute('tabindex');
  });
  node.querySelectorAll<HTMLElement>('.back-link, .pager').forEach((el) => (el.hidden = true));
  // Commandes qui écriraient dans la progression : visibles mais non interactives (estompées)
  for (const sel of ['.page-head__actions', '.read-box', '.notes', '.experience__done', '.briefing__launch'])
    node.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      el.inert = true;
      el.classList.add('is-preview-inert');
    });
  // Zones entières rendues non interactives sans changer leur apparence
  for (const sel of inertSelectors) node.querySelectorAll<HTMLElement>(sel).forEach((el) => (el.inert = true));
  return node;
}
