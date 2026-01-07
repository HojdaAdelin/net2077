import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';
import Support from '../models/Support.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

const connectToDatabase = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('[✔] Connected to MongoDB');
    console.log(`[✔] Database: ${mongoose.connection.db.databaseName}\n`);
  } catch (error) {
    console.error('[✘] Error connecting to database:', error);
    process.exit(1);
  }
};

const listSupportRequests = async () => {
  try {
    const requests = await Support.find({})
      .sort({ createdAt: -1 })
      .select('_id username title type status createdAt');

    if (requests.length === 0) {
      console.log('📭 No support requests found.\n');
      return [];
    }

    console.log('📋 Support Requests:\n');
    console.log('ID  | User        | Type        | Status      | Title                    | Date');
    console.log('----+-------------+-------------+-------------+--------------------------+------------');
    
    requests.forEach((request, index) => {
      const id = `#${index + 1}`;
      const user = request.username.padEnd(11);
      const type = request.type.padEnd(11);
      const status = request.status.padEnd(11);
      const title = request.title.length > 24 ? request.title.substring(0, 21) + '...' : request.title.padEnd(24);
      const date = request.createdAt.toLocaleDateString();
      
      console.log(`${id.padEnd(3)} | ${user} | ${type} | ${status} | ${title} | ${date}`);
    });
    
    console.log('');
    return requests;
  } catch (error) {
    console.error('[✘] Error fetching support requests:', error);
    return [];
  }
};

const viewSupportRequest = async (requests, index) => {
  const request = requests[index - 1];
  if (!request) {
    console.log('❌ Invalid request ID.\n');
    return;
  }

  try {
    const fullRequest = await Support.findById(request._id);
    
    console.log('📄 Support Request Details:\n');
    console.log(`🆔 ID: #${index}`);
    console.log(`👤 User: ${fullRequest.username}`);
    console.log(`📝 Type: ${fullRequest.type === 'bug' ? '🐛 Bug Report' : '✨ Feature Request'}`);
    console.log(`📊 Status: ${getStatusEmoji(fullRequest.status)} ${fullRequest.status}`);
    console.log(`📅 Created: ${fullRequest.createdAt.toLocaleString()}`);
    console.log(`📝 Updated: ${fullRequest.updatedAt.toLocaleString()}`);
    console.log(`\n📋 Title:`);
    console.log(`${fullRequest.title}`);
    console.log(`\n📄 Description:`);
    console.log(`${fullRequest.description}`);
    console.log('\n' + '─'.repeat(60) + '\n');

    return fullRequest;
  } catch (error) {
    console.error('[✘] Error fetching request details:', error);
  }
};

const getStatusEmoji = (status) => {
  switch (status) {
    case 'open': return '🔓';
    case 'in-progress': return '⏳';
    case 'closed': return '✅';
    default: return '❓';
  }
};

const deleteSupportRequest = async (request) => {
  try {
    await Support.findByIdAndDelete(request._id);
    console.log(`✅ Support request deleted successfully!\n`);
  } catch (error) {
    console.error('[✘] Error deleting support request:', error);
  }
};

const main = async () => {
  await connectToDatabase();

  console.log('🎯 Support Request Management Tool');
  console.log('==================================\n');

  while (true) {
    const requests = await listSupportRequests();
    
    if (requests.length === 0) {
      console.log('Press Enter to refresh or type "exit" to quit.');
      const input = await question('> ');
      if (input.toLowerCase() === 'exit') break;
      continue;
    }

    console.log('Enter request ID to view details (e.g., 1, 2, 3) or "exit" to quit:');
    const input = await question('> ');

    if (input.toLowerCase() === 'exit') {
      break;
    }

    const requestId = parseInt(input);
    if (isNaN(requestId) || requestId < 1 || requestId > requests.length) {
      console.log('❌ Invalid input. Please enter a valid request ID.\n');
      continue;
    }

    const fullRequest = await viewSupportRequest(requests, requestId);
    if (!fullRequest) continue;

    console.log('Options:');
    console.log('  d - Delete this request');
    console.log('  b - Go back to list');
    console.log('  e - Exit');

    const action = await question('Choose action (d/b/e): ');

    switch (action.toLowerCase()) {
      case 'd':
        console.log('⚠️  Are you sure you want to delete this request? This action cannot be undone.');
        const confirm = await question('Type "yes" to confirm: ');
        if (confirm.toLowerCase() === 'yes') {
          await deleteSupportRequest(fullRequest);
        } else {
          console.log('❌ Deletion cancelled.\n');
        }
        break;
      case 'e':
        console.log('👋 Goodbye!');
        process.exit(0);
        break;
      case 'b':
      default:
        console.log('');
        break;
    }
  }

  console.log('👋 Goodbye!');
  rl.close();
  mongoose.connection.close();
};

main().catch(error => {
  console.error('[✘] Script error:', error);
  rl.close();
  mongoose.connection.close();
  process.exit(1);
});