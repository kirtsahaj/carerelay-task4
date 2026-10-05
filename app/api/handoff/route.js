import { buildUserPrompt, deterministicMedicalRefusal, RESPONSE_SCHEMA, SYSTEM_PROMPT } from '../../../lib/care-relay-prompt';
import { GEMINI_MODEL, MAX_INPUT_CHARS, MAX_OUTPUT_TOKENS, REQUESTS_PER_VISITOR } from '../../../lib/config';
import { countVisitorRequests, insertHandoff } from '../../../lib/supabase-rest';

export const runtime = 'nodejs';

function cleanVisitorId(value) {
  const id = String(value || '').trim();
  return /^[a-zA-Z0-9-]{10,80}$/.test(id) ? id : null;
}

function privacySafeStoredInput(input) {
  const hasMixedLanguage = /\b(ka|ki|ko|ne|hai|hain|kal|bola|karni|karo|mujhe|main)\b/i.test(input);
  return `[content redacted for privacy; ${input.length} characters; ${hasMixedLanguage ? 'mixed-language' : 'English/other'}]`;
}

function privacySafeStoredOutput(output) {
  return JSON.stringify({
    refused: Boolean(output.refused),
    what_happened_items: output.what_happened?.length || 0,
    worth_knowing_items: output.worth_knowing?.length || 0,
    open_action_items: output.needs_someone?.length || 0,
    whatsapp_message_generated: Boolean(output.whatsapp_message),
  });
}

async function callGemini(input) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Gemini API key is not configured.');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: buildUserPrompt(input) }] }],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    },
  );

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error?.message || `Gemini request failed (${response.status}).`);
  }

  const text = json?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
  if (!text) throw new Error('Gemini returned an empty response.');

  return {
    output: JSON.parse(text),
    inputTokens: Number(json?.usageMetadata?.promptTokenCount) || 0,
    outputTokens: Number(json?.usageMetadata?.candidatesTokenCount) || 0,
  };
}

export async function POST(request) {
  const started = Date.now();

  try {
    const body = await request.json();
    const input = String(body?.input || '').trim();
    const visitorId = cleanVisitorId(body?.visitorId);

    if (!visitorId) {
      return Response.json({ error: 'Could not identify this demo visitor. Please refresh the page.' }, { status: 400 });
    }
    if (input.length < 8) {
      return Response.json({ error: 'Please add a little more detail to the caregiver update.' }, { status: 400 });
    }
    if (input.length > MAX_INPUT_CHARS) {
      return Response.json({ error: `Please keep the update under ${MAX_INPUT_CHARS} characters.` }, { status: 400 });
    }

    const used = await countVisitorRequests(visitorId);
    if (used >= REQUESTS_PER_VISITOR) {
      return Response.json(
        { error: `You have used the ${REQUESTS_PER_VISITOR} CareRelay demo requests available to this visitor.` },
        { status: 429 },
      );
    }

    const deterministicRefusal = deterministicMedicalRefusal(input);
    let output;
    let inputTokens = 0;
    let outputTokens = 0;
    let model = 'deterministic-guardrail';

    if (deterministicRefusal) {
      output = deterministicRefusal;
    } else {
      const gemini = await callGemini(input);
      output = gemini.output;
      inputTokens = gemini.inputTokens;
      outputTokens = gemini.outputTokens;
      model = GEMINI_MODEL;
    }

    const actionCount = output.refused ? 0 : (output.needs_someone?.length || 0);

    await insertHandoff({
      visitor_id: visitorId,
      input: privacySafeStoredInput(input),
      output: privacySafeStoredOutput(output),
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      model,
      refused: Boolean(output.refused),
      action_count: actionCount,
      request_ms: Date.now() - started,
    });

    return Response.json({ handoff: output, saved: true });
  } catch (error) {
    console.error('CareRelay handoff error:', error);
    return Response.json(
      { error: 'CareRelay could not organise this update right now. Please try again.' },
      { status: 500 },
    );
  }
}
