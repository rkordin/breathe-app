// Tells the client which voice ID is configured (for cache busting)
// and whether the voice API is available.
export default function handler(req, res) {
  const voice = process.env.ELEVENLABS_VOICE_ID || null;
  const hasKey = Boolean(process.env.ELEVENLABS_API_KEY);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    voice,
    hasVoiceApi: hasKey && Boolean(voice)
  });
}
