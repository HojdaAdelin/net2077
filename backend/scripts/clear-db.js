import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Question from '../models/Question.js';
import Resource from '../models/Resource.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const clearDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const questionsCount = await Question.countDocuments();
    const resourcesCount = await Resource.countDocuments();
    const usersCount = await User.countDocuments();

    console.log('\n📊 Current database state:');
    console.log(`   Questions: ${questionsCount}`);
    console.log(`   Resources: ${resourcesCount}`);
    console.log(`   Users: ${usersCount}`);

    console.log('\n⚠️  WARNING: This will delete ALL data from the database!');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    await Question.deleteMany({});
    await Resource.deleteMany({});
    await User.deleteMany({});

    console.log('✅ Database cleared successfully!');
    console.log('\n💡 Run "npm run seed" to populate with fresh data.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  }
};

clearDatabase();
