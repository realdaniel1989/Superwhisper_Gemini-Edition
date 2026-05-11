import express from 'express';
import { transcribeAudio } from '../services/groq.js';
const router = express.Router();
/**
 * Transcription endpoint
 * Accepts JSON with base64 audio
 * Returns JSON with transcribed text
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
        const text = await transcribeAudio(audioBuffer, type);
        res.json({ text });
    }
    catch (error) {
        console.error('Transcription error:', error);
        const message = error instanceof Error ? error.message : 'An error occurred while processing the audio';
        res.status(500).json({ error: message });
    }
});
export default router;
