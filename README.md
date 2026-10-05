# CareRelay — GenAI Task 4

CareRelay is a lightweight Next.js web app that turns an unstructured caregiver update into a clear, WhatsApp-ready family update. This Task 4 version adds a real Gemini-backed feature, Supabase persistence/read-back, token measurement, a per-visitor request cap, and explicit medical-advice guardrails.

## What is functional

- Caregiver enters an English or mixed-Hinglish update.
- Optional browser voice input is available where the Web Speech API is supported.
- `/api/handoff` runs server-side on Vercel and calls Gemini.
- Gemini returns structured JSON: what happened, worth knowing, open coordination actions, and a WhatsApp-ready message.
- Every request creates one Supabase row, but caregiver text and AI content are deliberately redacted before storage so the database does not store names, ages or health details.
- Gemini prompt/output token counts are stored from `usageMetadata`.
- The page reads Supabase and visibly shows total non-refused handoffs and total coordination actions surfaced.
- Diagnosis, treatment, medication and dosage requests are refused.
- Input length, output tokens and visitor requests are capped.

## Architecture

Visitor → Next.js UI → `/api/handoff` on Vercel → Gemini → structured response

`/api/handoff` → privacy-safe row in Supabase

Landing page → `/api/stats` → Supabase → visible usage metrics

## Setup

### 1. Create Supabase table

Open Supabase SQL Editor and run `supabase/schema.sql`.

RLS is enabled and there is no anon/authenticated policy. Database access happens only in the Vercel server route.

### 2. Environment variables

Set these in Vercel Project Settings → Environment Variables:

- `GEMINI_API_KEY`
- `GEMINI_MODEL` = `gemini-3.1-flash-lite` (optional; default in code)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

For `SUPABASE_SERVICE_KEY`, use a current Supabase server-side Secret key (`sb_secret_...`). Despite the assignment variable name, do not expose this key to browser code.

Copy `.env.example` to `.env.local` only for local development. Environment files are gitignored.

### 3. Install and build

```bash
npm install
npm run build
npm run start
```

### 4. Deploy

Push the project to GitHub and import it into Vercel. Add the environment variables before the production deployment.

## Safety, abuse and cost controls

- **System prompt:** `lib/care-relay-prompt.js`
- **Explicit refusal:** diagnosis, treatment, medication/dosage and emergency medical-advice requests
- **Deterministic guardrail:** obvious medical-advice requests are blocked before Gemini is called
- **Prompt injection rule:** caregiver text is treated as data, not higher-priority instructions
- **Input cap:** 1,800 characters
- **Gemini output cap:** 350 tokens
- **Per-visitor cap:** 3 total demo requests, enforced by counting that anonymous visitor ID in Supabase
- **When capped:** API returns HTTP 429 and the page displays the cap message
- **Privacy:** Supabase stores only redacted request/response metadata plus token counts; raw caregiver text is not persisted

## Supabase columns

`id`, `created_at`, `visitor_id`, `input`, `output`, `input_tokens`, `output_tokens`, `model`, `refused`, `action_count`, `request_ms`

`input` and `output` contain redacted metadata, not caregiver text or health details.

## Assignment tests

See `docs/test-cases.md` for the typical visitor, edge case and adversarial guardrail test.

After deployment run:

```bash
BASE_URL=https://YOUR-VERCEL-URL.vercel.app npm run test:deployed
```

The script sends five requests using two anonymous visitor IDs, so it respects the 3-request visitor cap while creating 5+ Supabase rows.

## Token measurement

After the five tests, run this in Supabase SQL Editor:

```sql
select
  round(avg(input_tokens)::numeric, 1) as avg_input_tokens,
  round(avg(output_tokens)::numeric, 1) as avg_output_tokens
from public.handoffs
where model <> 'deterministic-guardrail';
```

Use those two values in Step 6 of the assignment.

## API-key leak check

Run:

```bash
npm run check:secrets
```

Also use GitHub repository search for the Gemini-key prefix requested in the assignment and confirm there are no results. Keep all Vercel environment-variable values hidden in screenshots.

## Evidence to capture

- Live Vercel URL with a successful generated handoff
- GitHub repository URL
- Vercel environment variables screenshot with values hidden
- Supabase table with 5+ rows
- Typical visitor output
- Edge-case output
- Adversarial/refusal output
- Supabase token averages
- Live page visibly showing the Supabase-backed read-back metric
