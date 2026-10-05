# Serveur du modèle affiné RépétIA (phase 5 : mode ombre).
#
# Image CPU officielle de llama.cpp : `llama-server` expose une API
# compatible OpenAI (/v1/chat/completions), celle qu'appelle
# backend/src/services/modeleLocal.service.ts.
#
# Prévu pour un Space Hugging Face « Docker » gratuit (2 vCPU, 16 Go) : le
# mode ombre tolère la lenteur, rien n'attend cette réponse côté élève.
# Secrets du Space :
#   HF_TOKEN       lecture du dépôt PRIVÉ qui contient le GGUF
#   LLAMA_API_KEY  jeton exigé des appelants (= MODELE_LOCAL_CLE du backend)
FROM ghcr.io/ggml-org/llama.cpp:server

# Le GGUF est téléchargé au démarrage (HF_TOKEN lu dans l'environnement),
# pas embarqué dans l'image : il reste dans un dépôt privé.
ENV LLAMA_ARG_HF_REPO=Nounagnon02/repetia-qwen3.5-4b-v2-gguf \
    LLAMA_ARG_HF_FILE=repetia-v2-Q4_K_M.gguf \
    LLAMA_ARG_HOST=0.0.0.0 \
    LLAMA_ARG_PORT=7860 \
    LLAMA_ARG_CTX_SIZE=4096 \
    LLAMA_ARG_N_PARALLEL=1 \
    LLAMA_ARG_JINJA=1 \
    LLAMA_CACHE=/tmp/llama-cache

EXPOSE 7860
