import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const testConnection = async () => {
  try {
    console.log('🔄 Testing MongoDB connection...\n');
    
    // Hide password in logs
    const maskedUri = process.env.MONGODB_URI?.replace(
      /\/\/([^:]+):([^@]+)@/,
      '//$1:****@'
    );
    console.log(`📍 Connection URI: ${maskedUri}\n`);

    console.log('⏳ Connecting...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ Connection successful!\n');
    console.log('📊 Database Information:');
    console.log(`   Name: ${mongoose.connection.db.databaseName}`);
    console.log(`   Host: ${mongoose.connection.host}`);
    console.log(`   Port: ${mongoose.connection.port || 'N/A (Atlas)'}`);
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\n📚 Collections (${collections.length}):`);
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });

    // Count documents in each collection
    console.log('\n📈 Document Counts:');
    for (const col of collections) {
      const count = await mongoose.connection.db.collection(col.name).countDocuments();
      console.log(`   ${col.name}: ${count} documents`);
    }

    console.log('\n✅ All checks passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error(`Error: ${error.message}\n`);
    
    if (error.message.includes('authentication')) {
      console.log('💡 Tip: Check your username and password in .env');
      console.log('   Make sure special characters are URL encoded');
    } else if (error.message.includes('timeout')) {
      console.log('💡 Tip: Check your Network Access whitelist in MongoDB Atlas');
      console.log('   Make sure 0.0.0.0/0 is added for development');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('💡 Tip: Check your cluster URL in .env');
      console.log('   Make sure it matches your Atlas cluster');
    }
    
    process.exit(1);
  }
};

testConnection();
