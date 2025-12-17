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

// Simplified for Vercel deployment


const corsOptions = {
  origin: function (origin, callback) {
    // Debug logging
    console.log('🔍 CORS Debug:');
    console.log('  Origin:', origin);
    console.log('  NODE_ENV:', process.env.NODE_ENV);
    console.log('  ALLOWED_ORIGINS env:', process.env.ALLOWED_ORIGINS);
    
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : [
          'http://localhost:5173',
          'http://127.0.0.1:5173'
        ];
    
    console.log('  Allowed origins:', allowedOrigins);
    console.log('  Origin match:', allowedOrigins.indexOf(origin) !== -1);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      console.log('  ✅ CORS allowed');
      callback(null, true);
    } else {
      console.log('  ❌ CORS blocked');
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());



// MongoDB connection with better error handling
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[-] Backend running on port ${PORT}`);
});
