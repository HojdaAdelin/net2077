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
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import supportRoutes from './routes/support.js';
import terminalRoutes from './routes/terminalRoutes.js';

import { existsSync } from 'fs';
const envPath = existsSync('.env') ? '.env' : '../.env';
dotenv.config({ path: envPath });

const app = express();

app.set('trust proxy', 1);

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
  origin: true, 
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

// Endpoint pentru seeding manual pe producție
app.get('/seed-terminal', async (req, res) => {
  try {
    const Terminal = (await import('./models/Terminal.js')).default;
    const { readFileSync } = await import('fs');
    const { fileURLToPath } = await import('url');
    const { dirname, join } = await import('path');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    const terminalData = JSON.parse(
      readFileSync(join(__dirname, 'data/terminal.json'), 'utf-8')
    );
    
    let added = 0;
    for (const questionData of terminalData) {
      const existing = await Terminal.findOne({ title: questionData.title });
      if (!existing) {
        await Terminal.create(questionData);
        added++;
      }
    }
    
    const total = await Terminal.countDocuments();
    res.json({ 
      message: 'Terminal questions seeded successfully',
      added,
      total
    });
  } catch (error) {
    console.error('Seeding error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/terminal', terminalRoutes);


if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  const HOST = '0.0.0.0';

  app.listen(PORT, HOST, () => {
    const ip = getLocalIp();
    console.log(`[-] Backend running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log(`[-] Accessible on your network at: http://${ip}:${PORT}`);
  });
}


export default app;
