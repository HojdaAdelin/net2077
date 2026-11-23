import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import EspCourse from '../models/EspCourse.js';

// Fingerprint of the original Romanian seed, excluding MongoDB metadata.
const legacyCourseHash = '6a1947f0daac333608e8021e1dd2a123422f56dbdd921aee65e83e6455e8f652';
function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortKeys(value[key])]));
}
function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(sortKeys(value))).digest('hex');
}

async function seedCourse(course) {
  const result = await EspCourse.updateOne({ slug: course.slug }, {
    $setOnInsert: { ...course, __v: 0, createdAt: new Date(), updatedAt: new Date() },
  }, { upsert: true, timestamps: false });
  if (result.upsertedCount) {
    console.log(`Added: ${course.title}`);
    return;
  }
  if (course.slug === 'esp32-wifi') {
    const existing = await EspCourse.findOne({ slug: course.slug });
    const saved = existing?.toObject();
    const content = saved && Object.fromEntries(Object.keys(course).map(key => [key, saved[key]]));
    if (content && fingerprint(content) === legacyCourseHash) {
      existing.set(course);
      await existing.save();
      console.log('The original Wi-Fi course was updated to English.');
      return;
    }
  }
  console.log(`Preserved existing course: ${course.slug}`);
}

dotenv.config({ path: new URL('../../.env', import.meta.url) });
dotenv.config();

try {
  const files = ['esp32WifiCourse.json', 'esp32BluetoothCourse.json'];
  const courses = await Promise.all(files.map(async file => {
    const course = JSON.parse(await readFile(new URL(`../data/${file}`, import.meta.url), 'utf8'));
    await new EspCourse(course).validate();
    return course;
  }));
  await mongoose.connect(process.env.MONGODB_URI);
  await EspCourse.init();
  for (const course of courses) await seedCourse(course);
} finally {
  await mongoose.disconnect();
}
