"""Importe les exercices CORRIGÉS d'Exo7 pour le jeu d'entraînement (vague 5).

Exo7 (http://exo7.emath.fr) publie environ 8 000 exercices de mathématiques
de licence, sous licence **Creative Commons BY-NC-SA 3.0 FR** : réutilisation
permise avec attribution, sans usage commercial, et partage dans les mêmes
conditions. Un modèle entraîné sur ces données hérite de ces conditions —
voir `recherche/SOURCES.md`.

    curl -o recherche/donnees/brutes/exo7/ficall.tex http://exo7.emath.fr/ficpdf/ficall.tex
    python recherche/src/importer_exo7.py

Ne garde que :
  • les exercices qui ont une CORRECTION (≈ 3 500 sur 8 000) ;
  • les sections 1xx (première année) et 2xx (deuxième année) — le tronc
    commun visé en premier par la vague 5 ; 3xx et 4xx relèvent de la
    troisième année et du master ;
  • ceux dont le LaTeX se convertit ENTIÈREMENT en écriture Unicode (règle
    du projet : pas de LaTeX devant l'élève). Un reste de commande, une
    figure TikZ, un tableau : l'exercice est rejeté et compté, pas rafistolé.
"""
from __future__ import annotations

import collections
import json
import pathlib
import re

RACINE = pathlib.Path(__file__).resolve().parents[2]
SOURCE = RACINE / "recherche/donnees/brutes/exo7/ficall.tex"
SORTIE = RACINE / "recherche/donnees/brutes/exo7/exo7_exercices.jsonl"
LONGUEUR_MAX = 3000  # caractères, énoncé + correction : au-delà, trop long pour un exemple

# ---------------------------------------------------------------------------
# LaTeX → Unicode
# ---------------------------------------------------------------------------

ACCENTS = {
    "'": {"e": "é", "E": "É", "a": "á", "i": "í", "o": "ó", "u": "ú"},
    "`": {"e": "è", "a": "à", "u": "ù", "E": "È", "A": "À"},
    "^": {"e": "ê", "a": "â", "i": "î", "o": "ô", "u": "û", "E": "Ê", "A": "Â", "I": "Î", "O": "Ô"},
    '"': {"e": "ë", "i": "ï", "u": "ü", "o": "ö"},
}

SYMBOLES = {
    "Rr": "ℝ", "R": "ℝ", "Nn": "ℕ", "N": "ℕ", "Zz": "ℤ", "Z": "ℤ", "Qq": "ℚ", "Q": "ℚ", "Cc": "ℂ", "C": "ℂ",
    "Kk": "𝕂", "K": "𝕂",
    "forall": "∀", "exists": "∃", "in": "∈", "notin": "∉", "subset": "⊂", "subseteq": "⊂", "supset": "⊃",
    "cup": "∪", "cap": "∩", "bigcup": "⋃", "bigcap": "⋂", "emptyset": "∅", "varnothing": "∅",
    "infty": "∞", "leq": "≤", "le": "≤", "geq": "≥", "ge": "≥", "leqslant": "≤", "geqslant": "≥",
    "neq": "≠", "ne": "≠", "approx": "≈", "simeq": "≃", "sim": "∼", "equiv": "≡", "times": "×", "cdot": "·",
    "cdots": "…", "ldots": "…", "dots": "…", "pm": "±", "mp": "∓", "div": "÷", "circ": "∘",
    "to": "→", "rightarrow": "→", "longrightarrow": "⟶", "mapsto": "↦", "longmapsto": "⟼", "leftarrow": "←",
    "Rightarrow": "⇒", "Longrightarrow": "⟹", "implies": "⇒", "Leftarrow": "⇐", "Leftrightarrow": "⇔",
    "iff": "⇔", "Longleftrightarrow": "⟺", "sum": "∑", "prod": "∏", "int": "∫", "iint": "∬", "oint": "∮",
    "partial": "∂", "nabla": "∇", "neg": "¬", "lnot": "¬", "wedge": "∧", "land": "∧", "vee": "∨", "lor": "∨",
    "perp": "⊥", "parallel": "∥", "angle": "∠", "prime": "′", "setminus": "∖", "mid": "|", "vert": "|",
    "Vert": "‖", "|": "‖", "langle": "⟨", "rangle": "⟩", "lfloor": "⌊", "rfloor": "⌋", "ll": "≪", "gg": "≫",
    "alpha": "α", "beta": "β", "gamma": "γ", "delta": "δ", "epsilon": "ε", "varepsilon": "ε", "zeta": "ζ",
    "eta": "η", "theta": "θ", "vartheta": "θ", "iota": "ι", "kappa": "κ", "lambda": "λ", "mu": "μ", "nu": "ν",
    "xi": "ξ", "pi": "π", "rho": "ρ", "sigma": "σ", "tau": "τ", "phi": "φ", "varphi": "φ", "chi": "χ",
    "psi": "ψ", "omega": "ω", "Gamma": "Γ", "Delta": "Δ", "Theta": "Θ", "Lambda": "Λ", "Xi": "Ξ", "Pi": "Π",
    "Sigma": "Σ", "Phi": "Φ", "Psi": "Ψ", "Omega": "Ω",
    "ln": "ln", "log": "log", "exp": "exp", "sin": "sin", "cos": "cos", "tan": "tan", "ch": "ch", "sh": "sh",
    "tanh": "th", "cotan": "cotan", "Arcsin": "arcsin", "Arccos": "arccos", "Arctan": "arctan", "arcsin": "arcsin",
    "arccos": "arccos", "arctan": "arctan", "Argsh": "argsh", "Argch": "argch", "Argth": "argth", "lim": "lim",
    "limsup": "lim sup", "liminf": "lim inf", "sup": "sup", "inf": "inf", "max": "max", "min": "min",
    "det": "det", "dim": "dim", "Ker": "Ker", "Im": "Im", "Re": "Re", "deg": "deg", "pgcd": "pgcd", "gcd": "pgcd",
    "dd": "d", "quad": " ", "qquad": "  ", ",": " ", ";": " ", ":": " ", "!": "", " ": " ", "\\": "\n",
    "newline": "\n", "par": "\n", "noindent": "", "displaystyle": "", "textstyle": "", "left": "", "right": "",
    "big": "", "Big": "", "bigg": "", "Bigg": "", "bigl": "", "bigr": "", "Bigl": "", "Bigr": "",
    "limits": "", "nolimits": "", "medskip": "\n", "smallskip": "", "bigskip": "\n", "hfill": " ", "vfill": "",
    "item": "\n• ", "{": "{", "}": "}", "%": "%", "&": "&", "_": "_", "#": "#", "$": "$",
    "og": "« ", "fg": " »", "ell": "ℓ", "oplus": "⊕", "otimes": "⊗", "llbracket": "⟦", "rrbracket": "⟧",
    "bot": "⊥", "top": "⊤", "cdotp": "·", "cr": "\n", "colon": ":", "bullet": "•", "textbullet": "•",
    "ker": "Ker", "lbrace": "{", "rbrace": "}", "sinh": "sh", "cosh": "ch", "coth": "coth", "star": "⋆",
    "iiint": "∭", "ast": "∗", "wedge": "∧", "subsetneq": "⊊", "nmid": "∤", "triangle": "△", "square": "□",
    "cap": "∩", "lceil": "⌈", "rceil": "⌉", "Arccotan": "arccotan", "arccot": "arccot", "sgn": "sgn",
    "Card": "Card", "card": "Card", "id": "id", "Id": "Id", "tr": "tr", "rg": "rg", "Vect": "Vect", "S": "§", "degree": "°", "ie": "c'est-à-dire", "cf": "cf.",
}

EXPOSANTS = str.maketrans("0123456789+-=()niajk", "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱᵃʲᵏ")
INDICES = str.maketrans("0123456789+-=()aeoxijknmp", "₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓᵢⱼₖₙₘₚ")
PEUT_EXPOSANT = set("0123456789+-=()niajk")
PEUT_INDICE = set("0123456789+-=()aeoxijknmp")


def _groupe(t: str, i: int) -> tuple[str, int]:
    """Lit un argument {…} (accolades imbriquées) ou un caractère, à partir de i."""
    while i < len(t) and t[i] == " ":
        i += 1
    if i >= len(t):
        return "", i
    if t[i] != "{":
        if t[i] == "\\":
            m = re.match(r"\\[A-Za-z]+|\\[\s\S]", t[i:])
            return (m.group(), i + len(m.group())) if m else ("", i + 1)
        return t[i], i + 1
    profondeur, j = 0, i
    while j < len(t):
        if t[j] == "{" and (j == 0 or t[j - 1] != "\\"):
            profondeur += 1
        elif t[j] == "}" and t[j - 1] != "\\":
            profondeur -= 1
            if profondeur == 0:
                return t[i + 1:j], j + 1
        j += 1
    raise ValueError("accolade non fermée")


def _parenthese(x: str) -> str:
    x = x.strip()
    return x if re.fullmatch(r"[\w.,′]+|√\(.*\)|\(.*\)", x) and len(x) <= 12 or len(x) == 1 else f"({x})"


def _exposant(x: str, table, permis) -> str | None:
    return x.translate(table) if x and all(c in permis for c in x) else None


def convertir(t: str) -> str:
    """LaTeX → texte Unicode. Lève ValueError si un reste ne se convertit pas."""
    t = re.sub(r"(?<!\\)%.*", "", t)  # commentaires
    t = re.sub(r"\\begin\{(enumerate|itemize|description)\}(\[[^\]]*\])?|\\end\{(enumerate|itemize|description)\}",
               "\n", t)
    t = re.sub(r"\\begin\{cases\}", "\n{ ", t)
    t = re.sub(r"\\end\{cases\}|\\(begin|end)\{(center|aligned|split)\}", "\n", t)
    t = re.sub(r"\\(cal|strut|/|-|biggl|biggr|Biggl|Biggr|smash)(?![A-Za-z])", "", t)
    t = re.sub(r"\\not\s*\\in(?![A-Za-z])", "∉", t)
    t = re.sub(r"\\not\s*=", "≠", t)
    t = re.sub(r"\\(hskip|vskip)\s*-?[0-9.]+\s*(cm|mm|pt|em|ex)", " ", t)
    if re.search(r"\\begin\{(tikzpicture|picture|tabular|array|pmatrix|bmatrix|vmatrix|smallmatrix|matrix|figure)\}|"
                 r"\\includegraphics|\\myfigure|\\input", t):
        raise ValueError("figure, tableau ou matrice")
    t = re.sub(r"\\begin\{(align\*?|eqnarray\*?|equation\*?|gather\*?)\}|\\end\{(align\*?|eqnarray\*?|equation\*?|gather\*?)\}",
               "\n", t)
    t = t.replace("$$", "\n").replace("\\[", "\n").replace("\\]", "\n").replace("$", "")
    t = re.sub(r"\\\(|\\\)", "", t)
    t = re.sub(r"\\c\{?c\}?", "ç", t)
    t = re.sub(r"\\oe\b", "œ", t)
    for accent, table in ACCENTS.items():
        for lettre, rendu in table.items():
            t = re.sub(r"\\" + re.escape(accent) + r"\{?" + lettre + r"\}?", rendu, t)
            t = t.replace("\\" + accent + "\\i", rendu if lettre == "i" else "\\" + accent + "\\i")

    sortie, i = [], 0
    while i < len(t):
        c = t[i]
        if c == "\\":
            m = re.match(r"\\([A-Za-z]+)|\\([\s\S])", t[i:])
            if not m:  # barre oblique finale, orpheline
                i += 1
                continue
            nom = m.group(1) or m.group(2)
            if nom in ("\n", "\r", "\t"):
                nom = " "
            i += len(m.group())
            if nom in ("frac", "dfrac", "tfrac"):
                a, i = _groupe(t, i)
                b, i = _groupe(t, i)
                sortie.append(f"{_parenthese(convertir(a))}/{_parenthese(convertir(b))}")
            elif nom == "sqrt":
                indice = ""
                if i < len(t) and t[i] == "[":
                    fin = t.index("]", i)
                    indice, i = t[i + 1:fin], fin + 1
                a, i = _groupe(t, i)
                r = convertir(a).strip()
                racine = {"3": "∛", "4": "∜"}.get(indice.strip(), "√")
                if indice and indice.strip() not in ("3", "4"):
                    raise ValueError("racine n-ième")
                sortie.append(racine + (r if re.fullmatch(r"\w", r) else f"({r})"))
            elif nom == "pmod":
                a, i = _groupe(t, i)
                sortie.append(f" (mod {convertir(a)})")
            elif nom in ("xrightarrow", "xleftarrow"):
                a, i = _groupe(t, i)
                sortie.append(" → " if nom == "xrightarrow" else " ← ")
            elif nom in ("underset", "overset", "stackrel"):
                a, i = _groupe(t, i)
                b, i = _groupe(t, i)
                sortie.append(convertir(b))
            elif nom in ("underbrace", "overbrace", "phantom", "hphantom", "vphantom"):
                a, i = _groupe(t, i)
                if nom in ("underbrace", "overbrace"):
                    sortie.append(convertir(a))
            elif nom == "rule":
                _, i = _groupe(t, i)
                _, i = _groupe(t, i)
            elif nom in ("text", "textrm", "textsc", "ensuremath", "mathring", "mathrm", "textbf", "textit", "emph", "mbox", "mathbf", "operatorname",
                         "mathit", "boldsymbol", "bf", "it", "rm", "hbox", "underline", "textsf", "mathsf"):
                if nom in ("bf", "it", "rm"):
                    continue
                a, i = _groupe(t, i)
                sortie.append(convertir(a))
            elif nom == "mathcal":
                a, i = _groupe(t, i)
                sortie.append(convertir(a))
            elif nom == "mathbb":
                a, i = _groupe(t, i)
                sortie.append({"R": "ℝ", "N": "ℕ", "Z": "ℤ", "Q": "ℚ", "C": "ℂ", "K": "𝕂"}.get(a.strip(), a))
            elif nom in ("vec", "overrightarrow"):
                a, i = _groupe(t, i)
                sortie.append(convertir(a) + "⃗")
            elif nom in ("bar", "overline"):
                a, i = _groupe(t, i)
                sortie.append(convertir(a) + "̄")
            elif nom in ("hat", "widehat"):
                a, i = _groupe(t, i)
                sortie.append(convertir(a) + "̂")
            elif nom in ("tilde", "widetilde"):
                a, i = _groupe(t, i)
                sortie.append(convertir(a) + "̃")
            elif nom in ("dot",):
                a, i = _groupe(t, i)
                sortie.append(convertir(a) + "̇")
            elif nom in ("binom", "dbinom"):
                a, i = _groupe(t, i)
                b, i = _groupe(t, i)
                sortie.append(f"C({convertir(b)}, {convertir(a)})")
            elif nom in ("mathop",):
                a, i = _groupe(t, i)
                sortie.append(convertir(a))
            elif nom in ("label", "ref", "eqref", "vspace", "hspace", "video", "index", "cite", "hyperlink",
                         "href", "url"):
                if i < len(t) and t[i] == "*":
                    i += 1
                a, i = _groupe(t, i)
                if nom in ("hyperlink", "href"):
                    b, i = _groupe(t, i)
                    sortie.append(convertir(b))
            elif nom in SYMBOLES:
                sortie.append(SYMBOLES[nom])
            else:
                raise ValueError(f"commande inconnue \\{nom}")
        elif c in "^_":
            i += 1
            a, i = _groupe(t, i)
            a = convertir(a).strip()
            table, permis = (EXPOSANTS, PEUT_EXPOSANT) if c == "^" else (INDICES, PEUT_INDICE)
            petit = _exposant(a, table, permis)
            if petit is not None:
                sortie.append(petit)
            else:
                sortie.append(("^" if c == "^" else "_") + ("(" + a + ")" if len(a) > 1 else a))
        elif c in "{}":
            i += 1
        elif c == "~":
            sortie.append(" ")
            i += 1
        else:
            sortie.append(c)
            i += 1
    texte = "".join(sortie)
    texte = re.sub(r"[ \t]+", " ", texte)
    texte = re.sub(r" *\n *", "\n", texte)
    texte = re.sub(r"\n{3,}", "\n\n", texte)
    texte = texte.replace("&", " ")
    return texte.strip()


# ---------------------------------------------------------------------------
# Découpage
# ---------------------------------------------------------------------------

DIFFICULTE = {"*": "facile", "**": "moyen", "***": "examen", "****": "examen"}
DEMONSTRATION = re.compile(r"\b(montrer|démontrer|prouver|justifier|établir)\b", re.I)


def solution_concise(enonce: str, correction: str) -> str:
    """Exo7 ne sépare pas « réponse finale » et « explication ».

    Pour une démonstration, la solution EST la démarche : on le dit. Sinon, on
    prend la dernière phrase de la correction qui conclut (« donc », « = »),
    bornée en longueur ; à défaut, la dernière phrase.
    """
    phrases = [p.strip() for p in re.split(r"(?<=[.!?])\s+|\n+", correction) if len(p.strip()) > 3]
    if not phrases:
        return ""
    if DEMONSTRATION.search(enonce) and not re.search(r"\b(calculer|déterminer|trouver|résoudre)\b", enonce, re.I):
        return "C'est une démonstration : la preuve complète est donnée pas à pas dans l'explication."
    conclusives = [p for p in phrases if re.search(r"\b(donc|ainsi|finalement|conclusion)\b|=", p, re.I)]
    choix = (conclusives or phrases)[-1]
    return choix if len(choix) <= 300 else choix[:297].rsplit(" ", 1)[0] + "…"


def main() -> None:
    texte = SOURCE.read_text(encoding="utf-8")
    corps = texte[texte.index("\\begin{document}"):]
    section = None
    sections: dict[str, str] = {}
    enonces: dict[str, dict] = {}
    for m in re.finditer(r"\\section\{([0-9.]+) ([^}]*)\}|\\enonce\{(\d+)\}\{([^}]*)\}(.*?)\\finenonce\{\d+\}",
                         corps, re.S):
        if m.group(1):
            section = (m.group(1), m.group(2).strip())
        else:
            enonces[m.group(3)] = {"id": m.group(3), "section": section, "etoiles": m.group(4).strip(),
                                   "enonce_tex": m.group(5)}
    corrections = {m.group(1): m.group(2) for m in
                   re.finditer(r"\\correction\{(\d+)\}(.*?)\\fincorrection", corps, re.S)}

    compte = collections.Counter()
    gardes = []
    for id_, e in enonces.items():
        numero, titre = e["section"]
        annee = numero[0]
        if id_ not in corrections:
            compte["sans correction"] += 1
            continue
        if annee not in ("1", "2"):
            compte["hors L1-L2"] += 1
            continue
        try:
            enonce = convertir(e["enonce_tex"])
            correction = convertir(corrections[id_])
        except ValueError as err:
            compte[f"conversion : {str(err).split(' ')[0] if 'inconnue' in str(err) else err}"] += 1
            continue
        if re.search(r"\\[A-Za-z]", enonce + correction):
            compte["LaTeX résiduel"] += 1
            continue
        if len(enonce) < 20 or len(correction) < 60:
            compte["trop court"] += 1
            continue
        if len(enonce) + len(correction) > LONGUEUR_MAX:
            compte["trop long"] += 1
            continue
        theme = re.sub(r"\s+", " ", titre)
        if theme.lower() == "autre":
            theme = "Exercices divers"
        etoiles = re.sub(r"[^*]", "", e["etoiles"])
        gardes.append({
            "id": f"exo7-{id_}",
            "niveau": "L1" if annee == "1" else "L2",
            "matiere": "Mathématiques",
            "theme": theme,
            "section": numero,
            "difficulte": DIFFICULTE.get(etoiles, "moyen"),
            "enonce": enonce,
            "solution": solution_concise(enonce, correction),
            "explication": correction,
            "source": "Exo7 (exo7.emath.fr), CC BY-NC-SA 3.0 FR",
        })
        compte["gardé"] += 1

    SORTIE.write_text("".join(json.dumps(g, ensure_ascii=False) + "\n" for g in gardes), encoding="utf-8")
    print(f"{len(enonces)} exercices lus, {len(corrections)} corrections")
    for k, v in compte.most_common():
        print(f"  {v:>5}  {k}")
    print(f"→ {SORTIE.relative_to(RACINE)} ({len(gardes)} exercices,",
          dict(collections.Counter(g['niveau'] for g in gardes)), ")")


if __name__ == "__main__":
    main()
