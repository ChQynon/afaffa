const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const express = require('express');

// Определение режима работы (webhook или polling)
const IS_PROD = process.env.NODE_ENV === 'production';

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

// Environment variables
const PORT = process.env.PORT || 3000;
const URL = process.env.URL || 'https://afaffa.vercel.app';

// Initialize bot with appropriate mode
let bot;
const app = express();
app.use(express.json());

if (IS_PROD) {
  // Webhook mode for production (Vercel)
  bot = new TelegramBot(BOT_TOKEN, {
    webHook: {
      port: PORT
    }
  });
  
  // Set webhook only in production mode
  bot.setWebHook(`${URL}/bot${BOT_TOKEN}`);
  
  // Webhook endpoint
  app.post(`/bot${BOT_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
  
  console.log(`Starting bot in WEBHOOK mode`);
} else {
  // Polling mode for local development
  bot = new TelegramBot(BOT_TOKEN, { polling: true });
  console.log(`Starting bot in POLLING mode`);
}

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Bot is running!');
});

// Store user data (load from file if exists)
let users = {};
let tasksData = {};

// Load data from file if exists
try {
  if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    console.log('Users data loaded from file');
  }
  
  if (fs.existsSync(TASKS_FILE)) {
    tasksData = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
    console.log('Tasks data loaded from file');
  }
} catch (error) {
  console.error('Error loading data from files:', error);
}

// Save data to files periodically
const saveInterval = setInterval(() => {
  saveDataToFiles();
}, 5 * 60 * 1000);

// Handle process exit to save data
process.on('SIGINT', () => {
  console.log('Saving data before exit...');
  saveDataToFiles();
  clearInterval(saveInterval);
  process.exit(0);
});

// Save data to files
function saveDataToFiles() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasksData, null, 2));
    console.log('Data saved to files');
  } catch (error) {
    console.error('Error saving data to files:', error);
  }
}

// Static predefined tasks
const staticTasks = [
  { text: "Прыгни 10 раз", emoji: "🏃", category: "физические" },
  { text: "Сделай 5 приседаний", emoji: "🏋️", category: "физические" },
  { text: "Спой любимую песню", emoji: "🎤", category: "творческие" },
  { text: "Изобрази любимое животное", emoji: "🐵", category: "развлечения" },
  { text: "Нарисуй смешной рисунок", emoji: "🎨", category: "творческие" },
  { text: "Сделай 3 отжимания", emoji: "💪", category: "физические" },
  { text: "Рассмеши друга", emoji: "😂", category: "развлечения" },
  { text: "Расскажи стихотворение", emoji: "📝", category: "творческие" },
  { text: "Станцуй 30 секунд", emoji: "💃", category: "физические" },
  { text: "Сделай 20 прыжков со скакалкой", emoji: "🤸", category: "физические" }
];

// Predefined image descriptions
const predefinedDescriptions = [
  { text: "Сделай такую же позу как на фото", category: "повторение" },
  { text: "Повтори этот трюк", category: "физические" },
  { text: "Сделай такое же выражение лица", category: "развлечения" },
  { text: "Нарисуй то, что изображено на фото", category: "творческие" },
  { text: "Опиши, что происходит на фото, в деталях", category: "интеллектуальные" }
];

// Mini games definitions
const games = [
  {
    name: 'Угадай число',
    play: playGuessNumber,
    description: 'Угадайте число от 1 до 10'
  },
  {
    name: 'Найди безопасную кнопку',
    play: playSafeButton,
    description: 'Найдите безопасную кнопку из трех вариантов'
  },
  {
    name: 'Найди бомбу',
    play: playFindBomb,
    description: 'Найдите бомбу среди кнопок'
  },
  {
    name: 'Камень, ножницы, бумага',
    play: playRockPaperScissors,
    description: 'Классическая игра Камень-Ножницы-Бумага'
  },
  {
    name: 'Математическая задача',
    play: playMathProblem,
    description: 'Решите простую математическую задачу'
  }
];

// Initialize user data
function initUser(userId) {
  if (!users[userId]) {
    users[userId] = {
      authorized: false,
      score: 0,
      currentGame: null,
      gamesPlayed: {},
      gamesWon: {},
      awaitingCommand: false
    };
  }
  
  if (!tasksData[userId]) {
    tasksData[userId] = [];
  }
  
  saveDataToFiles();
}

// Start command handler
bot.onText(/\/start/, (msg) => {
  const userId = msg.from.id;
  initUser(userId);
  
  users[userId].isWaitingForTaskDescription = false;
  users[userId].tempTask = null;
  users[userId].awaitingCommand = false;
  
  if (users[userId].authorized) {
    bot.sendMessage(userId, 'Вы уже авторизованы! Выберите команду из меню или начните новую игру с /play.');
  } else {
    bot.sendMessage(userId, 'Добро пожаловать! Введите код доступа:');
  }
});

// Play command to start games
bot.onText(/\/play/, (msg) => {
  const userId = msg.from.id;
  initUser(userId);
  
  if (!users[userId].authorized) {
    bot.sendMessage(userId, 'Пожалуйста, авторизуйтесь с помощью команды /start');
    return;
  }
  
  startRandomGame(userId);
});

// Authorization handler
bot.on('text', (msg) => {
  const userId = msg.from.id;
  const text = msg.text;
  
  if (text.startsWith('/')) return;
  
  initUser(userId);
  
  if (!users[userId].authorized) {
    if (text === SECRET_CODE) {
      users[userId].authorized = true;
      bot.sendMessage(userId, 'Код верный! Добро пожаловать в игру! 🎮\nИспользуйте /help для получения справки.\nДля начала игры напишите /play');
      saveDataToFiles();
    } else {
      bot.sendMessage(userId, 'Неверный код. Попробуйте еще раз:');
    }
    return;
  }
  
  // Handle game input
  if (users[userId].currentGame) {
    const gameHandler = users[userId].currentGame.handleInput;
    if (gameHandler) {
      gameHandler(userId, text);
    }
    return;
  }
  
  // Other text messages
  bot.sendMessage(userId, 'Используйте команду /play для начала игры или /help для получения справки.');
});

// Help command handler
bot.onText(/\/help/, (msg) => {
  const userId = msg.from.id;
  initUser(userId);
  
  if (!users[userId].authorized) {
    bot.sendMessage(userId, 'Пожалуйста, авторизуйтесь с помощью команды /start');
    return;
  }
  
  const helpText = 
    '📋 *Список команд:*\n' +
    '/play - начать случайную игру\n' +
    '/stats - просмотр статистики\n' +
    '/reset - сбросить счет\n' +
    '/myfiles - список добавленных заданий\n\n' +
    '🎮 *Мини-игры:*\n' + 
    games.map((game, index) => `${index+1}. ${game.name} - ${game.description}`).join('\n');
  
  // Create menu with buttons
  const keyboard = {
    reply_markup: {
      keyboard: [
        [{ text: '📷 Добавить фото' }, { text: '🎬 Добавить видео' }],
        [{ text: '🎲 Играть' }, { text: '📊 Статистика' }]
      ],
      resize_keyboard: true
    }
  };
  
  bot.sendMessage(userId, helpText, { parse_mode: 'Markdown', ...keyboard });
});

// Stats command handler
bot.onText(/\/stats/, (msg) => {
  const userId = msg.from.id;
  initUser(userId);
  
  if (!users[userId].authorized) {
    bot.sendMessage(userId, 'Пожалуйста, авторизуйтесь с помощью команды /start');
    return;
  }
  
  showStatistics(userId);
});

// Reset command handler
bot.onText(/\/reset/, (msg) => {
  const userId = msg.from.id;
  initUser(userId);
  
  if (!users[userId].authorized) {
    bot.sendMessage(userId, 'Пожалуйста, авторизуйтесь с помощью команды /start');
    return;
  }
  
  users[userId].score = 0;
  users[userId].gamesPlayed = {};
  users[userId].gamesWon = {};
  saveDataToFiles();
  
  bot.sendMessage(userId, 'Ваш счет и статистика сброшены до нуля.');
});

// My files command handler
bot.onText(/\/myfiles/, (msg) => {
  const userId = msg.from.id;
  initUser(userId);
  
  if (!users[userId].authorized) {
    bot.sendMessage(userId, 'Пожалуйста, авторизуйтесь с помощью команды /start');
    return;
  }
  
  const userTasks = tasksData[userId] || [];
  
  if (userTasks.length === 0) {
    bot.sendMessage(userId, 'У вас нет добавленных заданий.');
    return;
  }
  
  let message = '📁 *Ваши добавленные задания:*\n\n';
  
  userTasks.forEach((task, index) => {
    const type = task.type === 'photo' ? '📷' : '🎬';
    message += `${index + 1}. ${type} ${task.description || 'Без описания'}\n`;
  });
  
  bot.sendMessage(userId, message, { parse_mode: 'Markdown' });
});

// Handle keyboard buttons
bot.on('message', (msg) => {
  if (!msg.text) return;
  
  const userId = msg.from.id;
  initUser(userId);
  
  if (!users[userId].authorized) return;
  
  switch (msg.text) {
    case '📷 Добавить фото':
      handleAddPhotoRequest(userId);
      break;
    case '🎬 Добавить видео':
      handleAddVideoRequest(userId);
      break;
    case '🎲 Играть':
      startRandomGame(userId);
      break;
    case '📊 Статистика':
      showStatistics(userId);
      break;
  }
});

// Handler for "Add Photo" button
function handleAddPhotoRequest(userId) {
  bot.sendMessage(userId, 'Отправьте фотографию для нового задания.');
  users[userId].awaitingPhoto = true;
  users[userId].awaitingVideo = false;
}

// Handler for "Add Video" button
function handleAddVideoRequest(userId) {
  bot.sendMessage(userId, 'Отправьте видео для нового задания.');
  users[userId].awaitingPhoto = false;
  users[userId].awaitingVideo = true;
}

// Photo handler
bot.on('photo', (msg) => {
  const userId = msg.from.id;
  initUser(userId);
  
  if (!users[userId].authorized) return;
  
  if (users[userId].awaitingPhoto) {
    users[userId].awaitingPhoto = false;
    users[userId].tempTask = {
      type: 'photo',
      fileId: msg.photo[msg.photo.length - 1].file_id
    };
    
    // Select random description from predefined list
    const randomDescription = predefinedDescriptions[Math.floor(Math.random() * predefinedDescriptions.length)];
    users[userId].tempTask.description = `${randomDescription.text} (${randomDescription.category})`;
    
    // Save the task
    tasksData[userId].push(users[userId].tempTask);
    saveDataToFiles();
    
    bot.sendMessage(userId, `✅ Фото добавлено с описанием: "${users[userId].tempTask.description}"`);
    users[userId].tempTask = null;
  }
});

// Video handler
bot.on('video', (msg) => {
  const userId = msg.from.id;
  initUser(userId);
  
  if (!users[userId].authorized) return;
  
  if (users[userId].awaitingVideo) {
    users[userId].awaitingVideo = false;
    users[userId].tempTask = {
      type: 'video',
      fileId: msg.video.file_id
    };
    
    // Select random description from predefined list
    const randomDescription = predefinedDescriptions[Math.floor(Math.random() * predefinedDescriptions.length)];
    users[userId].tempTask.description = `${randomDescription.text} (${randomDescription.category})`;
    
    // Save the task
    tasksData[userId].push(users[userId].tempTask);
    saveDataToFiles();
    
    bot.sendMessage(userId, `✅ Видео добавлено с описанием: "${users[userId].tempTask.description}"`);
    users[userId].tempTask = null;
  }
});

// Display statistics
function showStatistics(userId) {
  const user = users[userId];
  
  let message = '📊 *Ваша статистика:*\n\n';
  message += `🏆 Общий счет: ${user.score}\n\n`;
  
  message += '🎮 *Игры:*\n';
  let totalGames = 0;
  let totalWins = 0;
  
  games.forEach(game => {
    const played = user.gamesPlayed[game.name] || 0;
    const won = user.gamesWon[game.name] || 0;
    totalGames += played;
    totalWins += won;
    
    if (played > 0) {
      const winRate = played > 0 ? Math.round((won / played) * 100) : 0;
      message += `${game.name}: ${won}/${played} (${winRate}% побед)\n`;
    }
  });
  
  if (totalGames === 0) {
    message += 'Вы еще не сыграли ни одной игры.\n';
  } else {
    const totalWinRate = Math.round((totalWins / totalGames) * 100);
    message += `\n📈 Общий процент побед: ${totalWinRate}%\n`;
  }
  
  message += `\n📁 Добавлено заданий: ${tasksData[userId] ? tasksData[userId].length : 0}`;
  
  bot.sendMessage(userId, message, { parse_mode: 'Markdown' });
}

// Start a random game
function startRandomGame(userId) {
  const gameIndex = Math.floor(Math.random() * games.length);
  const game = games[gameIndex];
  
  // Increment the played counter for this game
  users[userId].gamesPlayed[game.name] = (users[userId].gamesPlayed[game.name] || 0) + 1;
  saveDataToFiles();
  
  // Start the game
  game.play(userId);
}

// Handle win
function handleWin(userId) {
  const user = users[userId];
  const gameName = user.currentGame ? user.currentGame.name : 'Неизвестная игра';
  
  // Increment score and win counter
  user.score += 1;
  user.gamesWon[gameName] = (user.gamesWon[gameName] || 0) + 1;
  
  // Clear current game
  user.currentGame = null;
  
  // Save updated data
  saveDataToFiles();
  
  // Send win message with updated score
  bot.sendMessage(userId, `🎉 Поздравляем! Вы выиграли!\n\n🏆 Ваш текущий счет: ${user.score}\n\nНапишите /play, чтобы сыграть снова.`);
}

// Handle loss
function handleLoss(userId) {
  const user = users[userId];
  
  // Clear current game
  user.currentGame = null;
  
  // Choose a task
  let task;
  
  // First check if user has custom tasks
  if (tasksData[userId] && tasksData[userId].length > 0) {
    // 50% chance to get custom task, 50% chance to get static task
    if (Math.random() < 0.5) {
      const randomIndex = Math.floor(Math.random() * tasksData[userId].length);
      task = tasksData[userId][randomIndex];
    }
  }
  
  // If no custom task selected, use static task
  if (!task) {
    const randomIndex = Math.floor(Math.random() * staticTasks.length);
    task = staticTasks[randomIndex];
  }
  
  if (task.type === 'photo') {
    // Send photo task
    bot.sendPhoto(userId, task.fileId, {
      caption: `😢 Вы проиграли! Ваше задание:\n\n${task.description}`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '⏭️ Пропустить задание', callback_data: 'skip_task' }]
        ]
      }
    });
  } else if (task.type === 'video') {
    // Send video task
    bot.sendVideo(userId, task.fileId, {
      caption: `😢 Вы проиграли! Ваше задание:\n\n${task.description}`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '⏭️ Пропустить задание', callback_data: 'skip_task' }]
        ]
      }
    });
  } else {
    // Send text task
    bot.sendMessage(userId, `😢 Вы проиграли! Ваше задание:\n\n${task.emoji} ${task.text}`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '⏭️ Пропустить задание', callback_data: 'skip_task' }]
        ]
      }
    });
  }
  
  saveDataToFiles();
}

// Skip task callback
bot.on('callback_query', (query) => {
  const userId = query.from.id;
  
  if (query.data === 'skip_task') {
    bot.answerCallbackQuery(query.id, { text: 'Задание пропущено!' });
    bot.sendMessage(userId, 'Задание пропущено! Напишите /play, чтобы сыграть снова.');
  }
});

// Game: Guess Number
function playGuessNumber(userId) {
  const correctNumber = Math.floor(Math.random() * 10) + 1;
  
  bot.sendMessage(userId, '🔢 *Угадай число*\n\nЯ загадал число от 1 до 10. Попробуйте угадать!', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '1', callback_data: 'guess_1' },
          { text: '2', callback_data: 'guess_2' },
          { text: '3', callback_data: 'guess_3' },
          { text: '4', callback_data: 'guess_4' },
          { text: '5', callback_data: 'guess_5' }
        ],
        [
          { text: '6', callback_data: 'guess_6' },
          { text: '7', callback_data: 'guess_7' },
          { text: '8', callback_data: 'guess_8' },
          { text: '9', callback_data: 'guess_9' },
          { text: '10', callback_data: 'guess_10' }
        ]
      ]
    }
  });
  
  users[userId].currentGame = {
    name: 'Угадай число',
    correctNumber: correctNumber
  };
  
  // Set up callback handler
  bot.on('callback_query', (query) => {
    const userId = query.from.id;
    const gameData = users[userId].currentGame;
    
    if (!gameData || gameData.name !== 'Угадай число') return;
    
    if (query.data.startsWith('guess_')) {
      const guess = parseInt(query.data.split('_')[1]);
      
      bot.answerCallbackQuery(query.id);
      
      if (guess === gameData.correctNumber) {
        handleWin(userId);
      } else {
        bot.sendMessage(userId, `Неверно! Правильное число было: ${gameData.correctNumber}`);
        handleLoss(userId);
      }
    }
  });
}

// Game: Safe Button
function playSafeButton(userId) {
  const safeButton = Math.floor(Math.random() * 3) + 1;
  
  bot.sendMessage(userId, '💣 *Найди безопасную кнопку*\n\nОдна из кнопок безопасна, остальные - опасны. Выберите правильную!', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '1️⃣', callback_data: 'safe_1' },
          { text: '2️⃣', callback_data: 'safe_2' },
          { text: '3️⃣', callback_data: 'safe_3' }
        ]
      ]
    }
  });
  
  users[userId].currentGame = {
    name: 'Найди безопасную кнопку',
    safeButton: safeButton
  };
  
  // Set up callback handler
  bot.on('callback_query', (query) => {
    const userId = query.from.id;
    const gameData = users[userId].currentGame;
    
    if (!gameData || gameData.name !== 'Найди безопасную кнопку') return;
    
    if (query.data.startsWith('safe_')) {
      const choice = parseInt(query.data.split('_')[1]);
      
      bot.answerCallbackQuery(query.id);
      
      if (choice === gameData.safeButton) {
        handleWin(userId);
      } else {
        bot.sendMessage(userId, `Бум! 💥 Это была опасная кнопка! Безопасной была кнопка ${gameData.safeButton}.`);
        handleLoss(userId);
      }
    }
  });
}

// Game: Find Bomb
function playFindBomb(userId) {
  const bombPosition = Math.floor(Math.random() * 9) + 1;
  
  bot.sendMessage(userId, '💣 *Найди бомбу*\n\nВ одной из ячеек спрятана бомба. Найдите ее!', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '1️⃣', callback_data: 'bomb_1' },
          { text: '2️⃣', callback_data: 'bomb_2' },
          { text: '3️⃣', callback_data: 'bomb_3' }
        ],
        [
          { text: '4️⃣', callback_data: 'bomb_4' },
          { text: '5️⃣', callback_data: 'bomb_5' },
          { text: '6️⃣', callback_data: 'bomb_6' }
        ],
        [
          { text: '7️⃣', callback_data: 'bomb_7' },
          { text: '8️⃣', callback_data: 'bomb_8' },
          { text: '9️⃣', callback_data: 'bomb_9' }
        ]
      ]
    }
  });
  
  users[userId].currentGame = {
    name: 'Найди бомбу',
    bombPosition: bombPosition
  };
  
  // Set up callback handler
  bot.on('callback_query', (query) => {
    const userId = query.from.id;
    const gameData = users[userId].currentGame;
    
    if (!gameData || gameData.name !== 'Найди бомбу') return;
    
    if (query.data.startsWith('bomb_')) {
      const choice = parseInt(query.data.split('_')[1]);
      
      bot.answerCallbackQuery(query.id);
      
      if (choice === gameData.bombPosition) {
        bot.sendMessage(userId, `Бомба найдена! 💣 Поздравляем!`);
        handleWin(userId);
      } else {
        bot.sendMessage(userId, `Мимо! Бомба была в ячейке ${gameData.bombPosition}.`);
        handleLoss(userId);
      }
    }
  });
}

// Game: Rock Paper Scissors
function playRockPaperScissors(userId) {
  bot.sendMessage(userId, '✂️ *Камень, ножницы, бумага*\n\nСделайте ваш выбор!', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '👊 Камень', callback_data: 'rps_rock' },
          { text: '✌️ Ножницы', callback_data: 'rps_scissors' },
          { text: '✋ Бумага', callback_data: 'rps_paper' }
        ]
      ]
    }
  });
  
  users[userId].currentGame = {
    name: 'Камень, ножницы, бумага'
  };
  
  // Set up callback handler
  bot.on('callback_query', (query) => {
    const userId = query.from.id;
    const gameData = users[userId].currentGame;
    
    if (!gameData || gameData.name !== 'Камень, ножницы, бумага') return;
    
    if (query.data.startsWith('rps_')) {
      const playerChoice = query.data.split('_')[1];
      const choices = ['rock', 'paper', 'scissors'];
      const botChoice = choices[Math.floor(Math.random() * 3)];
      
      bot.answerCallbackQuery(query.id);
      
      const playerEmoji = getEmojiForRPS(playerChoice);
      const botEmoji = getEmojiForRPS(botChoice);
      
      const result = determineRPSWinner(playerChoice, botChoice);
      
      bot.sendMessage(userId, `Вы: ${playerEmoji}\nБот: ${botEmoji}\n\n${result}`);
      
      if (result === 'Вы выиграли! 🎉') {
        handleWin(userId);
      } else if (result === 'Вы проиграли! 😢') {
        handleLoss(userId);
      } else {
        // It's a tie, play again
        bot.sendMessage(userId, 'Ничья! Попробуйте еще раз.');
        playRockPaperScissors(userId);
      }
    }
  });
}

function determineRPSWinner(playerChoice, botChoice) {
  if (playerChoice === botChoice) {
    return 'Ничья! 🤝';
  }
  
  if (
    (playerChoice === 'rock' && botChoice === 'scissors') ||
    (playerChoice === 'paper' && botChoice === 'rock') ||
    (playerChoice === 'scissors' && botChoice === 'paper')
  ) {
    return 'Вы выиграли! 🎉';
  } else {
    return 'Вы проиграли! 😢';
  }
}

function getEmojiForRPS(choice) {
  switch (choice) {
    case 'rock': return '👊 Камень';
    case 'paper': return '✋ Бумага';
    case 'scissors': return '✌️ Ножницы';
    default: return choice;
  }
}

// Game: Math Problem
function playMathProblem(userId) {
  const operations = ['+', '-', '*'];
  const operation = operations[Math.floor(Math.random() * operations.length)];
  
  let num1, num2, answer;
  
  switch (operation) {
    case '+':
      num1 = Math.floor(Math.random() * 50) + 1;
      num2 = Math.floor(Math.random() * 50) + 1;
      answer = num1 + num2;
      break;
    case '-':
      num1 = Math.floor(Math.random() * 50) + 51; // Ensure larger number
      num2 = Math.floor(Math.random() * 50) + 1;
      answer = num1 - num2;
      break;
    case '*':
      num1 = Math.floor(Math.random() * 10) + 1;
      num2 = Math.floor(Math.random() * 10) + 1;
      answer = num1 * num2;
      break;
  }
  
  // Generate 3 wrong answers
  let answers = [answer];
  while (answers.length < 4) {
    let wrongAnswer = answer + (Math.floor(Math.random() * 10) - 5); // +/- 5
    if (wrongAnswer !== answer && !answers.includes(wrongAnswer) && wrongAnswer > 0) {
      answers.push(wrongAnswer);
    }
  }
  
  // Shuffle answers
  answers = shuffleArray(answers);
  
  // Create inline keyboard with answers
  const keyboard = [];
  for (let i = 0; i < 4; i += 2) {
    keyboard.push([
      { text: answers[i].toString(), callback_data: `math_${answers[i]}` },
      { text: (i+1 < 4) ? answers[i+1].toString() : "", callback_data: (i+1 < 4) ? `math_${answers[i+1]}` : "math_none" }
    ]);
  }
  
  bot.sendMessage(userId, `🧮 *Математическая задача*\n\nРешите пример: ${num1} ${operation} ${num2} = ?`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: keyboard
    }
  });
  
  users[userId].currentGame = {
    name: 'Математическая задача',
    answer: answer
  };
  
  // Set up callback handler
  bot.on('callback_query', (query) => {
    const userId = query.from.id;
    const gameData = users[userId].currentGame;
    
    if (!gameData || gameData.name !== 'Математическая задача') return;
    
    if (query.data.startsWith('math_')) {
      const userAnswer = parseInt(query.data.split('_')[1]);
      
      bot.answerCallbackQuery(query.id);
      
      if (userAnswer === gameData.answer) {
        handleWin(userId);
      } else {
        bot.sendMessage(userId, `Неверно! Правильный ответ: ${gameData.answer}`);
        handleLoss(userId);
      }
    }
  });
}

// Helper function to shuffle array
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Start server if in production mode
if (IS_PROD) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Webhook URL: ${URL}/bot${BOT_TOKEN}`);
  });
} 