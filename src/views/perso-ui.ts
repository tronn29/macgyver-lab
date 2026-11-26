/* Commandes des fiches et fonctions personnelles : barre Modifier / Exporter / Supprimer, export. */
import { content } from '../core/content';
import { h, nextId } from '../core/dom';
import { t } from '../core/i18n';
import { navigate } from '../core/router';
import { deletePerso, estRangeeOfficielle, exportFiche, exportFonction, rangerOfficielle } from '../core/perso';
import type { Fiche, Fonction } from '../core/types';
import { btn, confirmDialog, linkBtn, openDialog, toast } from '../ui/components';
import { icon } from '../ui/icons';
import { resetSearchIndex } from './misc';

/** Fenêtre d'export : le texte au format des modèles, à copier ou à télécharger. */
export function openExport(nomFichier: string, texte: string): void {
  const id = nextId('export');
  const area = h('textarea', { id, class: 'input textarea export__code', readonly: true, rows: 12, spellcheck: 'false', 'aria-describedby': `${id}-aide` });
  area.value = texte;
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(texte);
      toast(t('perso.copie'), { icon: 'check', tone: 'success' });
    } catch {
      area.focus();
      area.select();
      toast(t('perso.copieManuelle'), { icon: 'info' });
    }
  };
  const telecharger = () => {
    const url = URL.createObjectURL(new Blob([texte], { type: 'application/json' }));
    const a = h('a', { href: url, download: nomFichier });
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  openDialog({
    title: t('perso.exportTitre'),
    wide: true,
    body: h(
      'div',
      { class: 'export' },
      h('p', { class: 'panel__text', id: `${id}-aide` }, t('perso.exportAide')),
      h('label', { for: id, class: 'field__label' }, t('perso.exportLabel', { f: nomFichier })),
      area
    ),
    actions: [btn(t('perso.copier'), { variant: 'ghost', icon: 'check', onClick: () => void copier() }), btn(t('perso.telecharger'), { variant: 'primary', icon: 'download', onClick: telecharger })],
  });
}

/** Barre affichée en haut d'une fiche ou d'une fonction personnelle. */
export function persoBar(type: 'fiche' | 'fonction', item: Fiche | Fonction): HTMLElement {
  const fiche = type === 'fiche';
  const nom = `${item.id.replace(/^perso-/, '')}.json`;
  const rangee = estRangeeOfficielle(item.id);
  const liste = fiche ? '/archives' : '/arsenal';
  const ranger = () => {
    try {
      rangerOfficielle(content(), item.id, !rangee);
    } catch {
      toast(t('perso.erreurRanger'), { icon: 'alert', tone: 'danger' });
      return;
    }
    resetSearchIndex();
    toast(t(rangee ? (fiche ? 'perso.ficheRemise' : 'perso.fonctionRemise') : fiche ? 'perso.ficheRangee' : 'perso.fonctionRangee'), { icon: 'check', tone: 'success' });
    navigate(liste);
  };
  return h(
    'section',
    { class: 'perso-bar', 'aria-label': t(fiche ? 'perso.barFiche' : 'perso.barFonction') },
    h('p', { class: 'perso-bar__text' }, icon('pen', 18), h('span', null, t(rangee ? (fiche ? 'perso.barFicheRangee' : 'perso.barFonctionRangee') : fiche ? 'perso.barFicheTexte' : 'perso.barFonctionTexte'))),
    h(
      'div',
      { class: 'perso-bar__actions' },
      linkBtn(t('perso.modifier'), fiche ? `#/archives/editer/${item.id}` : `#/arsenal/editer/${item.id}`, { variant: 'ghost', small: true, icon: 'pen' }),
      rangee
        ? btn(t(fiche ? 'perso.remettreFiche' : 'perso.remettreFonction'), { variant: 'ghost', small: true, icon: 'arrow-left', onClick: ranger })
        : btn(t('perso.rendreOfficielle'), { variant: 'primary', small: true, icon: 'upload', onClick: ranger }),
      btn(t('perso.exporter'), { variant: 'ghost', small: true, icon: 'download', onClick: () => openExport(nom, fiche ? exportFiche(item as Fiche) : exportFonction(content(), item as Fonction)) }),
      btn(t('perso.supprimer'), {
        variant: 'danger',
        small: true,
        icon: 'trash',
        onClick: () =>
          confirmDialog(
            t(fiche ? 'perso.supprimerFicheTitre' : 'perso.supprimerFonctionTitre'),
            t(fiche ? 'perso.supprimerFicheTexte' : 'perso.supprimerFonctionTexte', { titre: item.titre }),
            t('perso.supprimer'),
            () => {
              deletePerso(content(), type, item.id);
              resetSearchIndex();
              toast(t(fiche ? 'perso.ficheSupprimee' : 'perso.fonctionSupprimee'), { icon: 'trash' });
              navigate(fiche ? '/archives' : '/arsenal');
            },
            true
          ),
      })
    )
  );
}
