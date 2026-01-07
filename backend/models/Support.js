import mongoose from 'mongoose';

const supportSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  username: { 
    type: String, 
    required: true 
  },
  title: { 
    type: String, 
    required: true,
    maxlength: 100
  },
  description: { 
    type: String, 
    required: true,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'closed'],
    default: 'open'
  },
  type: {
    type: String,
    enum: ['bug', 'enhancement'],
    required: true
  }
}, { timestamps: true });

export default mongoose.model('Support', supportSchema);