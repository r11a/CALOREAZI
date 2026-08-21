import { normalizeUsage } from './usage.js';
import { requestAi } from './http.js';

export async function generateOpenAiCoachReply({ apiKey, model, instructions, input, imageDataUrl = "", signal = undefined }) {
  if (!apiKey) throw new Error('OpenAI API key is not configured');
  if (!model) throw new Error('OpenAI model is not configured');
  const { response, payload } = await requestAi('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, instructions, input: imageDataUrl ? [{ role: 'user', content: [{ type: 'input_text', text: input }, { type: 'input_image', image_url: imageDataUrl }] }] : input, max_output_tokens: 900 }),
    signal,
  }, { provider: 'OpenAI' });
  const text = String(payload.output_text || payload.output?.flatMap((item) => item.content || []).find((item) => item.type === 'output_text')?.text || '').trim();
  return { text, usage: normalizeUsage(payload.usage), requestId: response.headers.get('x-request-id') || payload.id || null };
}
