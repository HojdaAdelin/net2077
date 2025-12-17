import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import os from 'os';
import authRoutes from './routes/authRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import resourceRoutes from './routes/resourceRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import examRoutes from './routes/examRoutes.js';

import { existsSync } from 'fs';
const envPath = existsSync('.env') ? '.env' : '../.env';
dotenv.config({ path: envPath });

const app = express();

const getLocalIp = () => {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
};


const corsOptions = {
  origin: function (origin, callback) {
    
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : [
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          `http://${getLocalIp()}:5173`,
          'http://192.168.56.1:5173'
        ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());


mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    console.log('[✔] MongoDB connected successfully');
    const dbName = mongoose.connection.db.databaseName;
    console.log(`[✔] Database: ${dbName}`);
  })
  .catch(err => {
    console.error('[✘] MongoDB connection error:', err.message);
    process.exit(1);
  });

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('[✘] MongoDB error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('[⚠] MongoDB disconnected');
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Backend API is running',
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/exams', examRoutes);

// Start server only in development (local)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  const HOST = '0.0.0.0';

  app.listen(PORT, HOST, () => {
    const ip = getLocalIp();
    console.log(`[-] Backend running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log(`[-] Accessible on your network at: http://${ip}:${PORT}`);
  });
}

// Export for Vercel (production)
export default app;
