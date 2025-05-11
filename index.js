const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const express = require('express');

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
const URL = process.env.URL || 'https://your-app-url.vercel.app';

// Express server for webhook
const app = express();
app.use(express.json());

// Initialize bot with webhook
const bot = new TelegramBot(BOT_TOKEN, {
  webHook: {
    port: PORT
  }
});

// Set webhook
bot.setWebHook(`${URL}/bot${BOT_TOKEN}`);

// Webhook endpoint
app.post(`/bot${BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

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
setInterval(() => {
  saveDataToFiles();
}, 5 * 60 * 1000);

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
  }
});

// Score command
bot.onText(/\/score/, (msg) => {
  const userId = msg.from.id;
  initUser(userId);
  
  if (!users[userId].authorized) {
    bot.sendMessage(userId, 'Пожалуйста, авторизуйтесь с помощью команды /start');
    return;
  }
  
  bot.sendMessage(userId, `Ваш текущий счет: ${users[userId].score} очков`);
});

// Help command
bot.onText(/\/help/, (msg) => {
  const userId = msg.from.id;
  initUser(userId);
  
  if (!users[userId].authorized) {
    bot.sendMessage(userId, 'Пожалуйста, авторизуйтесь с помощью команды /start');
    return;
  }
  
  let helpText = 'Доступные команды:\n';
  helpText += '/start - запуск и ввод кода\n';
  helpText += '/play - начать новую игру\n';
  helpText += '/score - текущий счет\n';
  helpText += '/help - эта справка\n';
  helpText += '/menu - меню с кнопкой добавления задания\n';
  helpText += '/reset - сброс счета\n';
  helpText += '/myfiles - список добавленных заданий\n\n';
  
  helpText += 'Доступные игры:\n';
  games.forEach(game => {
    helpText += `- ${game.name}: ${game.description}\n`;
  });
  
  bot.sendMessage(userId, helpText);
});

// Reset command
bot.onText(/\/reset/, (msg) => {
  const userId = msg.from.id;
  initUser(userId);
  
  if (!users[userId].authorized) {
    bot.sendMessage(userId, 'Пожалуйста, авторизуйтесь с помощью команды /start');
    return;
  }
  
  users[userId].score = 0;
  bot.sendMessage(userId, 'Ваш счет сброшен до 0.');
  saveDataToFiles();
});

// Menu command with task categories
bot.onText(/\/menu/, (msg) => {
  const userId = msg.from.id;
  initUser(userId);
  
  if (!users[userId].authorized) {
    bot.sendMessage(userId, 'Пожалуйста, авторизуйтесь с помощью команды /start');
    return;
  }
  
  const keyboard = {
    reply_markup: {
      keyboard: [
        ['📷 Добавить фото'],
        ['🎬 Добавить видео'],
        ['🎲 Играть'],
        ['📊 Статистика']
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    }
  };
  
  bot.sendMessage(userId, 'Главное меню:', keyboard);
});

// My files command
bot.onText(/\/myfiles/, (msg) => {
  const userId = msg.from.id;
  initUser(userId);
  
  if (!users[userId].authorized) {
    bot.sendMessage(userId, 'Пожалуйста, авторизуйтесь с помощью команды /start');
    return;
  }
  
  if (tasksData[userId].length === 0) {
    bot.sendMessage(userId, 'У вас нет добавленных заданий.');
    return;
  }
  
  let message = 'Ваши добавленные задания:\n';
  tasksData[userId].forEach((task, index) => {
    const descriptionPreview = task.description 
      ? (task.description.length > 30 ? task.description.substring(0, 30) + '...' : task.description)
      : 'Без описания';
    
    message += `${index + 1}. ${descriptionPreview} (${task.type})\n`;
  });
  
  bot.sendMessage(userId, message);
});

// Handle menu buttons
bot.on('text', (msg) => {
  const userId = msg.from.id;
  const text = msg.text;
  
  initUser(userId);
  
  if (!users[userId].authorized) return;
  
  if (text === '📷 Добавить фото') {
    bot.sendMessage(userId, 'Отправьте фото, которое будет использоваться как задание.');
  } 
  else if (text === '🎬 Добавить видео') {
    bot.sendMessage(userId, 'Отправьте видео, которое будет использоваться как задание.');
  }
  else if (text === '🎲 Играть') {
    startRandomGame(userId);
  }
  else if (text === '📊 Статистика') {
    showStatistics(userId);
  }
});

// Handle photo upload
bot.on('photo', (msg) => {
  const userId = msg.from.id;
  initUser(userId);
  
  if (!users[userId].authorized) return;
  
  const fileId = msg.photo[msg.photo.length - 1].file_id;
  const randomDescription = predefinedDescriptions[Math.floor(Math.random() * predefinedDescriptions.length)];
  
  tasksData[userId].push({ 
    file_id: fileId, 
    type: 'photo',
    description: randomDescription.text,
    category: randomDescription.category
  });
  
  saveDataToFiles();
  
  bot.sendMessage(userId, `Фото сохранено с заданием: "${randomDescription.text}" ✅`);
});

// Handle video upload
bot.on('video', (msg) => {
  const userId = msg.from.id;
  initUser(userId);
  
  if (!users[userId].authorized) return;
  
  const fileId = msg.video.file_id;
  const randomDescription = predefinedDescriptions[Math.floor(Math.random() * predefinedDescriptions.length)];
  
  tasksData[userId].push({ 
    file_id: fileId, 
    type: 'video',
    description: randomDescription.text,
    category: randomDescription.category
  });
  
  saveDataToFiles();
  
  bot.sendMessage(userId, `Видео сохранено с заданием: "${randomDescription.text}" ✅`);
});

// Start a random game
function startRandomGame(userId) {
  const randomGame = games[Math.floor(Math.random() * games.length)];
  users[userId].currentGame = randomGame.name;
  
  if (!users[userId].gamesPlayed) {
    users[userId].gamesPlayed = {};
  }
  
  users[userId].gamesPlayed[randomGame.name] = (users[userId].gamesPlayed[randomGame.name] || 0) + 1;
  
  saveDataToFiles();
  
  randomGame.play(userId);
}

// Show user statistics
function showStatistics(userId) {
  const userStats = users[userId];
  const tasksCount = tasksData[userId] ? tasksData[userId].length : 0;
  
  let statsMessage = `📊 *Ваша статистика:*\n\n`;
  statsMessage += `🏆 Очки: ${userStats.score}\n`;
  statsMessage += `🎮 Заданий добавлено: ${tasksCount}\n`;
  
  if (userStats.gamesPlayed) {
    statsMessage += `\n🎯 *Сыгранные игры:*\n`;
    
    const gameStats = {};
    for (const game of Object.keys(userStats.gamesPlayed)) {
      gameStats[game] = {
        played: userStats.gamesPlayed[game],
        wins: userStats.gamesWon && userStats.gamesWon[game] ? userStats.gamesWon[game] : 0
      };
      
      statsMessage += `${game}: ${gameStats[game].wins}/${gameStats[game].played} побед\n`;
    }
  }
  
  bot.sendMessage(userId, statsMessage, { parse_mode: 'Markdown' });
}

// Handle game win
function handleWin(userId) {
  users[userId].score += 1;
  
  if (!users[userId].gamesWon) {
    users[userId].gamesWon = {};
  }
  
  const currentGame = users[userId].currentGame;
  if (currentGame) {
    users[userId].gamesWon[currentGame] = (users[userId].gamesWon[currentGame] || 0) + 1;
  }
  
  bot.sendMessage(userId, `Молодец! 🎉 Ты победил!\nТвой счет: ${users[userId].score}`);
  
  saveDataToFiles();
  
  setTimeout(() => {
    bot.sendMessage(userId, 'Начинаем новую игру! Для выхода в меню напишите /menu');
    startRandomGame(userId);
  }, 2000);
}

// Handle game loss
function handleLoss(userId) {
  const randomStaticTask = staticTasks[Math.floor(Math.random() * staticTasks.length)];
  
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Я выполнил задание ✅', callback_data: 'task_completed' }],
        [{ text: 'Пропустить ⏭️', callback_data: 'task_skip' }]
      ]
    }
  };
  
  bot.sendMessage(
    userId, 
    `Проиграл! 😢 Теперь выполни это задание:\n\n${randomStaticTask.emoji} ${randomStaticTask.text}`,
    keyboard
  );
}

// Handle task completion
bot.on('callback_query', (query) => {
  const userId = query.from.id;
  const data = query.data;
  
  if (data === 'task_completed') {
    bot.answerCallbackQuery(query.id, { text: 'Отлично! Задание выполнено!' });
    bot.sendMessage(userId, 'Хорошо! Продолжаем игру.');
    
    setTimeout(() => {
      bot.sendMessage(userId, 'Начинаем новую игру! Для выхода в меню напишите /menu');
      startRandomGame(userId);
    }, 1000);
  }
  else if (data === 'task_skip') {
    bot.answerCallbackQuery(query.id, { text: 'Задание пропущено' });
    bot.sendMessage(userId, 'Задание пропущено. Продолжаем игру.');
    
    setTimeout(() => {
      bot.sendMessage(userId, 'Начинаем новую игру! Для выхода в меню напишите /menu');
      startRandomGame(userId);
    }, 1000);
  }
});

// Game: Guess Number
function playGuessNumber(userId) {
  const correctNumber = Math.floor(Math.random() * 10) + 1;
  users[userId].gameData = { correctNumber };
  
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [1, 2, 3, 4, 5].map(num => ({ text: num.toString(), callback_data: `guess_${num}` })),
        [6, 7, 8, 9, 10].map(num => ({ text: num.toString(), callback_data: `guess_${num}` }))
      ]
    }
  };
  
  bot.sendMessage(userId, 'Угадай число от 1 до 10:', keyboard);
}

// Game: Safe Button
function playSafeButton(userId) {
  const safeButton = Math.floor(Math.random() * 3) + 1;
  users[userId].gameData = { safeButton };
  
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [1, 2, 3].map(num => ({ text: `Кнопка ${num}`, callback_data: `button_${num}` }))
      ]
    }
  };
  
  bot.sendMessage(userId, 'Найдите безопасную кнопку из трех вариантов:', keyboard);
}

// Game: Find Bomb
function playFindBomb(userId) {
  const bombIndex = Math.floor(Math.random() * 6);
  users[userId].gameData = { bombIndex };
  
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [0, 1, 2].map(idx => ({ text: '❓', callback_data: `bomb_${idx}` })),
        [3, 4, 5].map(idx => ({ text: '❓', callback_data: `bomb_${idx}` }))
      ]
    }
  };
  
  bot.sendMessage(userId, 'Найди бомбу! Выбери ячейку:', keyboard);
}

// Game: Rock-Paper-Scissors
function playRockPaperScissors(userId) {
  users[userId].gameData = {};
  
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✊ Камень', callback_data: 'rps_rock' },
          { text: '✂️ Ножницы', callback_data: 'rps_scissors' },
          { text: '📄 Бумага', callback_data: 'rps_paper' }
        ]
      ]
    }
  };
  
  bot.sendMessage(userId, 'Камень, ножницы или бумага?', keyboard);
}

// Game: Math Problem
function playMathProblem(userId) {
  const operations = ['+', '-', '*'];
  const operation = operations[Math.floor(Math.random() * operations.length)];
  
  let num1, num2, correctAnswer;
  
  switch(operation) {
    case '+':
      num1 = Math.floor(Math.random() * 50) + 1;
      num2 = Math.floor(Math.random() * 50) + 1;
      correctAnswer = num1 + num2;
      break;
    case '-':
      num1 = Math.floor(Math.random() * 50) + 26;
      num2 = Math.floor(Math.random() * 25) + 1;
      correctAnswer = num1 - num2;
      break;
    case '*':
      num1 = Math.floor(Math.random() * 10) + 1;
      num2 = Math.floor(Math.random() * 10) + 1;
      correctAnswer = num1 * num2;
      break;
  }
  
  users[userId].gameData = { correctAnswer };
  
  const options = [correctAnswer];
  while(options.length < 4) {
    const wrongAnswer = correctAnswer + (Math.floor(Math.random() * 10) - 5);
    if (wrongAnswer !== correctAnswer && !options.includes(wrongAnswer) && wrongAnswer > 0) {
      options.push(wrongAnswer);
    }
  }
  
  const shuffledOptions = options.sort(() => Math.random() - 0.5);
  
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        shuffledOptions.slice(0, 2).map(num => ({ text: num.toString(), callback_data: `math_${num}` })),
        shuffledOptions.slice(2, 4).map(num => ({ text: num.toString(), callback_data: `math_${num}` }))
      ]
    }
  };
  
  bot.sendMessage(userId, `Решите: ${num1} ${operation} ${num2} = ?`, keyboard);
}

// Helper function for RPS
function getEmojiForRPS(choice) {
  switch(choice) {
    case 'rock': return '✊ Камень';
    case 'paper': return '📄 Бумага';
    case 'scissors': return '✂️ Ножницы';
    default: return choice;
  }
}

// Handle game callbacks
bot.on('callback_query', (query) => {
  const userId = query.from.id;
  const data = query.data;
  
  if (!users[userId] || !users[userId].authorized) {
    bot.answerCallbackQuery(query.id, { text: 'Сначала авторизуйтесь!' });
    return;
  }
  
  if (data.startsWith('guess_')) {
    const guess = parseInt(data.split('_')[1]);
    const correct = users[userId].gameData.correctNumber;
    
    bot.answerCallbackQuery(query.id);
    
    if (guess === correct) {
      handleWin(userId);
    } else {
      bot.sendMessage(userId, `Неверно! Правильный ответ: ${correct}`);
      handleLoss(userId);
    }
  }
  
  else if (data.startsWith('button_')) {
    const choice = parseInt(data.split('_')[1]);
    const safe = users[userId].gameData.safeButton;
    
    bot.answerCallbackQuery(query.id);
    
    if (choice === safe) {
      handleWin(userId);
    } else {
      bot.sendMessage(userId, `Неверно! Безопасная кнопка была: ${safe}`);
      handleLoss(userId);
    }
  }
  
  else if (data.startsWith('bomb_')) {
    const choice = parseInt(data.split('_')[1]);
    const bomb = users[userId].gameData.bombIndex;
    
    bot.answerCallbackQuery(query.id);
    
    if (choice === bomb) {
      bot.sendMessage(userId, 'Бомба найдена! 💣');
      handleWin(userId);
    } else {
      bot.sendMessage(userId, 'Бомба не найдена! 💥');
      handleLoss(userId);
    }
  }
  
  else if (data.startsWith('rps_')) {
    const userChoice = data.split('_')[1];
    const options = ['rock', 'paper', 'scissors'];
    const botChoice = options[Math.floor(Math.random() * options.length)];
    
    bot.answerCallbackQuery(query.id);
    
    let resultMessage = `Ты выбрал: ${getEmojiForRPS(userChoice)}, Я выбрал: ${getEmojiForRPS(botChoice)}. `;
    
    if (
      (userChoice === 'rock' && botChoice === 'scissors') ||
      (userChoice === 'scissors' && botChoice === 'paper') ||
      (userChoice === 'paper' && botChoice === 'rock')
    ) {
      resultMessage += 'Ты победил!';
      bot.sendMessage(userId, resultMessage);
      handleWin(userId);
    } else if (userChoice === botChoice) {
      resultMessage += 'Ничья! Попробуй еще раз.';
      bot.sendMessage(userId, resultMessage);
      setTimeout(() => {
        playRockPaperScissors(userId);
      }, 1000);
    } else {
      resultMessage += 'Я победил!';
      bot.sendMessage(userId, resultMessage);
      handleLoss(userId);
    }
  }
  
  else if (data.startsWith('math_')) {
    const answer = parseInt(data.split('_')[1]);
    const correct = users[userId].gameData.correctAnswer;
    
    bot.answerCallbackQuery(query.id);
    
    if (answer === correct) {
      bot.sendMessage(userId, `Верно! ${correct} - правильный ответ!`);
      handleWin(userId);
    } else {
      bot.sendMessage(userId, `Неверно! Правильный ответ: ${correct}`);
      handleLoss(userId);
    }
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Webhook URL: ${URL}/bot${BOT_TOKEN}`);
}); 