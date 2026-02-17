import mongoose from 'mongoose';

const forumTopicSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  zoneId: { type: mongoose.Schema.Types.ObjectId, required: true },
  title: { type: String, required: true },
  content: { type: String, default: '' },
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  minRoleToReply: { 
    type: String, 
    enum: ['user', 'helper', 'mod', 'head-mod', 'admin', 'head-admin', 'root'],
    default: 'user'
  },
  replyCount: { type: Number, default: 0 },
  lastReply: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('ForumTopic', forumTopicSchema);
