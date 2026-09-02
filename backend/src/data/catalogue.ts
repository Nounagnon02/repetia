import type { PrismaClient } from '@prisma/client';

/**
 * Contenu de référence de RépétIA : les matières écrites du BEPC béninois et
 * leurs thèmes.
 *
 * Source unique, partagée par le seed manuel (`npm run seed`) et par la
 * vérification au démarrage du serveur — sans elle l'application n'a rien à
 * proposer à l'élève.
 */
export interface MatiereCatalogue {
  code: string;
  libelle: string;
  niveau: string;
  /** Ordre d'affichage ; les mathématiques d'abord, matière historique du produit. */
  themes: string[];
}

export const CATALOGUE: MatiereCatalogue[] = [
  {
    code: 'MATHS_BEPC',
    libelle: 'Mathématiques',
    niveau: 'BEPC',
    themes: [
      'Équations du 1er degré',
      'Calcul littéral (développer / factoriser)',
      'Théorème de Thalès',
      'Théorème de Pythagore',
      'Trigonométrie (triangle rectangle)',
      'Statistiques (moyenne, effectifs)',
      'Racines carrées',
      'Fractions et puissances',
    ],
  },
  {
    code: 'PCT_BEPC',
    libelle: 'Physique-Chimie-Technologie',
    niveau: 'BEPC',
    themes: [
      'Circuits électriques',
      'Loi d’Ohm et résistances',
      'Forces et équilibre',
      'Travail et énergie',
      'Optique (lentilles, miroirs)',
      'Atomes, molécules et ions',
      'Réactions chimiques',
      'Solutions et concentrations',
    ],
  },
  {
    code: 'SVT_BEPC',
    libelle: 'Sciences de la Vie et de la Terre',
    niveau: 'BEPC',
    themes: [
      'Nutrition et digestion',
      'Respiration et circulation',
      'Reproduction humaine',
      'Hérédité et génétique',
      'Écosystèmes et chaînes alimentaires',
      'Sols et roches',
      'Hygiène et maladies',
      'Environnement et développement durable',
    ],
  },
  {
    // Le BEPC béninois n'évalue pas « le français » en bloc : il distingue
    // deux épreuves écrites, Lecture et Communication écrite.
    code: 'LECTURE_BEPC',
    libelle: 'Lecture',
    niveau: 'BEPC',
    themes: [
      'Compréhension d’un texte narratif',
      'Compréhension d’un texte argumentatif',
      'Repérage des idées et de la structure',
      'Vocabulaire en contexte',
      'Figures de style',
      'Poésie et versification',
      'Lecture d’image et de document',
    ],
  },
  {
    code: 'COMMUNICATION_BEPC',
    libelle: 'Communication écrite',
    niveau: 'BEPC',
    themes: [
      'Grammaire (nature et fonction)',
      'Conjugaison et temps verbaux',
      'Orthographe et accords',
      'Rédaction narrative',
      'Rédaction argumentative',
      'Résumé et compte rendu',
      'Lettre et écrits fonctionnels',
    ],
  },
  {
    code: 'ANGLAIS_BEPC',
    libelle: 'Anglais',
    niveau: 'BEPC',
    themes: [
      'Present and past tenses',
      'Future and conditionals',
      'Prepositions and articles',
      'Vocabulary and word building',
      'Reading comprehension',
      'Direct and reported speech',
      'Writing (letter, narrative)',
    ],
  },
  {
    code: 'ESPAGNOL_BEPC',
    libelle: 'Espagnol',
    niveau: 'BEPC',
    themes: [
      'Presente de indicativo',
      'Pretérito indefinido e imperfecto',
      'Ser y estar',
      'Vocabulario de la vida diaria',
      'Comprensión de texto',
      'Expresión escrita',
      'Pronombres y preposiciones',
    ],
  },
  {
    code: 'ALLEMAND_BEPC',
    libelle: 'Allemand',
    niveau: 'BEPC',
    themes: [
      'Präsens und starke Verben',
      'Perfekt und Präteritum',
      'Deklination und Fälle',
      'Wortschatz des Alltags',
      'Textverständnis',
      'Schriftlicher Ausdruck',
      'Präpositionen und Satzbau',
    ],
  },
  {
    code: 'HISTGEO_BEPC',
    libelle: 'Histoire-Géographie',
    niveau: 'BEPC',
    themes: [
      'Traite négrière et colonisation',
      'Indépendances africaines',
      'Le Bénin contemporain',
      'Grandes puissances et conflits mondiaux',
      'Relief, climat et végétation du Bénin',
      'Population et urbanisation',
      'Activités économiques du Bénin',
      'Environnement et risques naturels',
    ],
  },
];

/** Matière historique, servie par défaut aux clients qui n'en choisissent pas. */
export const MATIERE_PAR_DEFAUT = CATALOGUE[0];

/**
 * Installe les matières et leurs thèmes s'ils manquent. Idempotent : relancer
 * ne crée aucun doublon et ne touche pas aux données des élèves.
 * @returns le nombre total de thèmes disponibles
 */
export async function assurerCatalogue(prisma: PrismaClient): Promise<number> {
  for (const [rang, matiereRef] of CATALOGUE.entries()) {
    const matiere = await prisma.matiere.upsert({
      where: { code: matiereRef.code },
      update: { libelle: matiereRef.libelle, niveau: matiereRef.niveau, ordre: rang + 1 },
      create: {
        code: matiereRef.code,
        libelle: matiereRef.libelle,
        niveau: matiereRef.niveau,
        ordre: rang + 1,
      },
    });

    for (const [index, libelle] of matiereRef.themes.entries()) {
      await prisma.theme.upsert({
        where: { matiereId_libelle: { matiereId: matiere.id, libelle } },
        // `ordre` encode aussi le rang de la matière : le tri global reste
        // stable quand plusieurs matières coexistent.
        update: { ordre: rang * 100 + index + 1 },
        create: { matiereId: matiere.id, libelle, ordre: rang * 100 + index + 1 },
      });
    }
  }

  await retirerMatieresObsoletes(prisma);
  return prisma.theme.count();
}

/**
 * Retire les matières qui ne figurent plus au catalogue.
 *
 * Le découpage a évolué : « Français » a été remplacé par les deux épreuves
 * réellement distinguées au BEPC béninois, Lecture et Communication écrite.
 * Sans ce nettoyage, l'ancienne matière resterait affichée aux élèves.
 *
 * La suppression est PRUDENTE : une matière dont un élève a déjà travaillé un
 * thème est conservée, pour ne jamais détruire de progression. Elle devra alors
 * être traitée à la main, avec une migration.
 */
async function retirerMatieresObsoletes(prisma: PrismaClient): Promise<void> {
  const codesValides = CATALOGUE.map((m) => m.code);
  const obsoletes = await prisma.matiere.findMany({
    where: { code: { notIn: codesValides } },
    include: { themes: { include: { _count: { select: { exercices: true, progressions: true } } } } },
  });

  for (const matiere of obsoletes) {
    const utilisee = matiere.themes.some(
      (t) => t._count.exercices > 0 || t._count.progressions > 0,
    );
    if (utilisee) {
      console.warn(
        `Matière obsolète « ${matiere.libelle} » conservée : des données d'élèves y sont rattachées.`,
      );
      continue;
    }
    await prisma.theme.deleteMany({ where: { matiereId: matiere.id } });
    await prisma.matiere.delete({ where: { id: matiere.id } });
    console.log(`Matière obsolète retirée : ${matiere.libelle}`);
  }
}
