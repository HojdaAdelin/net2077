import mongoose from 'mongoose';

const forumTopicSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  zoneId: { type: mongoose.Schema.Types.ObjectId, required: true },
  title: { type: String, required: true },
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  replyCount: { type: Number, default: 0 },
  lastReply: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('ForumTopic', forumTopicSchema);
