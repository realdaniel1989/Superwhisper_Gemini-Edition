import express, { Request, Response } from 'express';
import { transcribeAudio } from '../services/groq.js';
import { refineText } from '../services/refine.js';

const router = express.Router();

/**
 * Transcription endpoint
 * Accepts JSON with base64 audio
 * Returns JSON with transcribed text (refined if possible)
 */
router.post('/transcribe', express.json({ limit: '50mb' }), async (req: Request, res: Response) => {
  try {
    const { audio, mimeType } = req.body;

    if (!audio || typeof audio !== 'string') {
      return res.status(400).json({
        error: 'No audio provided',
        message: 'Send JSON { audio: "base64string", mimeType: "audio/webm" }'
      });
    }

    const audioBuffer = Buffer.from(audio, 'base64');
    const type = mimeType || 'audio/webm';

    const rawText = await transcribeAudio(audioBuffer, type);

    // Attempt refinement — fall back to raw text on failure
    let refined = true;
    let text: string;
    try {
      text = await refineText(rawText);
    } catch (err) {
      console.error('Refinement error, returning raw text:', err);
      text = rawText;
      refined = false;
    }

    res.json({ text, refined });
  } catch (error) {
    console.error('Transcription error:', error);
    const message = error instanceof Error ? error.message : 'An error occurred while processing the audio';
    res.status(500).json({ error: message });
  }
});

export default router;
