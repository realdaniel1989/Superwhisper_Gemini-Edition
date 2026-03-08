import express, { Request, Response } from 'express';
import multer from 'multer';

const router = express.Router();

// Configure multer for handling multipart/form-data
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Transcription endpoint (skeleton)
 * Accepts multipart/form-data with audio file
 * Will be integrated with OpenRouter API in Plan 02
 */
router.post('/api/transcribe', upload.single('audio'), (req: Request, res: Response) => {
  try {
    // Check if audio file was provided
    const audioFile = req.file;

    if (!audioFile) {
      return res.status(400).json({
        error: 'No audio file provided',
        message: 'Please provide an audio file in the "audio" field'
      });
    }

    // Placeholder response - actual transcription will be implemented in Plan 02
    return res.status(200).json({
      message: 'Transcription endpoint ready',
      audioReceived: true,
      audioSize: audioFile.size,
      audioMimeType: audioFile.mimetype
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return res.status(500).json({
      error: 'Transcription failed',
      message: 'An error occurred while processing the audio'
    });
  }
});

export default router;
