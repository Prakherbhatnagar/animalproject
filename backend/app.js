import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.routes.js';
import reportRoutes from './routes/report.routes.js';
import rewardRoutes from './routes/reward.routes.js';
import ngoRoutes from './routes/ngo.routes.js';
import donationRoutes from './routes/donation.routes.js';
import chatRoutes from './routes/chat.routes.js';
import statsRoutes from './routes/stats.routes.js';
import adoptionRoutes from './routes/adoption.routes.js';
import errorHandler from './middlewares/errorHandler.js';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: '*', // For frontend connection
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
}));

// Apply rate limiting (e.g. max 100 requests per 15 minutes per IP)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,
  message: { message: 'Too many requests, please try again later.' }
});
app.use('/api/', apiLimiter);

// Logging
app.use(morgan('dev'));

// Setup raw payload parsing explicitly for Stripe Webhook before express.json parsing
app.use('/api/donations/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  const { webhookListener } = await import('./controllers/stripe.controller.js');
  return webhookListener(req, res, next);
});

app.use(express.json({ limit: '50mb' })); // Base64
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/ngos', ngoRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/adoptions', adoptionRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Serve frontend in production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const filePath = path.resolve(__dirname, '../frontend/dist', 'index.html');
  res.sendFile(filePath);
});

// Fallback error handler
app.use(errorHandler);

export default app;
