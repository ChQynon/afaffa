#!/bin/bash

# Инициализация репозитория
git init

# Добавление всех файлов
git add .

# Создание первого коммита
git commit -m "Initial commit: Telegram bot with mini-games ready for Vercel deployment"

# Добавление удаленного репозитория
git remote add origin https://github.com/ChQynon/afaffa.git

# Загрузка на GitHub
git push -u origin master

echo "Репозиторий успешно загружен на GitHub"
echo "Теперь вы можете импортировать его на Vercel для деплоя" 