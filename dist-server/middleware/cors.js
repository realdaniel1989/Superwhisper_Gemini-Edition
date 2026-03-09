import cors from 'cors';
/**
 * CORS configuration for the backend API
 * Allows requests from the frontend origin (localhost:3000 in development)
 */
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 204
};
const corsMiddleware = cors(corsOptions);
export default corsMiddleware;
