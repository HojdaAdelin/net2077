import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  _id: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  emailHash: { type: String, required: true, index: true },
  passwordState: String,
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  status: { type: String, enum: ['delivering', 'pending', 'verified', 'locked', 'superseded', 'consumed', 'failed'], required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  grantHash: String,
  grantExpiresAt: Date
}, { timestamps: true });

export default mongoose.model('PasswordReset', schema);
