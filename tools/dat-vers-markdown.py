#!/usr/bin/env python3
"""
Régénère NOTE_TECHNIQUE.md depuis le DAT HTML.

Une seule source rédactionnelle : le HTML du dossier. Le Markdown en est
dérivé pour rester lisible dans le dépôt, et le PDF est produit par impression
du même HTML. Les trois documents ne peuvent donc pas diverger.
"""
import html
import pathlib
import re
import sys

SOURCE = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else None
CIBLE = pathlib.Path(__file__).resolve().parent.parent / "NOTE_TECHNIQUE.md"


def texte(fragment: str) -> str:
    """Convertit le HTML en ligne en Markdown."""
    t = fragment
    t = re.sub(r"<br\s*/?>", " ", t)
    t = re.sub(r"<(strong|b)>(.*?)</\1>", r"**\2**", t, flags=re.S)
    t = re.sub(r"<(em|i)>(.*?)</\1>", r"*\2*", t, flags=re.S)
    t = re.sub(r"<code>(.*?)</code>", r"`\1`", t, flags=re.S)
    t = re.sub(r'<a href="([^"]+)"[^>]*>(.*?)</a>', r"[\2](\1)", t, flags=re.S)
    t = re.sub(r"<sup>(.*?)</sup>", r"\1", t, flags=re.S)
    t = re.sub(r"<span[^>]*>(.*?)</span>", r"\1", t, flags=re.S)
    t = re.sub(r"<[^>]+>", "", t)
    t = html.unescape(t)
    return re.sub(r"\s+", " ", t).strip()


def convertir(source: str) -> str:
    corps = source[source.index("<header"):source.index("</footer>")]
    sortie: list[str] = []

    # En-tête
    if m := re.search(r'<p class="sous-titre">(.*?)</p>', corps, re.S):
        chapeau = texte(m.group(1))
    else:
        chapeau = ""
    # Restreint au bloc .meta : les <span> de la chaîne de repli ne doivent pas
    # être aspirés dans la ligne d'en-tête.
    bloc_meta = re.search(r'<div class="meta">(.*?)</div>', corps, re.S)
    metas = (
        [texte(x) for x in re.findall(r"<span>(.*?)</span>", bloc_meta.group(1), re.S)]
        if bloc_meta
        else []
    )

    sortie.append("# RépétIA — Dossier d'Architecture Technique\n")
    sortie.append(" · ".join(metas) + "\n")
    sortie.append(chapeau + "\n")

    # Fiche d'accès
    fiche = re.search(r'<dl class="fiche">(.*?)</dl>', corps, re.S)
    if fiche:
        sortie.append("| Accès | Adresse |\n|---|---|")
        for dt, dd in re.findall(r"<dt>(.*?)</dt>\s*<dd>(.*?)</dd>", fiche.group(1), re.S):
            sortie.append(f"| {texte(dt)} | {texte(dd)} |")
        sortie.append("")

    # Sections
    for bloc in re.findall(r"<section>(.*?)</section>", corps, re.S):
        if m := re.search(r'<p class="eyebrow">(.*?)</p>', bloc, re.S):
            sortie.append(f"\n---\n\n## {texte(m.group(1))}")
        if m := re.search(r"<h2>(.*?)</h2>", bloc, re.S):
            sortie.append(f"\n### {texte(m.group(1))}\n")

        # Parcours du contenu dans l'ordre du document
        motifs = re.finditer(
            r"<h3>(?P<h3>.*?)</h3>"
            r"|<p(?! class=\"eyebrow\"| class=\"sous-titre\"| class=\"legende\")[^>]*>(?P<p>.*?)</p>"
            r"|<table>(?P<table>.*?)</table>"
            r"|<(?P<lt>ul|ol)(?![^>]*chaine)[^>]*>(?P<li>.*?)</(?P=lt)>"
            r'|<div class="decision">(?P<dec>.*?)</div>\s*</div>'
            r'|<ol class="chaine">(?P<chaine>.*?)</ol>',
            bloc, re.S)

        for m in motifs:
            if m.group("h3"):
                sortie.append(f"\n**{texte(m.group('h3'))}**\n")
            elif m.group("dec"):
                d = m.group("dec")
                titre = re.search(r'<div class="titre">(.*?)</div>', d, re.S)
                paras = re.findall(r"<p[^>]*>(.*?)</p>", d, re.S)
                sortie.append(f"\n> **{texte(titre.group(1)) if titre else ''}**\n>")
                for para in paras:
                    sortie.append(f"> {texte(para)}\n>")
                sortie.append("")
            elif m.group("chaine"):
                sortie.append("")
                for i, item in enumerate(re.findall(r"<li>(.*?)</li>", m.group("chaine"), re.S), 1):
                    b = re.search(r"<b>(.*?)</b>", item, re.S)
                    reste = re.sub(r"<b>.*?</b>", "", item, flags=re.S)
                    sortie.append(f"{i}. **{texte(b.group(1)) if b else ''}** — {texte(reste)}")
                sortie.append("")
            elif m.group("table"):
                t = m.group("table")
                entetes = [texte(c) for c in re.findall(r"<th[^>]*>(.*?)</th>", t, re.S)]
                if entetes:
                    sortie.append("\n| " + " | ".join(entetes) + " |")
                    sortie.append("|" + "---|" * len(entetes))
                for ligne in re.findall(r"<tr>(.*?)</tr>", t, re.S):
                    cells = [texte(c) for c in re.findall(r"<td[^>]*>(.*?)</td>", ligne, re.S)]
                    if cells:
                        sortie.append("| " + " | ".join(cells) + " |")
                sortie.append("")
            elif m.group("li") is not None:
                sortie.append("")
                puce = "1." if m.group("lt") == "ol" else "-"
                for item in re.findall(r"<li>(.*?)</li>", m.group("li"), re.S):
                    sortie.append(f"{puce} {texte(item)}")
                sortie.append("")
            elif m.group("p"):
                sortie.append(texte(m.group("p")) + "\n")

    sortie.append("\n---\n")
    sortie.append("*« Notre problème, ma solution. »* Le code, les tests et le présent dossier sont "
                  "publics : https://github.com/Nounagnon02/repetia")
    return "\n".join(sortie)


if __name__ == "__main__":
    if not SOURCE or not SOURCE.exists():
        print("Usage : python3 tools/dat-vers-markdown.py <dat.html>", file=sys.stderr)
        sys.exit(1)
    CIBLE.write_text(convertir(SOURCE.read_text(encoding="utf-8")), encoding="utf-8")
    print(f"{CIBLE.name} — {len(CIBLE.read_text().splitlines())} lignes")
