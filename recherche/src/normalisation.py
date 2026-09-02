"""
Normalisation du texte, pour comparer ce qui est comparable.

La vérification manuelle d'une annale a montré que l'OCR perd
systématiquement les diacritiques : « Compétence » devient « Competence »,
« Maîtrise » devient « Maitrise ». Le moteur annonce pourtant une confiance de
0,98 — il est sûr de lui, et il a tort sur les accents.

Conséquence pour la modélisation : le corpus d'entraînement, généré par un
modèle, est correctement accentué ; le jeu de test, transcrit par OCR, ne l'est
pas. Sans traitement, le classifieur serait évalué sur une différence de
typographie plutôt que sur son aptitude à reconnaître une matière.

On applique donc la MÊME normalisation des deux côtés. Ce n'est pas une
commodité : c'est ce qui rend l'évaluation honnête.
"""
from __future__ import annotations

import re
import unicodedata

# Les titres d'épreuve, en gras souligné, ressortent parfois soudés :
# « EXAMENBLANCINTERNEDUBEPC ». On les redécoupe sur un vocabulaire connu.
MOTS_SOUDES = [
    "EXAMEN", "BLANC", "INTERNE", "NATIONAL", "DEPARTEMENTAL", "BEPC",
    "EPREUVE", "DUREE", "COEF", "SERIE",
]
_RE_SOUDES = re.compile("(" + "|".join(MOTS_SOUDES) + ")")


def sans_accents(texte: str) -> str:
    """Retire les diacritiques sans toucher au reste (ß, œ… préservés)."""
    decompose = unicodedata.normalize("NFD", texte)
    return unicodedata.normalize(
        "NFC", "".join(c for c in decompose if unicodedata.category(c) != "Mn")
    )


def desouder(texte: str) -> str:
    """Réinsère les espaces perdus dans les titres tout en majuscules."""
    def _traiter(m: re.Match) -> str:
        mot = m.group(0)
        if len(mot) <= 12:
            return mot
        # split() conserve les séparateurs ET le texte intercalaire : garder
        # les deux, sinon les liaisons non listées (« DU ») disparaissent.
        morceaux = [p for p in _RE_SOUDES.split(mot) if p]
        return " ".join(morceaux) if len(morceaux) > 1 else mot

    return re.sub(r"\b[A-Z]{12,}\b", _traiter, texte)


def normaliser(texte: str, retirer_accents: bool = True) -> str:
    """
    Met un texte sous la forme utilisée par les modèles.

    `retirer_accents` est vrai par défaut : c'est le seul moyen de comparer
    équitablement un corpus généré (accentué) et un corpus transcrit (non
    accentué). Le mettre à faux permet de mesurer précisément ce que cette
    normalisation coûte ou rapporte.
    """
    t = desouder(texte)
    t = t.replace("’", "'").replace("«", '"').replace("»", '"')
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    if retirer_accents:
        t = sans_accents(t)
    return t.strip()


def taux_accents(texte: str) -> float:
    """
    Proportion de lettres accentuées parmi les lettres du texte.

    Sert d'indicateur : un texte français courant tourne autour de 3 à 5 %.
    Une valeur proche de zéro trahit une transcription qui les a perdus.
    """
    lettres = [c for c in texte if c.isalpha()]
    if not lettres:
        return 0.0
    accentuees = sum(1 for c in lettres if c != sans_accents(c))
    return 100 * accentuees / len(lettres)
