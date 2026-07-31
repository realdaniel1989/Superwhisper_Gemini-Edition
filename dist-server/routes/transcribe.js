import express from 'express';
import { transcribeAudio } from '../services/groq.js';
import { refineText } from '../services/refine.js';
const router = express.Router();
/**
 * Transcription endpoint
 * Accepts JSON with base64 audio
 * Returns JSON with transcribed text (refined if possible)
 */
router.post('/transcribe', express.json({ limit: '50mb' }), async (req, res) => {
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
        const t0 = performance.now();
        const rawText = await transcribeAudio(audioBuffer, type);
        const asrMs = Math.round(performance.now() - t0);
        // Attempt refinement — fall back to raw text on failure
        let refined = true;
        let text;
        const t1 = performance.now();
        try {
            text = await refineText(rawText);
        }
        catch (err) {
            console.error('Refinement error, returning raw text:', err);
            text = rawText;
            refined = false;
        }
        const refineMs = Math.round(performance.now() - t1);
        console.log(`[transcribe] audio=${(audioBuffer.length / 1024).toFixed(0)}KB ` +
            `asr=${asrMs}ms refine=${refineMs}ms refined=${refined} total=${asrMs + refineMs}ms`);
        res.json({ text, refined });
    }
    catch (error) {
        console.error('Transcription error:', error);
        const message = error instanceof Error ? error.message : 'An error occurred while processing the audio';
        res.status(500).json({ error: message });
    }
});
export default router;
