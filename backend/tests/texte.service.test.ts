import { normaliserTexte, normaliserChamps } from '../src/services/texte.service';

describe('Conversion du LaTeX en écriture lisible', () => {
  it('retire les délimiteurs mathématiques', () => {
    expect(normaliserTexte('On pose $A = 5$ ici.')).toBe('On pose A = 5 ici.');
    expect(normaliserTexte('$$A = 12$$')).toBe('A = 12');
    expect(normaliserTexte('\\(x = 2\\) et \\[y = 3\\]')).toBe('x = 2 et y = 3');
  });

  it('écrit les racines carrées avec le symbole √', () => {
    expect(normaliserTexte('$\\sqrt{45}$')).toBe('√45');
    expect(normaliserTexte('\\sqrt{x + 1}')).toBe('√(x + 1)');
    expect(normaliserTexte('$\\sqrt{9} = 3$')).toBe('√9 = 3');
  });

  it('convertit les opérateurs', () => {
    expect(normaliserTexte('$45 = 9 \\times 5$')).toBe('45 = 9 × 5');
    expect(normaliserTexte('12 \\div 4')).toBe('12 ÷ 4');
    expect(normaliserTexte('$a \\leq b$ et $c \\neq d$')).toBe('a ≤ b et c ≠ d');
    expect(normaliserTexte('60\\degree')).toBe('60°');
    expect(normaliserTexte('(MN) \\parallel (BC)')).toBe('(MN) ∥ (BC)');
  });

  it('convertit les fractions', () => {
    expect(normaliserTexte('$\\frac{3}{4}$')).toBe('3/4');
    expect(normaliserTexte('\\frac{x + 1}{2}')).toBe('(x + 1)/2');
  });

  it('convertit les puissances en exposants', () => {
    expect(normaliserTexte('$x^2$')).toBe('x²');
    expect(normaliserTexte('$10^{5}$')).toBe('10⁵');
    expect(normaliserTexte('BC^{2} = AB^{2} + AC^{2}')).toBe('BC² = AB² + AC²');
  });

  it('laisse intact un exposant sans équivalent Unicode', () => {
    expect(normaliserTexte('x^{abc}')).toContain('^');
  });

  it('reproduit le cas réel remonté par l\'application', () => {
    const brut = '$$A = \\sqrt{45} - 2\\sqrt{80} + \\sqrt{180}$$';
    expect(normaliserTexte(brut)).toBe('A = √45 - 2√80 + √180');
  });

  it('traite un enchaînement complet d\'étapes', () => {
    const brut = [
      '### Étape 1 : Décomposons',
      '* Pour $\\sqrt{45}$ : on sait que $45 = 9 \\times 5$.',
      'Donc $\\sqrt{45} = \\sqrt{9} \\times \\sqrt{5} = 3\\sqrt{5}$.',
    ].join('\n');
    expect(normaliserTexte(brut)).toBe(
      [
        '**Étape 1 : Décomposons**',
        '• Pour √45 : on sait que 45 = 9 × 5.',
        'Donc √45 = √9 × √5 = 3√5.',
      ].join('\n'),
    );
  });
});

describe('Nettoyage du Markdown non supporté', () => {
  it('transforme les titres en gras', () => {
    expect(normaliserTexte('## Première partie')).toBe('**Première partie**');
    expect(normaliserTexte('# Titre #')).toBe('**Titre**');
  });

  it('transforme les puces en points médians', () => {
    expect(normaliserTexte('- premier\n- second')).toBe('• premier\n• second');
    expect(normaliserTexte('* item')).toBe('• item');
  });

  it('ne confond pas une puce avec du gras en début de ligne', () => {
    expect(normaliserTexte('**Étape 1** : on isole x')).toBe('**Étape 1** : on isole x');
  });

  it('supprime les séparateurs horizontaux', () => {
    expect(normaliserTexte('avant\n---\naprès')).toBe('avant\n\naprès');
  });

  it('préserve le gras, seule marque rendue par l\'interface', () => {
    expect(normaliserTexte('**Bien joué !** Tu as trouvé.')).toBe('**Bien joué !** Tu as trouvé.');
  });
});

describe('Robustesse', () => {
  it('accepte une entrée vide ou absente', () => {
    expect(normaliserTexte('')).toBe('');
    expect(normaliserTexte(undefined as unknown as string)).toBe('');
  });

  it('laisse passer un texte déjà propre', () => {
    const propre = 'On isole x : 2x = 8, donc x = 4.';
    expect(normaliserTexte(propre)).toBe(propre);
  });

  it('normalise les champs demandés et laisse les autres', () => {
    const objet = { enonce: '$x^2$', solution: '$\\sqrt{4}$', source: 'ia_genere' };
    const propre = normaliserChamps(objet, ['enonce', 'solution']);

    expect(propre.enonce).toBe('x²');
    expect(propre.solution).toBe('√4');
    expect(propre.source).toBe('ia_genere');
  });
});
