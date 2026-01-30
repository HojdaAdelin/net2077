import mongoose from 'mongoose';

const inboxMessageSchema = new mongoose.Schema({
  recipientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  recipientUsername: { 
    type: String, 
    required: true 
  },
  sender: { 
    type: String, 
    default: 'admin',
    required: true 
  },
  title: { 
    type: String, 
    required: true,
    maxlength: 200
  },
  description: { 
    type: String, 
    required: true,
    maxlength: 2000
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

export default mongoose.model('InboxMessage', inboxMessageSchema);