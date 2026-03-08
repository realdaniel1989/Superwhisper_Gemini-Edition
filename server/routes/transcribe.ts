import express, { Request, Response } from 'express';
import multer from 'multer';
import { streamTranscription } from '../services/openrouter.js';

const router = express.Router();

// Configure multer for handling multipart/form-data
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Transcription endpoint
 * Accepts multipart/form-data with audio file
 * Returns SSE stream with transcription chunks
 */
router.post('/api/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    // Check if audio file was provided
    const audioFile = req.file;

    if (!audioFile) {
      return res.status(400).json({
        error: 'No audio file provided',
        message: 'Please provide an audio file in the "audio" field'
      });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Convert buffer to base64
    const audioBase64 = audioFile.buffer.toString('base64');
    const mimeType = audioFile.mimetype;

    // Stream transcription
    const fullText = await streamTranscription(
      audioBase64,
      mimeType,
      (chunk: string) => {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }
    );

    // Send completion event
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Transcription error:', error);
    const message = error instanceof Error ? error.message : 'An error occurred while processing the audio';
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.end();
  }
});

export default router;
