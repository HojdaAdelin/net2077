import mongoose from 'mongoose';

const plannerTaskSchema = new mongoose.Schema({
  text: { type: String, required: true, maxlength: 300 },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null }
});

export default mongoose.model('PlannerTask', plannerTaskSchema);
