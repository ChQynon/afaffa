/**
 * Модуль для работы с базой данных MongoDB
 * Используется для сохранения данных пользователей и заданий в облачной БД
 * Это необходимо для работы на платформе Vercel, где нет постоянной файловой системы
 */

const mongoose = require('mongoose');

// URI для подключения к MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-bot';

// Схема для пользовательских данных
const userSchema = new mongoose.Schema({
  userId: { type: Number, required: true, unique: true },
  authorized: { type: Boolean, default: false },
  score: { type: Number, default: 0 },
  currentGame: { type: String, default: null },
  gamesPlayed: { type: Map, of: Number, default: {} },
  gamesWon: { type: Map, of: Number, default: {} },
  awaitingCommand: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Схема для заданий с изображениями/видео
const taskSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  file_id: { type: String, required: true },
  type: { type: String, enum: ['photo', 'video'], required: true },
  description: { type: String, required: true },
  category: { type: String, default: 'general' },
  createdAt: { type: Date, default: Date.now }
});

// Создание моделей
let User, Task;

// Функция подключения к MongoDB
async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return { User, Task };
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Инициализация моделей
    User = mongoose.models.User || mongoose.model('User', userSchema);
    Task = mongoose.models.Task || mongoose.model('Task', taskSchema);
    
    return { User, Task };
  } catch (error) {
    console.error('MongoDB connection error:', error);
    
    // В случае ошибки подключения, возвращаем null
    // Это позволит приложению продолжать работу с файловой системой
    return { User: null, Task: null };
  }
}

// Получение данных пользователя из MongoDB
async function getUserData(userId) {
  try {
    const { User } = await connectToDatabase();
    
    if (!User) return null;
    
    let user = await User.findOne({ userId });
    
    if (!user) {
      user = new User({ userId });
      await user.save();
    }
    
    return user.toObject();
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
}

// Сохранение данных пользователя в MongoDB
async function saveUserData(userId, userData) {
  try {
    const { User } = await connectToDatabase();
    
    if (!User) return false;
    
    userData.updatedAt = Date.now();
    
    await User.findOneAndUpdate(
      { userId },
      userData,
      { upsert: true, new: true }
    );
    
    return true;
  } catch (error) {
    console.error('Error saving user data:', error);
    return false;
  }
}

// Получение заданий пользователя из MongoDB
async function getUserTasks(userId) {
  try {
    const { Task } = await connectToDatabase();
    
    if (!Task) return [];
    
    const tasks = await Task.find({ userId }).sort({ createdAt: -1 });
    
    return tasks.map(task => task.toObject());
  } catch (error) {
    console.error('Error getting user tasks:', error);
    return [];
  }
}

// Сохранение задания пользователя в MongoDB
async function saveUserTask(userId, taskData) {
  try {
    const { Task } = await connectToDatabase();
    
    if (!Task) return false;
    
    const task = new Task({
      userId,
      ...taskData
    });
    
    await task.save();
    
    return true;
  } catch (error) {
    console.error('Error saving user task:', error);
    return false;
  }
}

module.exports = {
  connectToDatabase,
  getUserData,
  saveUserData,
  getUserTasks,
  saveUserTask
}; 