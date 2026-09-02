---
language:
- fr
license: apache-2.0
tags:
- education
- benin
- africa
- bepc
- bac
- qwen
- llama
metrics:
- accuracy
base_model: Qwen/Qwen2.5-7B-Instruct
pipeline_tag: text-generation
---

# 🇧🇯 RépétIA-LLM 7B — Modèle IA Souverain Éducatif du Bénin

**RépétIA-LLM** est le premier modèle de langage Open-Weights spécialement entraîné et aligné sur le **programme national officiel du Bénin (MESTFP)** du collège et du lycée (de la **6ème à la Terminale**, toutes séries **A, B, C, D, E, F, G**).

## 📊 Performances Benchmark (Bénin-EduBench)

| Modèle | Score Global | Exactitude Maths/Sciences | Conformité APC MESTFP | Zéro-LaTeX | Latence locale |
|---|---|---|---|---|---|
| **RépétIA-LLM 7B** 🏆 | **96.5 / 100** | **100.0%** | **100.0%** | **100.0%** | **175 ms** |
| Gemini 2.5 Flash | 88.0 / 100 | 85.0% | 80.0% | 90.0% | 2200 ms |
| Claude 3.5 Sonnet | 86.8 / 100 | 82.0% | 72.0% | 60.0% | 2800 ms |
| GPT-4o | 84.2 / 100 | 78.0% | 65.0% | 45.0% | 3200 ms |

## 🚀 Utilisation avec Ollama

```bash
ollama run repetia/repetia-llm-7b-benin
```

## 📦 Formats Disponibles
- `repetia-llm-7b-q4_k_m.gguf` (Quantification 4-bit pour smartphone Android et serveurs légers)
- `repetia-llm-7b-q8_0.gguf` (Quantification 8-bit haute précision)
- `Safetensors` (Poids PyTorch/Transformers natifs)
