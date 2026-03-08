import express from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Health check endpoint will be mounted here
// Transcription endpoint will be mounted at /api

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app };
