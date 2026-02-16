import mongoose from 'mongoose';

const forumItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  icon: { type: String, required: true },
  order: { type: Number, required: true },
  postCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const forumZoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  order: { type: Number, required: true },
  items: [forumItemSchema],
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('ForumZone', forumZoneSchema);
