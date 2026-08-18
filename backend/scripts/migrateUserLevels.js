/**
 * Migration script: recalculate all user levels based on new XP formula.
 * Run once: node backend/scripts/migrateUserLevels.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import User from '../models/User.js';
import { levelFromXp } from '../utils/xpUtils.js';

const envPath = existsSync('../.env') ? '../.env' : '../../.env';
dotenv.config({ path: envPath });

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const users = await User.find({}, 'username xp level');
  console.log(`Found ${users.length} users`);

  let updated = 0;
  for (const user of users) {
    const correctLevel = levelFromXp(user.xp || 0);
    if (user.level !== correctLevel) {
      await User.updateOne({ _id: user._id }, { $set: { level: correctLevel } });
      updated++;
    }
  }

  console.log(`Migration complete. Updated ${updated} / ${users.length} users.`);
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
