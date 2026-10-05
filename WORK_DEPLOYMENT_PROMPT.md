# Prompt for ChatGPT Work

I am completing an ISB GenAI course assignment. I have attached a finished Next.js project called `carerelay-task4`. Please use browser/computer tools to deploy and verify it end to end. Do not redesign the product unless something is broken.

## Goal
Deploy CareRelay with the mandatory stack: Vercel + Gemini API + Supabase, then return all evidence I need for the assignment.

## Important constraints
- Never print, paste into chat, commit, or expose any secret key.
- Keep the Gemini key only in Vercel environment variables.
- Keep the Supabase server key only in Vercel environment variables.
- Do not store raw caregiver text, names, ages, or health details in Supabase. The provided code already redacts input/output before storage.
- Do not increase the Gemini output cap above 350 tokens.
- Keep the per-visitor cap at 3 requests.
- If a dependency/API has changed, make the minimum code fix needed, explain it, and preserve the assignment requirements.

## Steps
1. Unzip/open the project and inspect `README.md`, `supabase/schema.sql`, `.env.example`, and the API routes.
2. Run `npm install` and `npm run build`. Fix only actual build/runtime errors.
3. Create or use a GitHub repository for CareRelay and push the project. Make sure no `.env` file or secret is committed.
4. Create/use a Supabase project. Run `supabase/schema.sql` in the SQL editor.
5. Obtain the Supabase Project URL and a server-side Secret key. Put them in Vercel as:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
6. Obtain/use a Gemini API key from Google AI Studio and put it only in Vercel as `GEMINI_API_KEY`. Set `GEMINI_MODEL` to the model in the code unless a supported model change is required.
7. Import the GitHub repository into Vercel and deploy it.
8. Verify the live site loads on desktop and mobile and the AI feature works end to end.
9. Verify the page visibly reads a usage number back from Supabase.
10. Run the project’s deployed test script or equivalent tests so Supabase contains at least 5 rows. Respect the 3-request cap by using the provided test script’s multiple visitor IDs.
11. Test and record:
    - Typical visitor case
    - Edge case with no open action
    - Adversarial medical request that must be refused
12. In Supabase, calculate average `input_tokens` and `output_tokens` for Gemini-generated rows using the query in the README.
13. Search the GitHub repo for the Gemini API-key prefix requested by the assignment and confirm there are no results. Also run `npm run check:secrets` if possible.
14. Capture evidence/screenshots:
    - Live CareRelay page with a successful generated response
    - Vercel Environment Variables page with VALUES HIDDEN
    - Supabase `handoffs` table showing at least 5 rows
    - Supabase-backed usage metric visible on the live page
15. Return to me:
    - Live Vercel URL
    - GitHub repo URL
    - Exact Gemini model used
    - The three test inputs and exact outputs
    - Average input tokens and output tokens
    - Confirmation that 5+ rows are stored
    - Confirmation that GitHub secret search returned no results
    - Any code change you had to make and why
    - The screenshots/evidence files

Do not mark the work complete until the public Vercel URL has been opened and the feature has successfully returned a response.
