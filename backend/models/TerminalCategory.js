import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 120 },
  levelName: { type: String, required: true, maxlength: 40 },
  levelColor: { type: String, required: true, match: /^#[a-f\d]{6}$/i },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Terminal' }],
}, { timestamps: true });

export default mongoose.model('TerminalCategory', schema);
