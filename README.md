# 🏭 Warehouse Management System

[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-blue?logo=tailwindcss)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Ready-orange?logo=firebase)](https://firebase.google.com/)
[![Live Demo](https://img.shields.io/badge/Live-Demo-green?logo=vercel)](https://33hpS.github.io/warehouse-management-app)

> Современное веб-приложение для управления складскими запасами, материалами и заказами.

## 🎯 [**Открыть Демо →**](https://33hpS.github.io/warehouse-management-app)

![Warehouse Dashboard](https://via.placeholder.com/800x400/2563eb/ffffff?text=Warehouse+Management+Dashboard)

## ✨ Основные возможности

### 📊 **Интерактивный дашборд**
- Статистика по материалам и заказам
- Предупреждения о низких запасах  
- Карточки с ключевыми метриками
- Автоматические уведомления

### 📦 **Управление материалами**
- Просмотр всех материалов на складе
- Поиск в реальном времени
- Фильтрация по категориям
- Отслеживание минимальных запасов

### 📋 **Система заказов**
- Отслеживание статусов заказов
- История всех операций
- Сортировка по дате создания
- Цветовая индикация статусов

### 🔍 **Дополнительные функции**
- Адаптивный дизайн для всех устройств
- Система push-уведомлений
- Демо-режим с тестовыми данными
- Готовность к интеграции с Firebase

## 🚀 Технологии

- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Backend:** Firebase (Firestore + Authentication)  
- **Icons:** Lucide React
- **Deploy:** GitHub Pages + GitHub Actions
- **Architecture:** Component-based с хуками и контекстом

## 📱 Скриншоты

| Дашборд | Материалы | Заказы |
|---------|-----------|---------|
| ![Dashboard](https://via.placeholder.com/250x150/2563eb/ffffff?text=Dashboard) | ![Materials](https://via.placeholder.com/250x150/059669/ffffff?text=Materials) | ![Orders](https://via.placeholder.com/250x150/dc2626/ffffff?text=Orders) |

## 🎮 Быстрый старт

### 1. Клонирование
\\\ash
git clone https://github.com/33hpS/warehouse-management-app.git
cd warehouse-management-app
\\\

### 2. Установка
\\\ash
npm install
\\\

### 3. Запуск
\\\ash
npm start
\\\

Откройте [http://localhost:3000](http://localhost:3000) - приложение заработает в демо-режиме!

## ⚙️ Настройка для продакшена

### Firebase конфигурация:

1. Создайте проект на [Firebase Console](https://console.firebase.google.com/)
2. Включите **Firestore Database** и **Authentication**  
3. Создайте файл \.env\:

\\\nv
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef123456
\\\

## 🏗️ Архитектура проекта

\\\
src/
├── App.tsx                 # 🏠 Главный компонент
├── index.tsx              # 🚀 Точка входа
├── index.css              # 🎨 Глобальные стили
└── components/            # 📦 Компоненты
    ├── Dashboard/         # 📊 Дашборд
    ├── Materials/         # 📦 Материалы  
    ├── Orders/           # 📋 Заказы
    └── Common/           # 🔧 Общие компоненты
\\\

## 📈 Roadmap

### ✅ Реализовано
- [x] Базовый дашборд с метриками
- [x] Управление материалами
- [x] Просмотр заказов
- [x] Поиск и фильтрация
- [x] Система уведомлений
- [x] Адаптивный дизайн
- [x] Демо данные

### 🔄 В разработке  
- [ ] Создание новых материалов
- [ ] Приемка товаров на склад
- [ ] Создание заказов
- [ ] Экспорт отчетов
- [ ] Многопользовательский режим
- [ ] API интеграции

## 🤝 Вклад в проект

Приветствуются Pull Request'ы! Для крупных изменений:

1. Форкните репозиторий
2. Создайте feature-ветку (\git checkout -b feature/amazing-feature\)
3. Закоммитьте изменения (\git commit -m 'Add amazing feature'\)
4. Push в ветку (\git push origin feature/amazing-feature\)
5. Откройте Pull Request

## 📝 Лицензия

Распространяется под лицензией MIT. Смотрите \LICENSE\ для подробностей.

## 📞 Контакты

**Разработчик:** 33hpS  
**Репозиторий:** [github.com/33hpS/warehouse-management-app](https://github.com/33hpS/warehouse-management-app)  
**Демо:** [Warehouse Management App](https://33hpS.github.io/warehouse-management-app)

---

⭐ **Поставьте звезду, если проект был полезен!** ⭐
