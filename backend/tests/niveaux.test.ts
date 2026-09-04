import { NIVEAUX, niveauPar, estCollegeInferieur } from '../src/data/niveaux';
import { CATALOGUE } from '../src/data/catalogue';

describe('niveaux', () => {
  it('couvre tous les niveaux présents au catalogue', () => {
    const auCatalogue = new Set(CATALOGUE.map((m) => m.niveau));
    const decrits = new Set(NIVEAUX.map((n) => n.code));

    for (const niveau of auCatalogue) {
      expect(decrits.has(niveau)).toBe(true);
    }
  });

  it('résout un code inconnu vers le BEPC plutôt que de lever', () => {
    expect(niveauPar('Master').code).toBe('BEPC');
    expect(niveauPar('').code).toBe('BEPC');
    expect(niveauPar(null).code).toBe('BEPC');
    expect(niveauPar(undefined).code).toBe('BEPC');
  });

  it('est insensible à la casse', () => {
    expect(niveauPar('bepc').code).toBe('BEPC');
    expect(niveauPar('bac').code).toBe('BAC');
  });

  it('ordonne les niveaux du plus jeune au plus avancé', () => {
    const rangs = NIVEAUX.map((n) => n.rang);
    expect(rangs).toEqual([...rangs].sort((a, b) => a - b));
    expect(niveauPar('6ème').rang).toBeLessThan(niveauPar('BAC').rang);
  });

  it('distingue le premier cycle du reste', () => {
    expect(estCollegeInferieur('6ème')).toBe(true);
    expect(estCollegeInferieur('4ème')).toBe(true);
    expect(estCollegeInferieur('BEPC')).toBe(false);
    expect(estCollegeInferieur('BAC')).toBe(false);
  });

  it('donne un libellé de programme distinct à chaque niveau', () => {
    const programmes = new Set(NIVEAUX.map((n) => n.programme));
    expect(programmes.size).toBe(NIVEAUX.length);
  });
});
