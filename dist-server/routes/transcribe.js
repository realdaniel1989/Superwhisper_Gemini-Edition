import express from 'express';
import multer from 'multer';
import { transcribeAudio } from '../services/groq.js';
const router = express.Router();
// Configure multer for handling multipart/form-data
const upload = multer({ storage: multer.memoryStorage() });
/**
 * Transcription endpoint
 * Accepts multipart/form-data with audio file
 * Returns JSON with transcribed text
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
    try {
        const audioFile = req.file;
        if (!audioFile) {
            return res.status(400).json({
                error: 'No audio file provided',
                message: 'Please provide an audio file in the "audio" field'
            });
        }
        const text = await transcribeAudio(audioFile.buffer, audioFile.mimetype);
        res.json({ text });
    }
    catch (error) {
        console.error('Transcription error:', error);
        const message = error instanceof Error ? error.message : 'An error occurred while processing the audio';
        res.status(500).json({ error: message });
    }
});
export default router;
