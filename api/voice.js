// Server-side proxy to ElevenLabs text-to-speech.
// Keeps the API key on the server. Caches at the edge by `text` + `voice`.

const DEFAULT_MODEL = 'eleven_multilingual_v2';
const VOICE_SETTINGS = {
  stability: 0.55,
  similarity_boost: 0.85,
  style: 0.15,
  use_speaker_boost: true
};

export default async function handler(req, res) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const defaultVoice = process.env.ELEVENLABS_VOICE_ID;

  if (!apiKey || !defaultVoice) {
    res.status(503).json({ error: 'voice api not configured' });
    return;
  }

  const text = (req.query.text || '').toString().trim();
  const voiceId = (req.query.voice || defaultVoice).toString();

  if (!text) {
    res.status(400).json({ error: 'missing text' });
    return;
  }
  if (text.length > 400) {
    res.status(400).json({ error: 'text too long' });
    return;
  }

  try {
    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text,
          model_id: DEFAULT_MODEL,
          voice_settings: VOICE_SETTINGS
        })
      }
    );

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      res.status(r.status === 401 ? 503 : 502).json({
        error: 'elevenlabs upstream',
        status: r.status,
        detail: detail.slice(0, 300)
      });
      return;
    }

    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buf.length.toString());
    // Aggressive caching — same (text, voice, ver) → same audio
    res.setHeader('Cache-Control', 'public, max-age=2592000, s-maxage=2592000, immutable');
    res.status(200).send(buf);
  } catch (e) {
    res.status(502).json({ error: 'fetch failed', message: String(e && e.message || e).slice(0, 200) });
  }
}
