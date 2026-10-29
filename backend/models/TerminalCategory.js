import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 120 },
  levelName: { type: String, required: true, maxlength: 40 },
  levelColor: { type: String, required: true, match: /^#[a-f\d]{6}$/i },
  badge: { type: String, default: null, match: /^terminal_[a-z\d][a-z\d_. -]{0,150}\.(png|jpe?g|webp|avif|gif|svg)$/i },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Terminal' }],
}, { timestamps: true });

export default mongoose.model('TerminalCategory', schema);
