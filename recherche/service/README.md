---
title: RépétIA modèle
emoji: 📐
colorFrom: green
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
---

# Serveur du modèle affiné RépétIA (mode ombre)

`llama-server` (llama.cpp) sert `repetia-v2-Q4_K_M.gguf` — Qwen3.5-4B affiné
sur le jeu v2, fusionné et quantifié par `recherche/src/preparer_gguf.py`.

- API : `POST /v1/chat/completions` (format OpenAI), `GET /health`.
- Accès : en-tête `Authorization: Bearer <LLAMA_API_KEY>` obligatoire.
- Réponses **jamais montrées à un élève** : le backend RépétIA les range à
  côté de celles de Gemini pour comparaison (phase 5 de
  `recherche/PLAN_ENTRAINEMENT.md`).

## Déploiement

1. Créer un Space **Docker**, privé ou public (l'API reste protégée par la
   clé), et y pousser ce `Dockerfile` et ce `README.md`.
2. Secrets du Space : `HF_TOKEN` (lecture du dépôt privé du GGUF) et
   `LLAMA_API_KEY`.
3. Backend : `MODELE_LOCAL_MODE=ombre`,
   `MODELE_LOCAL_URL=https://<compte>-<space>.hf.space`,
   `MODELE_LOCAL_CLE=<LLAMA_API_KEY>`, `MODELE_LOCAL_DELAI_MS=300000`.
   Mesuré en local sur 4 cœurs : 4 à 5 jetons/s, ≈ 45 s pour un exercice ;
   2 vCPU iront environ deux fois moins vite, d'où un délai de 5 minutes.

## En local

```bash
llama-server -m repetia-v2-Q4_K_M.gguf --jinja -c 4096 -np 1 --port 8080
# backend/.env : MODELE_LOCAL_MODE=ombre  MODELE_LOCAL_URL=http://127.0.0.1:8080
```

Droits : la v2 n'inclut ni Exo7 ni Sésamath (arrivés avec la v3), mais elle
est entraînée sur des annales dont les droits ne sont pas établis. Le GGUF
reste donc dans un dépôt **privé** ; voir `recherche/SOURCES.md`.
