import { normalizeUsage } from './usage.js';

export async function generateOpenAiCoachReply({ apiKey, model, instructions, input, signal }) {
  if (!apiKey) throw new Error('OpenAI API key is not configured');
  if (!model) throw new Error('OpenAI model is not configured');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, instructions, input, max_output_tokens: 900 }),
    signal,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || 'OpenAI request failed');
  const text = String(payload.output_text || payload.output?.flatMap((item) => item.content || []).find((item) => item.type === 'output_text')?.text || '').trim();
  return { text, usage: normalizeUsage(payload.usage), requestId: response.headers.get('x-request-id') || payload.id || null };
}
