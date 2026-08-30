#!/usr/bin/env python3
"""
Produit NOTE_TECHNIQUE.docx à partir de NOTE_TECHNIQUE.md.

LibreOffice ne lit pas le Markdown : on passe par un HTML intermédiaire aux
styles littéraux (LibreOffice n'interprète pas les variables CSS), puis on
convertit. Le résultat s'ouvre dans Word et reste modifiable.

    python3 tools/note-vers-docx.py
"""
import html
import pathlib
import re
import subprocess
import sys

RACINE = pathlib.Path(__file__).resolve().parent.parent
SOURCE = RACINE / "NOTE_TECHNIQUE.md"
INTERMEDIAIRE = RACINE / ".note-intermediaire.html"
SORTIE = RACINE / "NOTE_TECHNIQUE.docx"

VERT = "#0f5f52"
VERT_FONCE = "#0a453c"
DORE = "#d99a1f"
ENCRE = "#20302b"
GRIS = "#5c6b66"
LIGNES = "#e7ddc7"
DOUX = "#f6e9c7"


def enligne(texte: str) -> str:
    """Gras, code, liens — appliqués après échappement."""
    t = html.escape(texte)
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    # Italique : un seul astérisque, après le gras pour ne pas le casser.
    t = re.sub(r"(?<!\*)\*([^*\n]+?)\*(?!\*)", r"<i>\1</i>", t)
    t = re.sub(
        r"`([^`]+)`",
        rf'<span style="font-family:Consolas,monospace;background:{DOUX};">\1</span>',
        t,
    )
    t = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', t)
    return t


def convertir(markdown: str) -> str:
    lignes = markdown.split("\n")
    sortie: list[str] = []
    i = 0

    while i < len(lignes):
        ligne = lignes[i]

        # Tableau
        if ligne.startswith("|") and i + 1 < len(lignes) and set(lignes[i + 1]) <= set("|-: "):
            entetes = [c.strip() for c in ligne.strip("|").split("|")]
            i += 2
            corps = []
            while i < len(lignes) and lignes[i].startswith("|"):
                corps.append([c.strip() for c in lignes[i].strip("|").split("|")])
                i += 1
            sortie.append(
                f'<table border="1" cellspacing="0" cellpadding="6" '
                f'style="border-collapse:collapse;width:100%;font-size:10pt;">'
            )
            sortie.append(f'<tr style="background:{DOUX};">')
            for e in entetes:
                sortie.append(f'<td><b>{enligne(e)}</b></td>')
            sortie.append("</tr>")
            for r in corps:
                sortie.append("<tr>")
                for c in r:
                    sortie.append(f"<td>{enligne(c)}</td>")
                sortie.append("</tr>")
            sortie.append("</table><p></p>")
            continue

        # Citation (encadré de décision)
        if ligne.startswith(">"):
            bloc = []
            while i < len(lignes) and lignes[i].startswith(">"):
                bloc.append(lignes[i].lstrip(">").strip())
                i += 1
            contenu = "<br/>".join(enligne(b) if b else "" for b in bloc)
            sortie.append(
                f'<p style="border-left:4px solid {DORE};padding-left:12px;'
                f'background:#fdfaf3;color:{ENCRE};">{contenu}</p>'
            )
            continue

        # Titres
        if m := re.match(r"^(#{1,4})\s+(.*)$", ligne):
            niveau = len(m.group(1))
            taille = {1: "20pt", 2: "15pt", 3: "12pt", 4: "11pt"}[niveau]
            couleur = VERT_FONCE if niveau <= 2 else ENCRE
            sortie.append(
                f'<h{niveau} style="color:{couleur};font-family:Georgia,serif;'
                f'font-size:{taille};">{enligne(m.group(2))}</h{niveau}>'
            )
            i += 1
            continue

        # Liste à puces / numérotée
        if re.match(r"^\s*[-*]\s+", ligne) or re.match(r"^\s*\d+\.\s+", ligne):
            numerotee = bool(re.match(r"^\s*\d+\.\s+", ligne))
            balise = "ol" if numerotee else "ul"
            sortie.append(f"<{balise}>")
            while i < len(lignes) and (
                re.match(r"^\s*[-*]\s+", lignes[i]) or re.match(r"^\s*\d+\.\s+", lignes[i])
                or (lignes[i].startswith("  ") and lignes[i].strip())
            ):
                item = re.sub(r"^\s*(?:[-*]|\d+\.)\s+", "", lignes[i])
                if re.match(r"^\s*(?:[-*]|\d+\.)\s+", lignes[i]):
                    sortie.append(f"<li>{enligne(item)}</li>")
                else:  # continuation de l'item précédent
                    sortie[-1] = sortie[-1][:-5] + " " + enligne(lignes[i].strip()) + "</li>"
                i += 1
            sortie.append(f"</{balise}>")
            continue

        # Séparateur
        if ligne.strip() == "---":
            sortie.append(f'<p style="border-top:1px solid {LIGNES};"></p>')
            i += 1
            continue

        # Paragraphe
        if ligne.strip():
            bloc = []
            while i < len(lignes) and lignes[i].strip() and not re.match(
                r"^(#{1,4}\s|\||>|\s*[-*]\s|\s*\d+\.\s|---$)", lignes[i]
            ):
                bloc.append(lignes[i].strip())
                i += 1
            sortie.append(f'<p style="text-align:justify;">{enligne(" ".join(bloc))}</p>')
            continue

        i += 1

    return "\n".join(sortie)


def main() -> int:
    if not SOURCE.exists():
        print(f"Introuvable : {SOURCE}", file=sys.stderr)
        return 1

    corps = convertir(SOURCE.read_text(encoding="utf-8"))
    document = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>RépétIA — Note technique</title></head>
<body style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:{ENCRE};line-height:1.45;">
{corps}
<p style="color:{GRIS};font-size:9pt;border-top:1px solid {LIGNES};padding-top:8px;">
RépétIA — Note technique — Afri'Tech Challenge 2026 — https://repetia.vercel.app</p>
</body></html>"""

    INTERMEDIAIRE.write_text(document, encoding="utf-8")

    resultat = subprocess.run(
        ["soffice", "--headless", "--convert-to", "docx:MS Word 2007 XML",
         "--outdir", str(RACINE), str(INTERMEDIAIRE)],
        capture_output=True, text=True, timeout=300,
    )
    if resultat.returncode != 0:
        print(resultat.stderr, file=sys.stderr)
        return 1

    produit = RACINE / ".note-intermediaire.docx"
    if not produit.exists():
        print("LibreOffice n'a produit aucun fichier.", file=sys.stderr)
        return 1

    produit.replace(SORTIE)
    INTERMEDIAIRE.unlink(missing_ok=True)
    print(f"{SORTIE.name} — {SORTIE.stat().st_size // 1024} Ko")
    return 0


if __name__ == "__main__":
    sys.exit(main())
