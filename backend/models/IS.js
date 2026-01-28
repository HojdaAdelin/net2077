import mongoose from 'mongoose';

const isSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  xp: {
    type: Number,
    required: true
  },
  input: {
    type: String,
    required: true
  },
  output: {
    type: String,
    required: true
  },
  samplecode: {
    type: String,
    required: true
  },
  officialcode: {
    type: String,
    required: true
  },
  language: {
    type: String,
    required: true,
    default: 'cpp'
  }
}, {
  timestamps: true
});

export default mongoose.model('IS', isSchema);