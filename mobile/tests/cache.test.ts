import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ajouterExerciceAuLot,
  enregistrerCorrection,
  lireDernierExercice,
  lireLotExercices,
  sauvegarderProgression,
  lireProgression,
  viderCache,
  TAILLE_LOT,
} from '@/services/cache';
import type { Correction, Exercice } from '@/types';

const exo = (n: number): Exercice => ({
  exerciceId: `e${n}`,
  enonce: `Énoncé ${n}`,
  themeId: 't1',
  difficulte: 'moyen',
});

const CORRECTION: Correction = {
  correct: true,
  verdict: 'Bravo !',
  explication: 'On isole x.',
  progression: { themeId: 't1', scoreMaitrise: 100, nbTentatives: 1, nbReussies: 1 },
};

beforeEach(async () => {
  await AsyncStorage.clear();
  await viderCache();
});

describe('Cache hors ligne du lot d\'exercices', () => {
  it('conserve le dernier exercice généré', async () => {
    await ajouterExerciceAuLot(exo(1));

    const dernier = await lireDernierExercice();
    expect(dernier?.exercice.enonce).toBe('Énoncé 1');
    expect(dernier?.correction).toBeNull();
  });

  it('place le plus récent en tête du lot', async () => {
    await ajouterExerciceAuLot(exo(1));
    await ajouterExerciceAuLot(exo(2));

    const lot = await lireLotExercices();
    expect(lot.map((e) => e.exercice.exerciceId)).toEqual(['e2', 'e1']);
    expect((await lireDernierExercice())?.exercice.exerciceId).toBe('e2');
  });

  it('borne la taille du lot pour ne pas saturer le téléphone', async () => {
    for (let i = 0; i < TAILLE_LOT + 5; i++) {
      await ajouterExerciceAuLot(exo(i));
    }

    expect(await lireLotExercices()).toHaveLength(TAILLE_LOT);
  });

  it('ne duplique pas un exercice déjà présent', async () => {
    await ajouterExerciceAuLot(exo(1));
    await ajouterExerciceAuLot(exo(1));

    expect(await lireLotExercices()).toHaveLength(1);
  });

  it('attache la correction à l\'exercice correspondant', async () => {
    await ajouterExerciceAuLot(exo(1));
    await ajouterExerciceAuLot(exo(2));

    await enregistrerCorrection('e1', CORRECTION);

    const lot = await lireLotExercices();
    expect(lot.find((e) => e.exercice.exerciceId === 'e1')?.correction).toEqual(CORRECTION);
    expect(lot.find((e) => e.exercice.exerciceId === 'e2')?.correction).toBeNull();
  });

  it('survit à un stockage vide', async () => {
    expect(await lireLotExercices()).toEqual([]);
    expect(await lireDernierExercice()).toBeNull();
  });

  it('ne plante pas si le contenu stocké est corrompu', async () => {
    await AsyncStorage.setItem('repetia_lot_exercices', 'ceci-nest-pas-du-json');

    expect(await lireLotExercices()).toEqual([]);
  });
});

describe('Cache de la progression', () => {
  it('relit la progression enregistrée', async () => {
    const progression = {
      global: { faits: 3, reussis: 2, taux: 67 },
      parTheme: [
        { themeId: 't1', libelle: 'Thalès', scoreMaitrise: 70, nbTentatives: 3, nbReussies: 2 },
      ],
      recommandation: null,
    };

    await sauvegarderProgression(progression);

    expect(await lireProgression()).toEqual(progression);
  });

  it('renvoie null quand rien n\'a encore été enregistré', async () => {
    expect(await lireProgression()).toBeNull();
  });
});
