import express from 'express';
import dotenv from 'dotenv';
import healthRouter from './routes/health.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Mount routes
app.use(healthRouter);

// Transcription endpoint will be mounted at /api

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app };
