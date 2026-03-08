import express from 'express';
import dotenv from 'dotenv';
import healthRouter from './routes/health.js';
import transcribeRouter from './routes/transcribe.js';
import corsMiddleware from './middleware/cors.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(corsMiddleware);
app.use(express.json());

// Mount routes
app.use(healthRouter);
app.use(transcribeRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app };
