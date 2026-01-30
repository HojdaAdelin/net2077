import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createInterface } from 'readline';
import InboxMessage from '../models/InboxMessage.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

const sendMessage = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('[✔] Connected to MongoDB');
    console.log('\n📧 Send Inbox Message to User\n');
    
    // Get username
    const username = await question('👤 Enter username: ');
    if (!username.trim()) {
      console.error('[✘] Username is required');
      process.exit(1);
    }
    
    // Find user by username
    const user = await User.findOne({ username: username.trim() });
    if (!user) {
      console.error(`[✘] User '${username}' not found`);
      
      // Show available users (first 10)
      const users = await User.find({}, 'username').limit(10);
      if (users.length > 0) {
        console.log('\n💡 Available users:');
        users.forEach(u => console.log(`   - ${u.username}`));
      }
      
      process.exit(1);
    }
    
    console.log(`[✔] User found: ${user.username} (${user.email})`);
    
    // Get title
    const title = await question('\n📝 Enter message title: ');
    if (!title.trim()) {
      console.error('[✘] Title is required');
      process.exit(1);
    }
    
    // Get description
    console.log('\n📄 Enter message description (press Enter twice to finish):');
    let description = '';
    let emptyLines = 0;
    
    while (emptyLines < 2) {
      const line = await question('');
      if (line.trim() === '') {
        emptyLines++;
      } else {
        emptyLines = 0;
        if (description) description += '\n';
        description += line;
      }
    }
    
    if (!description.trim()) {
      console.error('[✘] Description is required');
      process.exit(1);
    }
    
    // Show preview
    console.log('\n📋 Message Preview:');
    console.log('─'.repeat(50));
    console.log(`To: ${user.username}`);
    console.log(`From: admin`);
    console.log(`Title: ${title.trim()}`);
    console.log(`Description:\n${description.trim()}`);
    console.log('─'.repeat(50));
    
    // Confirm sending
    const confirm = await question('\n❓ Send this message? (y/N): ');
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('[ℹ] Message cancelled');
      process.exit(0);
    }
    
    // Create message
    const message = await InboxMessage.create({
      recipientId: user._id,
      recipientUsername: user.username,
      sender: 'admin',
      title: title.trim(),
      description: description.trim()
    });
    
    console.log('\n[✔] Message sent successfully!');
    console.log(`    Message ID: ${message._id}`);
    console.log(`    Sent to: ${user.username}`);
    console.log(`    Created at: ${message.createdAt}`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n[✘] Error sending message:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
};

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n[ℹ] Operation cancelled by user');
  rl.close();
  process.exit(0);
});

sendMessage();