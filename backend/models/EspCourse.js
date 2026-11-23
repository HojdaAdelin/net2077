import mongoose from 'mongoose';

const { Schema } = mongoose;
const key = { type: String, required: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, maxlength: 80 };
const title = { type: String, trim: true, required: true, maxlength: 150 };
const assetUrl = /^(?:\/(?!\/)|https:\/\/)[^\s\\]+$/;
const blockSchema = new Schema({
  type: { type: String, required: true, enum: ['text', 'diagram', 'code', 'check', 'image', 'link'] },
  title,
  content: {
    type: String, required: true, maxlength: 16000,
    validate(value) {
      return !['image', 'link'].includes(this.type) || assetUrl.test(value);
    },
  },
}, { _id: false });
const lessonSchema = new Schema({
  id: key,
  title,
  blocks: { type: [blockSchema], validate: blocks => blocks.length > 0 && blocks.length <= 30 },
}, { _id: false });
const moduleSchema = new Schema({
  title,
  lessons: { type: [lessonSchema], validate: lessons => lessons.length > 0 && lessons.length <= 25 },
}, { _id: false });

const courseSchema = new Schema({
  slug: { ...key, unique: true, immutable: true, validate: slug => !['admin', 'progress', 'nou'].includes(slug) },
  title,
  summary: { type: String, trim: true, required: true, maxlength: 500 },
  cover: { type: String, required: true, match: assetUrl, maxlength: 2048 },
  duration: { type: Number, required: true, min: 1, max: 9999 },
  published: { type: Boolean, default: false },
  modules: {
    type: [moduleSchema],
    validate: modules => {
      const ids = modules.flatMap(module => module.lessons.map(lesson => lesson.id));
      return modules.length > 0 && modules.length <= 20 && ids.length === new Set(ids).size;
    },
  },
}, { timestamps: true, optimisticConcurrency: true });

const completionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, required: true },
  course: { type: Schema.Types.ObjectId, required: true },
  lesson: { type: String, required: true },
});
completionSchema.index({ user: 1, course: 1, lesson: 1 }, { unique: true });
completionSchema.index({ course: 1 });

export const EspLessonCompletion = mongoose.model('EspLessonCompletion', completionSchema);
export default mongoose.model('EspCourse', courseSchema);
