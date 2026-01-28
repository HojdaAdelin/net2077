import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import readline from 'readline';
import Question from '../models/Question.js';
import Resource from '../models/Resource.js';
import Exam from '../models/Exam.js';
import Terminal from '../models/Terminal.js';
import IS from '../models/IS.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

// Create readline interface for interactive input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

const showMenu = () => {
  console.log('\n🔧 Database Sync Menu');
  console.log('=====================');
  console.log('1. Questions');
  console.log('2. Resources');
  console.log('3. Exams');
  console.log('4. Terminal Questions');
  console.log('5. IS Problems');
  console.log('6. All Categories');
  console.log('0. Exit');
  console.log('=====================');
};

const seedDatabase = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log(`📍 URI: ${process.env.MONGODB_URI?.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('[✔] Connected to MongoDB');
    console.log(`[✔] Database: ${mongoose.connection.db.databaseName}`);

    // Load all data files
    const questionsData = JSON.parse(
      readFileSync(join(__dirname, '../data/main_questions.json'), 'utf-8')
    );
    const resourcesData = JSON.parse(
      readFileSync(join(__dirname, '../data/resources.json'), 'utf-8')
    );
    const examsData = JSON.parse(
      readFileSync(join(__dirname, '../data/exams.json'), 'utf-8')
    );
    const terminalData = JSON.parse(
      readFileSync(join(__dirname, '../data/terminal.json'), 'utf-8')
    );
    const isData = JSON.parse(
      readFileSync(join(__dirname, '../data/is.json'), 'utf-8')
    );

    let continueMenu = true;
    
    while (continueMenu) {
      showMenu();
      const choice = await askQuestion('Select an option (0-6): ');
      
      switch (choice.trim()) {
        case '1':
          console.log('\n📊 Syncing Questions...');
          await syncQuestions(questionsData);
          break;
          
        case '2':
          console.log('\n📚 Syncing Resources...');
          await syncResources(resourcesData);
          break;
          
        case '3':
          console.log('\n📝 Syncing Exams...');
          await syncExams(examsData);
          break;
          
        case '4':
          console.log('\n💻 Syncing Terminal Questions...');
          await syncTerminalQuestions(terminalData);
          break;
          
        case '5':
          console.log('\n🔧 Syncing IS Problems...');
          await syncISProblems(isData);
          break;
          
        case '6':
          console.log('\n🔄 Syncing All Categories...');
          console.log('\n📊 Syncing Questions...');
          await syncQuestions(questionsData);
          console.log('\n📚 Syncing Resources...');
          await syncResources(resourcesData);
          console.log('\n📝 Syncing Exams...');
          await syncExams(examsData);
          console.log('\n💻 Syncing Terminal Questions...');
          await syncTerminalQuestions(terminalData);
          console.log('\n🔧 Syncing IS Problems...');
          await syncISProblems(isData);
          console.log('\n🎉 All categories synced successfully!');
          break;
          
        case '0':
          console.log('\n👋 Goodbye!');
          continueMenu = false;
          break;
          
        default:
          console.log('\n❌ Invalid option. Please select 0-6.');
          continue;
      }
      
      if (continueMenu && choice !== '0') {
        const continueChoice = await askQuestion('\nDo you want to sync another category? (y/n): ');
        if (continueChoice.toLowerCase() !== 'y' && continueChoice.toLowerCase() !== 'yes') {
          continueMenu = false;
          console.log('\n👋 Goodbye!');
        }
      }
    }
    
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('[✘] Error seeding database:', error);
    rl.close();
    process.exit(1);
  }
};

const syncQuestions = async (questionsData) => {

  const jsonQuestions = new Map();
  questionsData.forEach(q => {
    const uniqueKey = `${q.title}|||${(q.tags || []).sort().join(',')}`;
    jsonQuestions.set(uniqueKey, q);
  });

  const existingQuestions = await Question.find({});
  const existingMap = new Map();
  existingQuestions.forEach(q => {
    const uniqueKey = `${q.title}|||${(q.tags || []).sort().join(',')}`;
    existingMap.set(uniqueKey, q);
  });

  let added = 0;
  let updated = 0;
  let deleted = 0;

  for (const [uniqueKey, questionData] of jsonQuestions) {
    if (existingMap.has(uniqueKey)) {
      const existing = existingMap.get(uniqueKey);
      await Question.findByIdAndUpdate(existing._id, questionData);
      updated++;
    } else {
      await Question.create(questionData);
      added++;
    }
  }

  for (const [uniqueKey, existingQuestion] of existingMap) {
    if (!jsonQuestions.has(uniqueKey)) {
      await Question.findByIdAndDelete(existingQuestion._id);
      deleted++;
      console.log(`   🗑️  Deleted: "${existingQuestion.title}" [${existingQuestion.tags?.join(', ')}]`);
    }
  }

  console.log(`   [✔] Added: ${added} | Updated: ${updated} | Deleted: ${deleted}`);
  console.log(`   📝 Total questions in DB: ${jsonQuestions.size}`);
};

const syncResources = async (resourcesData) => {

  const jsonResources = new Map();
  resourcesData.forEach(r => {
    jsonResources.set(r.title, r);
  });

  const existingResources = await Resource.find({});
  const existingMap = new Map();
  existingResources.forEach(r => {
    existingMap.set(r.title, r);
  });

  let added = 0;
  let updated = 0;
  let deleted = 0;

  for (const [title, resourceData] of jsonResources) {
    if (existingMap.has(title)) {
      const existing = existingMap.get(title);
      await Resource.findByIdAndUpdate(existing._id, resourceData);
      updated++;
    } else {
      await Resource.create(resourceData);
      added++;
    }
  }

  for (const [title, existingResource] of existingMap) {
    if (!jsonResources.has(title)) {
      await Resource.findByIdAndDelete(existingResource._id);
      deleted++;
      console.log(`   [-]  Deleted: "${title}"`);
    }
  }

  console.log(`   [✔] Added: ${added} | Updated: ${updated} | Deleted: ${deleted}`);
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
      console.log(`   [-]  Deleted: "${existingExam.title}"`);
    }
  }

  console.log(`   [✔] Added: ${added} | Updated: ${updated} | Deleted: ${deleted}`);
  console.log(`   📝 Total exams in DB: ${jsonExams.size}`);
};

const syncTerminalQuestions = async (terminalData) => {
  const jsonTerminals = new Map();
  terminalData.forEach(t => {
    jsonTerminals.set(t.title, t);
  });

  const existingTerminals = await Terminal.find({});
  const existingMap = new Map();
  existingTerminals.forEach(t => {
    existingMap.set(t.title, t);
  });

  let added = 0;
  let updated = 0;
  let deleted = 0;

  for (const [title, terminalQuestionData] of jsonTerminals) {
    if (existingMap.has(title)) {
      const existing = existingMap.get(title);
      await Terminal.findByIdAndUpdate(existing._id, terminalQuestionData);
      updated++;
    } else {
      await Terminal.create(terminalQuestionData);
      added++;
    }
  }

  for (const [title, existingTerminal] of existingMap) {
    if (!jsonTerminals.has(title)) {
      await Terminal.findByIdAndDelete(existingTerminal._id);
      deleted++;
      console.log(`   [-]  Deleted: "${title}"`);
    }
  }

  console.log(`   [✔] Added: ${added} | Updated: ${updated} | Deleted: ${deleted}`);
  console.log(`   💻 Total terminal questions in DB: ${jsonTerminals.size}`);
};

seedDatabase();
const syncISProblems = async (isData) => {
  const jsonISProblems = new Map();
  isData.forEach(p => {
    jsonISProblems.set(p.title, p);
  });

  const existingISProblems = await IS.find({});
  const existingMap = new Map();
  existingISProblems.forEach(p => {
    existingMap.set(p.title, p);
  });

  let added = 0;
  let updated = 0;
  let deleted = 0;

  for (const [title, problemData] of jsonISProblems) {
    if (existingMap.has(title)) {
      const existing = existingMap.get(title);
      await IS.findByIdAndUpdate(existing._id, problemData);
      updated++;
    } else {
      await IS.create(problemData);
      added++;
    }
  }

  for (const [title, existingProblem] of existingMap) {
    if (!jsonISProblems.has(title)) {
      await IS.findByIdAndDelete(existingProblem._id);
      deleted++;
      console.log(`   [-]  Deleted: "${title}"`);
    }
  }

  console.log(`   [✔] Added: ${added} | Updated: ${updated} | Deleted: ${deleted}`);
  console.log(`   🔧 Total IS problems in DB: ${jsonISProblems.size}`);
};