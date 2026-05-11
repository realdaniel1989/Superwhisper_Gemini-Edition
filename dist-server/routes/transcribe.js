import express from 'express';
import multer from 'multer';
import { transcribeAudio } from '../services/groq.js';
const router = express.Router();
// Configure multer for handling multipart/form-data (fallback)
const upload = multer({ storage: multer.memoryStorage() });
/**
 * Transcription endpoint
 * Accepts JSON with base64 audio OR multipart/form-data
 * Returns JSON with transcribed text
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
    try {
        let audioBuffer;
        let mimeType;
        // Check for JSON body with base64 audio (primary path - avoids Zscaler multipart inspection)
        if (req.body?.audio && typeof req.body.audio === 'string') {
            mimeType = req.body.mimeType || 'audio/webm';
            audioBuffer = Buffer.from(req.body.audio, 'base64');
        }
        else if (req.file) {
            // Fallback: multipart/form-data
            audioBuffer = req.file.buffer;
            mimeType = req.file.mimetype;
        }
        else {
            return res.status(400).json({
                error: 'No audio provided',
                message: 'Send JSON { audio: base64, mimeType } or multipart with "audio" field'
            });
        }
        const text = await transcribeAudio(audioBuffer, mimeType);
        res.json({ text });
    }
    catch (error) {
        console.error('Transcription error:', error);
        const message = error instanceof Error ? error.message : 'An error occurred while processing the audio';
        res.status(500).json({ error: message });
    }
});
export default router;
