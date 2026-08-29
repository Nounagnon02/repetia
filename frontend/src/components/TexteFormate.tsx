import { Fragment } from 'react';

interface Props {
  texte: string;
  className?: string;
}

/**
 * Affiche le texte produit par l'IA.
 *
 * Le modèle glisse régulièrement du Markdown léger (**gras**, `code`) dans ses
 * explications. Sans traitement, l'élève lit littéralement « **Étape 1** ».
 * On rend donc ces deux marques et on préserve les sauts de ligne — sans
 * dépendance Markdown, pour garder le bundle léger (NF-02/NF-03).
 */
function rendreLigne(ligne: string) {
  const morceaux = ligne.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);

  return morceaux.map((morceau, i) => {
    if (morceau.startsWith('**') && morceau.endsWith('**') && morceau.length > 4) {
      return <strong key={i}>{morceau.slice(2, -2)}</strong>;
    }
    if (morceau.startsWith('`') && morceau.endsWith('`') && morceau.length > 2) {
      return (
        <code key={i} className="rounded bg-brand-gold-soft px-1 py-0.5 font-mono text-[0.95em]">
          {morceau.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={i}>{morceau}</Fragment>;
  });
}

export default function TexteFormate({ texte, className = '' }: Props) {
  const lignes = String(texte ?? '').split('\n');

  return (
    <div className={`leading-relaxed ${className}`}>
      {lignes.map((ligne, i) =>
        ligne.trim() === '' ? (
          <div key={i} className="h-3" aria-hidden="true" />
        ) : (
          <p key={i}>{rendreLigne(ligne)}</p>
        ),
      )}
    </div>
  );
}
