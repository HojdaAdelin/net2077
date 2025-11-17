import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import Question from '../models/Question.js';
import Resource from '../models/Resource.js';
import Exam from '../models/Exam.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Load data from JSON files
    const questionsData = JSON.parse(
      readFileSync(join(__dirname, '../data/questions.json'), 'utf-8')
    );
    const resourcesData = JSON.parse(
      readFileSync(join(__dirname, '../data/resources.json'), 'utf-8')
    );
    const examsData = JSON.parse(
      readFileSync(join(__dirname, '../data/exams.json'), 'utf-8')
    );

    console.log('\n📊 Syncing Questions...');
    await syncQuestions(questionsData);

    console.log('\n📚 Syncing Resources...');
    await syncResources(resourcesData);

    console.log('\n📝 Syncing Exams...');
    await syncExams(examsData);

    console.log('\n🎉 Database synced successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

const syncQuestions = async (questionsData) => {
  // Create a unique identifier for each question (based on title)
  const jsonQuestions = new Map();
  questionsData.forEach(q => {
    jsonQuestions.set(q.title, q);
  });

  // Get existing questions from DB
  const existingQuestions = await Question.find({});
  const existingMap = new Map();
  existingQuestions.forEach(q => {
    existingMap.set(q.title, q);
  });

  let added = 0;
  let updated = 0;
  let deleted = 0;

  // Add or update questions from JSON
  for (const [title, questionData] of jsonQuestions) {
    if (existingMap.has(title)) {
      // Update existing question
      const existing = existingMap.get(title);
      await Question.findByIdAndUpdate(existing._id, questionData);
      updated++;
    } else {
      // Add new question
      await Question.create(questionData);
      added++;
    }
  }

  // Delete questions that are in DB but not in JSON
  for (const [title, existingQuestion] of existingMap) {
    if (!jsonQuestions.has(title)) {
      await Question.findByIdAndDelete(existingQuestion._id);
      deleted++;
      console.log(`   🗑️  Deleted: "${title}"`);
    }
  }

  console.log(`   ✅ Added: ${added} | Updated: ${updated} | Deleted: ${deleted}`);
  console.log(`   📝 Total questions in DB: ${jsonQuestions.size}`);
};

const syncResources = async (resourcesData) => {
  // Create a unique identifier for each resource (based on title)
  const jsonResources = new Map();
  resourcesData.forEach(r => {
    jsonResources.set(r.title, r);
  });

  // Get existing resources from DB
  const existingResources = await Resource.find({});
  const existingMap = new Map();
  existingResources.forEach(r => {
    existingMap.set(r.title, r);
  });

  let added = 0;
  let updated = 0;
  let deleted = 0;

  // Add or update resources from JSON
  for (const [title, resourceData] of jsonResources) {
    if (existingMap.has(title)) {
      // Update existing resource
      const existing = existingMap.get(title);
      await Resource.findByIdAndUpdate(existing._id, resourceData);
      updated++;
    } else {
      // Add new resource
      await Resource.create(resourceData);
      added++;
    }
  }

  // Delete resources that are in DB but not in JSON
  for (const [title, existingResource] of existingMap) {
    if (!jsonResources.has(title)) {
      await Resource.findByIdAndDelete(existingResource._id);
      deleted++;
      console.log(`   🗑️  Deleted: "${title}"`);
    }
  }

  console.log(`   ✅ Added: ${added} | Updated: ${updated} | Deleted: ${deleted}`);
  console.log(`   📚 Total resources in DB: ${jsonResources.size}`);
};

const syncExams = async (examsData) => {
  const jsonExams = new Map();
  examsData.forEach(e => {
    jsonExams.set(e.id, e);
  });

  const existingExams = await Exam.find({});
  const existingMap = new Map();
  existingExams.forEach(e => {
    existingMap.set(e.id, e);
  });

  let added = 0;
  let updated = 0;
  let deleted = 0;

  for (const [id, examData] of jsonExams) {
    if (existingMap.has(id)) {
      const existing = existingMap.get(id);
      await Exam.findByIdAndUpdate(existing._id, examData);
      updated++;
    } else {
      await Exam.create(examData);
      added++;
    }
  }

  for (const [id, existingExam] of existingMap) {
    if (!jsonExams.has(id)) {
      await Exam.findByIdAndDelete(existingExam._id);
      deleted++;
      console.log(`   🗑️  Deleted: "${existingExam.title}"`);
    }
  }

  console.log(`   ✅ Added: ${added} | Updated: ${updated} | Deleted: ${deleted}`);
  console.log(`   📝 Total exams in DB: ${jsonExams.size}`);
};

seedDatabase();
