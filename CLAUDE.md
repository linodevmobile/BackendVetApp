# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Backend API for a veterinary clinical records app. Receives audio recordings from vet consultations, transcribes them using OpenAI, processes them with GPT to extract structured clinical data, and stores everything in Supabase.

## Commands

- `npm start` — Run the server
- `npm run dev` — Run with auto-reload (--watch)
- Test endpoint: `curl -X POST http://localhost:3000/consultation/process -F "audio=@path/to/file.mp3" -F "section=anamnesis"`

## Architecture

Single endpoint `POST /consultation/process` handles all clinical sections. The request flow is:

1. **consultationRoutes** — Multer receives audio file (max 20MB), stores temporarily in `/uploads`
2. **consultationController** — Orchestrates the full pipeline:
   - Upload audio → Supabase Storage (bucket: `consultations-audio`)
   - Transcribe audio → OpenAI `gpt-4o-transcribe`
   - Delete local temp file
   - Select prompt via **promptRouter** based on `section` field
   - Process transcription → OpenAI `gpt-4o-mini` with `response_format: json_object`
   - Create/update consultation in Supabase DB (table: `consultations`)
   - Return full response with transcription + structured data + consultation state

### Key design decisions

- **promptRouter** is the central registry: maps section names to prompt strings and validates sections. To add a new section, add the prompt file and register it here.
- **stateService** uses dynamic column updates (`{ [section]: data }`) — the section name must match a JSONB column in the `consultations` table.
- All prompts instruct GPT to return flat JSON with simple string values/arrays to keep UI rendering easy. Avoid nested objects in prompt output schemas.

## Clinical Sections (valid `section` values)

| Section key | DB column | Prompt file |
|---|---|---|
| `anamnesis` | anamnesis | anamnesisPrompt.js |
| `examen_fisico` | examen_fisico | physical-examPrompt.js |
| `abordaje_diagnostico` | abordaje_diagnostico | diagnostic-approachPrompt.js |
| `diagnostico_presuntivo` | diagnostico_presuntivo | presumptive-diagnosisPrompt.js |
| `diagnostico_definitivo` | diagnostico_definitivo | definitive-diagnosisPrompt.js |
| `plan_terapeutico` | plan_terapeutico | treatment-planPrompt.js |
| `pronostico_evolucion` | pronostico_evolucion | prognosisPrompt.js |

## External Services

- **OpenAI**: Transcription (`gpt-4o-transcribe`) + LLM processing (`gpt-4o-mini`)
- **Supabase**: PostgreSQL (table `consultations` with JSONB columns) + Storage (bucket `consultations-audio`)

## Code Conventions

- Code identifiers in English, user-facing messages in Spanish
- CommonJS (`require`/`module.exports`), not ES modules
- Prompts are in Spanish (clinical veterinary domain, small animals)
