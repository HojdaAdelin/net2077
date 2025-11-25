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

dotenv.config({ path: '../.env' });

const app = express();

app.use(cors({ 
  origin: ['http://localhost:5173', 'http://192.168.56.1:5173'],
  credentials: true 
}));
app.use(cookieParser());
app.use(express.json());



mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

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

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

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

app.listen(PORT, HOST, () => {
  const ip = getLocalIp();
  console.log(`🚀 Backend running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`🌐 Accessible on your network at: http://${ip}:${PORT}`);
});
