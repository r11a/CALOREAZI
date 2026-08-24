import { aiRole } from "@/server/ai/models.js";
import { requireUser } from "@/server/auth.js";
import { decryptSecret, ensureUserData, readState, updateState } from "@/server/store.js";

export const runtime = "nodejs";

type CoachVoice = "male" | "female";
type VoiceProvider = "cloud" | "device";

function selectedVoice(value: unknown): CoachVoice {
  return value === "female" ? "female" : "male";
}

function pcmToWav(pcm: Buffer, sampleRate = 24000) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export async function PUT(request: Request) {
  const state = await readState();
  const session = requireUser(state, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const { voice, provider } = await request.json();
  const coachVoice = selectedVoice(voice);
  const coachVoiceProvider: VoiceProvider = provider === "device" ? "device" : "cloud";
  await updateState((latest) => {
    const data = ensureUserData(latest, session.userId);
    if (data.profile) { data.profile.coachVoice = coachVoice; data.profile.coachVoiceProvider = coachVoiceProvider; }
    return latest;
  });
  return Response.json({ coachVoice, coachVoiceProvider });
}

export async function POST(request: Request) {
  const state = await readState();
  const session = requireUser(state, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  if (!state.ai.encryptedKey) return Response.json({ error: "שירות הקול אינו מוגדר" }, { status: 409 });
  const body = await request.json();
  const text = String(body.text || "").replace(/[*#_`>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 3500);
  if (!text) return Response.json({ error: "אין טקסט להקראה" }, { status: 400 });
  const voice = selectedVoice(body.voice || state.userData[session.userId]?.profile?.coachVoice);
  if ((body.provider || state.userData[session.userId]?.profile?.coachVoiceProvider) === "device") return Response.json({ device: true }, { status: 409 });
  const apiKey = await decryptSecret(state.ai.encryptedKey);
  const role = aiRole(state.ai, "coach");
  const direction = voice === "female" ? "בקול נשי ישראלי, חם ובטוח" : "בקול גברי ישראלי, חם ובטוח";
  const delivery = `${direction}. דבר כמו מאמן אישי אנושי, בונה וסבלני, בעברית טבעית ועכשווית ובקצב שיחה רגוע. בלי הטפה, דרמה או התלהבות מלאכותית. הגה מספרים ככמות שלמה ולא ספרה אחר ספרה. אל תקריא סימני Markdown. טקסט: ${text}`;

  if (role.provider === "gemini") {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent", {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: delivery }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice === "female" ? "Sulafat" : "Gacrux" } } } },
      }),
    });
    const payload = await response.json();
    const audio = payload?.candidates?.[0]?.content?.parts?.find((part: { inlineData?: { data?: string } }) => part.inlineData?.data)?.inlineData?.data;
    if (!response.ok || !audio) return Response.json({ error: payload?.error?.message || "יצירת הקול נכשלה" }, { status: 502 });
    return new Response(pcmToWav(Buffer.from(audio, "base64")), { headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" } });
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: voice === "female" ? "coral" : "onyx",
      input: text,
      instructions: `${direction}. דבר כמו מאמן אישי אנושי, בונה וסבלני, בעברית טבעית ועכשווית ובקצב רגוע. בלי הטפה או התלהבות מלאכותית. הגה מספרים ככמות שלמה.`,
      response_format: "mp3",
    }),
  });
  if (!response.ok) return Response.json({ error: "יצירת הקול נכשלה" }, { status: 502 });
  return new Response(await response.arrayBuffer(), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
}
