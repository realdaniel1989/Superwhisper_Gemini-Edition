import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import healthRouter from './routes/health.js';
import transcribeRouter from './routes/transcribe.js';
import corsMiddleware from './middleware/cors.js';
// Load environment variables
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3001;
// Middleware
app.use(corsMiddleware);
app.use(express.json());
// API routes with /api prefix
app.use('/api', healthRouter);
app.use('/api', transcribeRouter);
// Serve frontend static files (production only)
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));
// SPA fallback - serve index.html for client-side routing
app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
export { app };
