/**
 * Локальная версия бота для тестирования без вебхуков
 * Запускается командой: node local.js
 */

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Bot configuration
const BOT_TOKEN = process.env.BOT_TOKEN || '7914542986:AAEI3dVWnv1utpgMYKyd5v08KGrvjNyviOo';
const SECRET_CODE = process.env.SECRET_CODE || 'nuras2316';

// Data storage paths
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize bot with polling for local development
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('Bot started in local mode with polling...');
console.log('Press Ctrl+C to stop the bot');

// Import and initialize all the handlers from index.js
// This is a simplified approach - in a real project, you would
// refactor the code to separate handlers and bot initialization
const mainBot = require('./index');

// If you want to test MongoDB in local mode, uncomment these lines:
/*
const db = require('./db');

// Test MongoDB connection
async function testMongoDBConnection() {
  try {
    const { User, Task } = await db.connectToDatabase();
    if (User && Task) {
      console.log('MongoDB connected successfully');
    } else {
      console.log('MongoDB connection failed, using local file storage');
    }
  } catch (error) {
    console.error('Error testing MongoDB connection:', error);
  }
}

testMongoDBConnection();
*/ 