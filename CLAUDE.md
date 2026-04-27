# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Backend API for a veterinary clinical records app. Receives audio recordings from vet consultations, transcribes them using OpenAI, processes them with GPT to extract structured clinical data, and stores everything in Supabase.

## Commands

- `npm start` — Run the server
- `npm run dev` — Run with auto-reload (--watch)

## Architecture

The app is migrating from a monolithic `POST /consultation/process` endpoint toward a separation:

1. **AI utility (stateless, pure)** — `POST /ai/process-section` receives audio + section, returns `{ transcription, ai_suggested, suggested_text }`. Does NOT touch DB or Storage.
2. **Consultation lifecycle** — `POST /consultations` creates an empty consultation; `PATCH /consultations/:id/sections/:section` upserts section data (autosave/blur/pause from client).

The legacy `POST /consultation/process` may still exist during migration but is being removed.

### Key design decisions

- **promptRouter** is the central registry: maps section names to prompt strings and validates sections. Section keys are in English and match the `clinical_section` enum in the DB.
- **sectionLabels** (`src/utils/sectionLabels.js`) holds the Spanish UI labels for each AI-output JSON key per section. Routing identifiers are English; labels for the doctor's UI are Spanish.
- **flattenAiToText(section, aiJson)** uses sectionLabels to render the AI JSON as labeled text shown in the UI.
- All prompts instruct GPT to return flat JSON. Avoid nested objects.
- The `chief_complaint` section is special: its audio is the OWNER's voice. Its prompt preserves the owner's words and avoids medical reinterpretation. All other sections are dictated by the vet in clinical terminology.

## Clinical Sections (valid `section` values)

The DB enum `clinical_section` has **12 values**, split into two groups:

### AI-backed sections (9) — accepted by `POST /ai/process-section`

| Section key | UI label (ES) | Prompt file |
|---|---|---|
| `chief_complaint` | Motivo de consulta | chief-complaintPrompt.js |
| `anamnesis` | Anamnesis | anamnesisPrompt.js |
| `physical_exam` | Examen físico | physical-examPrompt.js |
| `problems` | Problemas | problemsPrompt.js |
| `diagnostic_approach` | Abordaje diagnóstico | diagnostic-approachPrompt.js |
| `complementary_exams` | Exámenes complementarios | complementary-examsPrompt.js |
| `clinical_diagnosis` | Diagnóstico clínico | clinical-diagnosisPrompt.js |
| `prescription` | Receta | prescriptionPrompt.js |
| `prognosis` | Pronóstico | prognosisPrompt.js |

`clinical_diagnosis` consolidates the legacy `presumptive_diagnosis` and `definitive_diagnosis` sections into a single AI call that returns `{ presumptive_diagnosis, definitive_diagnosis }` (flat JSON). The UI shows one "Diagnóstico clínico" input.

### Tap-only sections (3) — `PATCH` only, no AI

| Section key | UI label (ES) | Content shape |
|---|---|---|
| `food` | Alimentación | `{ regime: 'concentrate'\|'barf'\|'homemade'\|'mixed'\|'other' }` |
| `vitals` | Signos vitales | `{ temperature_c, heart_rate_bpm, respiratory_rate_rpm, weight_kg }` (numbers) |
| `treatment` | Tratamiento | `{ modality: 'ambulatory'\|'hospitalization' }` |

These sections are written directly via `PATCH /consultation/:id/sections/:section` with structured `content`; they have no prompt file and are rejected by `POST /ai/process-section`. The promptRouter exports `AI_SECTIONS` (9) and `VALID_SECTIONS` (12) so each endpoint validates against the right list (`aiSchema` vs `consultationSchema`).

### `physical_exam` content shape (mixed: manual + AI)

The PATCH `content` for `physical_exam` combines 8 manually-entered keys (UI dropdowns / numeric inputs — the LLM doesn't infer them) with 1 AI-derived editable text field:

```json
{
  "mucosa": "pink|pale|jaundiced|cyanotic|congested",
  "dehydration_percent": 0,
  "bcs": "1/9..9/9",
  "attitude_owner": "friendly|docile|fearful|indifferent|aggressive",
  "attitude_vet":   "friendly|docile|fearful|indifferent|aggressive",
  "pulse": "weak|normal|strong|filiform|absent",
  "tllc_seconds": 0,
  "trcp_seconds": 0,
  "systems_affected": "string libre (post-edición sobre lo que sugirió la IA)"
}
```

The `physical_exam` prompt itself is unchanged — it still returns the per-system keys (`skin_and_coat`, `respiratory_system`, etc.). The frontend flattens those into the `systems_affected` text before PATCHing.

Section data lives in the `consultation_sections` table (one row per consultation×section). The `consultations` table holds metadata (status, type, summary, primary_diagnosis, result, pause/sign timestamps).

## External Services

- **OpenAI**: Transcription (`gpt-4o-transcribe`) + LLM processing (`gpt-4o-mini`)
- **Supabase**: PostgreSQL + Storage (bucket `consultations-audio`)

## Code Conventions

- Code identifiers, DB column names, and section enum values in English. UI labels (in `sectionLabels.js`) and prompt instructions in Spanish.
- CommonJS (`require`/`module.exports`), not ES modules.
- Prompts are written in Spanish (clinical veterinary domain, small animals).
