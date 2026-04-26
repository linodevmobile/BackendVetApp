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

| Section key | UI label (ES) | Prompt file |
|---|---|---|
| `chief_complaint` | Motivo de consulta | chief-complaintPrompt.js |
| `anamnesis` | Anamnesis | anamnesisPrompt.js |
| `physical_exam` | Examen físico | physical-examPrompt.js |
| `problems` | Problemas | problemsPrompt.js |
| `diagnostic_approach` | Abordaje diagnóstico | diagnostic-approachPrompt.js |
| `complementary_exams` | Exámenes complementarios | complementary-examsPrompt.js |
| `presumptive_diagnosis` | Diagnóstico presuntivo | presumptive-diagnosisPrompt.js |
| `definitive_diagnosis` | Diagnóstico definitivo | definitive-diagnosisPrompt.js |
| `prescription` | Receta | prescriptionPrompt.js |
| `prognosis` | Pronóstico | prognosisPrompt.js |

Section data lives in the `consultation_sections` table (one row per consultation×section). The `consultations` table holds metadata (status, type, summary, primary_diagnosis, result, pause/sign timestamps).

## External Services

- **OpenAI**: Transcription (`gpt-4o-transcribe`) + LLM processing (`gpt-4o-mini`)
- **Supabase**: PostgreSQL + Storage (bucket `consultations-audio`)

## Code Conventions

- Code identifiers, DB column names, and section enum values in English. UI labels (in `sectionLabels.js`) and prompt instructions in Spanish.
- CommonJS (`require`/`module.exports`), not ES modules.
- Prompts are written in Spanish (clinical veterinary domain, small animals).
