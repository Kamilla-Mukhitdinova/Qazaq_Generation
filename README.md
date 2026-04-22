# Qazaq Generation

ITSM & Service Desk платформа.

## Технологии

### Frontend
- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- React Router

### Backend
- Express.js
- Drizzle ORM + PostgreSQL
- JWT + bcrypt (аутентификация)
- TOTP (двухфакторная аутентификация)

## Быстрый старт

Подробная инструкция: [LOCAL_SETUP.md](./LOCAL_SETUP.md)

```bash
# 1. БД
createdb qazaq_generation

# 2. Backend
cd server && cp .env.example .env && npm install
npm run db:push && npm run db:seed && npm run dev

# 3. Frontend (другой терминал)
cp .env.local.example .env.local && npm install && npm run dev
```

Тестовые аккаунты:
- Админ: admin@qazaq.gen / admin123
- Агент: agent@qazaq.gen / agent123

# Liya bro for u
# Qazaq Generation - полный локальный запуск 

Проект запускается локально: frontend (Vite/React) + backend (Express/Drizzle) + PostgreSQL.

## 1) Требования

- **Node.js 20+**
- **npm 10+**
- **PostgreSQL 15+** (установленный локально)

### Установка PostgreSQL

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```


## 2) Настройка базы данных

```bash
# Создать базу данных
createdb qazaq_generation

# Или через psql:
psql -U postgres -c "CREATE DATABASE qazaq_generation;"
```

## 3) Настройка backend

```bash
cd server
cp .env.example .env
npm install
```

 `server/.env`:
```env
DATABASE_URL=postgresql://postgres:kamilla@localhost:5432/qazaq_generation
JWT_SECRET=
JWT_EXPIRES_IN=7d
PORT=3001
FRONTEND_URL=http://localhost:8080
```

### Применить схему к БД

```bash
npm run db:push
```

### Заполнить тестовыми данными

```bash
npm run db:seed
```

Тестовые аккаунты:
- **Админ:** admin@qazaq.gen / admin123
- **Агент:** agent@qazaq.gen / agent123

### Запуск backend

```bash
npm run dev
```

Backend доступен: `http://localhost:3001`
Health check: `http://localhost:3001/api/health`

## 4) Настройка frontend

В корне проекта:

```bash
cp .env.local.example .env.local
npm install
```

`.env.local` содержит:
```env
VITE_API_URL=http://localhost:3001/api
```

### Запуск frontend

```bash
npm run dev
```

Frontend доступен: `http://localhost:8080`

## 5) Полезные команды

### Backend
```bash
cd server
npm run dev          # Запуск в dev-режиме (с hot-reload)
npm run db:push      # Применить схему
npm run db:seed      # Заполнить тестовыми данными
npm run db:studio    # Открыть Drizzle Studio (GUI для БД)
npm run db:generate  # Сгенерировать миграции
npm run db:migrate   # Применить миграции
```

### Frontend
```bash
npm run dev          # Dev server
npm run build        # Production build
```

## 6) Структура проекта

```
/                     - Frontend (Vite + React)
/server/              - Backend (Express + Drizzle)
  /src/
    index.ts          - Entry point
    /db/
      schema.ts       - Drizzle schema (все таблицы)
      index.ts        - DB connection
      seed.ts         - Seed data
    /routes/
      auth.ts         - Аутентификация (JWT + bcrypt + TOTP)
      tickets.ts      - CRUD тикетов
      profiles.ts     - Профили и роли
      crud.ts         - Категории, отделы, SLA и т.д.
    /middleware/
      auth.ts         - JWT middleware
```

## 7) Минимальный порядок запуска

```bash
# 1. Создать БД
createdb qazaq_generation

# 2. Backend
cd server
cp .env.example .env
npm install
npm run db:push
npm run db:seed
npm run dev

# 3. Frontend (в другом терминале)
cd ..
cp .env.local.example .env.local
npm install
npm run dev
```

## 8) API Endpoints

| Метод  | Путь                         | Описание                    |
|--------|------------------------------|-----------------------------|
| POST   | /api/auth/register           | Регистрация                 |
| POST   | /api/auth/login              | Вход                        |
| POST   | /api/auth/verify-2fa         | Верификация 2FA             |
| GET    | /api/auth/me                 | Текущий пользователь        |
| POST   | /api/auth/setup-2fa          | Настройка TOTP              |
| POST   | /api/auth/confirm-2fa        | Подтверждение TOTP          |
| GET    | /api/tickets                 | Список тикетов              |
| POST   | /api/tickets                 | Создать тикет               |
| GET    | /api/tickets/:id             | Детали тикета               |
| PATCH  | /api/tickets/:id             | Обновить тикет              |
| POST   | /api/tickets/:id/comments    | Добавить комментарий        |
| GET    | /api/profiles                | Все профили                 |
| PATCH  | /api/profiles/me             | Обновить свой профиль       |
| GET    | /api/categories              | Категории                   |
| GET    | /api/departments             | Отделы                      |
| GET    | /api/groups                  | Группы                      |
| GET    | /api/sla-policies            | SLA политики                |
| GET    | /api/notifications           | Уведомления                 |
| GET    | /api/ppr-plans               | ППР планы                   |
| GET    | /api/reports                 | Отчёты                      |
| GET    | /api/performance-scores      | Оценки производительности   |
| POST   | /api/documents/send          | Отправить документ (multipart) |
| GET    | /api/documents/received      | Полученные документы        |
| GET    | /api/documents/sent          | Отправленные документы      |
| GET    | /api/documents/:id/download  | Скачать документ            |
| PATCH  | /api/documents/:id/read      | Отметить прочитанным        |
| DELETE | /api/documents/:id           | Удалить документ            |
| GET    | /api/kb/categories           | Категории базы знаний       |
| POST   | /api/kb/categories           | Создать категорию (admin)   |
| PATCH  | /api/kb/categories/:id       | Обновить категорию (admin)  |
| DELETE | /api/kb/categories/:id       | Удалить категорию (admin)   |
| GET    | /api/kb/articles             | Статьи (search, categoryId, visibility) |
| GET    | /api/kb/articles/:id         | Статья с автором            |
| POST   | /api/kb/articles             | Создать статью (staff)      |
| PATCH  | /api/kb/articles/:id         | Обновить статью (staff)     |
| DELETE | /api/kb/articles/:id         | Удалить статью (staff)      |
| GET    | /api/kb/tickets/:id/links    | Связи тикет↔статьи         |
| POST   | /api/kb/tickets/:id/links    | Привязать статью (staff)    |
| DELETE | /api/kb/ticket-kb-links/:id  | Отвязать статью (staff)     |
