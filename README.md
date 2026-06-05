# Qazaq Generation ITSM & Service Desk

Qazaq Generation - веб-платформа для ITSM и Service Desk. Система помогает регистрировать заявки, назначать исполнителей, контролировать SLA, вести базу знаний, работать с активами, документами, отчетами, уведомлениями и AI-помощником.

## Возможности

- Создание, просмотр, фильтрация, назначение и удаление заявок.
- Массовое удаление заявок для ролей `admin` и `manager`.
- История изменений, комментарии, вложения и SLA по заявкам.
- Оценка сотрудников и KPI: рейтинг исполнителей, продуктивность, своевременность, качество, SLA и время реакции.
- Роли пользователей: `employee`, `agent`, `manager`, `admin`.
- Администрирование пользователей, групп, организаций, правил, справочников, профилей, логов, оборудования, GLPI Inventory и форм.
- База знаний со статьями, категориями и привязкой статей к заявкам.
- Управление активами и оборудованием.
- Уведомления внутри системы, email и push при наличии настроек.
- 2FA через TOTP.
- Документы, отчеты, PPR-планы и видеоконференции.
- AI-помощник: создание заявок из чата, смена статусов, назначение исполнителей, анализ конкретного тикета, RAG по базе знаний и генерация отчетов в файл.

## Стек

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui и Radix UI
- React Router
- TanStack Query
- Recharts

### Backend

- Node.js
- Express
- TypeScript
- PostgreSQL
- Drizzle ORM
- JWT + bcrypt
- TOTP
- Multer
- Nodemailer
- Web Push
- OpenAI-compatible API или Ollama для AI-функций

## Требования

- Node.js 20+
- npm 10+
- PostgreSQL 15+

## Быстрый запуск

### 1. Создать базу данных

```bash
createdb qazaq_generation
```

Если используется другой пользователь PostgreSQL, создайте базу через `psql`:

```bash
psql -U postgres -c "CREATE DATABASE qazaq_generation;"
```

### 2. Настроить backend

```bash
cd server
cp .env.example .env
npm install
npm run db:push
npm run db:seed
npm run dev
```

Backend будет доступен на:

```text
http://localhost:3001
```

Health check:

```text
http://localhost:3001/api/health
```

### 3. Настроить frontend

В другом терминале из корня проекта:

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Frontend будет доступен на:

```text
http://localhost:8080
```

## Переменные окружения

### Frontend

Файл `.env.local` или `.env` в корне проекта:

```env
VITE_API_URL=http://localhost:3001/api
```

Опционально для Jitsi:

```env
VITE_JITSI_DOMAIN=meet.jit.si
VITE_JITSI_JWT=
VITE_USE_JITSI=false
VITE_EMBED_JITSI=true
```

### Backend

Файл `server/.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/qazaq_generation
JWT_SECRET=change-this-secret
JWT_EXPIRES_IN=7d
PORT=3001
FRONTEND_URL=http://localhost:8080
```

AI через Ollama:

```env
OPENAI_BASE_URL=http://127.0.0.1:11434/v1
OPENAI_MODEL=llama3.2
```

AI через OpenAI API:

```env
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-4o-mini
```

Опционально для email:

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@qazaq-generation.kz
```

Опционально для push-уведомлений:

```env
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@qazaq-generation.kz
```

## Тестовые аккаунты

После `npm run db:seed` доступны тестовые пользователи:

| Роль | Email | Пароль |
| --- | --- | --- |
| Admin | `admin@qazaq.gen` | `admin123` |
| Agent | `agent@qazaq.gen` | `agent123` |

## Команды

### Frontend

```bash
npm run dev          # запуск Vite
npm run dev:local    # запуск Vite на 0.0.0.0:8080
npm run build        # production build
npm run preview      # просмотр production build
npm run lint         # eslint
npm run test         # vitest
```

### Backend

```bash
cd server
npm run dev          # dev-сервер
npm run build        # сборка TypeScript
npm run start        # запуск dist/index.js
npm run db:push      # применить схему к БД
npm run db:seed      # заполнить БД тестовыми данными
npm run db:studio    # открыть Drizzle Studio
npm run db:generate  # сгенерировать миграции
npm run db:migrate   # применить миграции
```

## Деплой

Проект готовится как два сервиса:

- backend: Render Web Service + Render PostgreSQL из `render.yaml`;
- frontend: Vercel Static/Vite app из `vercel.json`.

### Backend на Render

1. Запушьте репозиторий в GitHub.
2. В Render откройте **Blueprints** → **New Blueprint Instance** и выберите этот репозиторий.
3. Render прочитает `render.yaml`, создаст:
   - `qazaq-generation-api`;
   - `qazaq-generation-db`.
4. В переменных `qazaq-generation-api` заполните:
   - `FRONTEND_URL` — URL фронтенда после деплоя на Vercel, например `https://your-app.vercel.app`;
   - `OPENAI_API_KEY` — если нужны AI-функции.
5. После первого деплоя проверьте backend health check:

```text
https://qazaq-generation-api.onrender.com/api/health
```

Если нужен seed для тестовых пользователей, выполните в Render Shell:

```bash
npm run db:seed
```

### Frontend на Vercel

1. В Vercel импортируйте этот GitHub-репозиторий.
2. Vercel прочитает `vercel.json`; настройки:
   - Framework: `Vite`;
   - Build Command: `npm run build`;
   - Output Directory: `dist`.
3. Добавьте переменную окружения:

```env
VITE_API_URL=https://qazaq-generation-api.onrender.com/api
```

4. После деплоя скопируйте Vercel URL и укажите его в Render как `FRONTEND_URL`.

## Структура проекта

```text
.
├── src/                     # Frontend
│   ├── components/          # UI-компоненты
│   ├── contexts/            # React-контексты
│   ├── hooks/               # React-хуки
│   ├── lib/                 # API-клиент и утилиты
│   └── pages/               # Страницы приложения
│
├── server/                  # Backend
│   └── src/
│       ├── db/              # Drizzle schema, seed, connection
│       ├── middleware/      # Auth middleware
│       ├── routes/          # API routes
│       └── services/        # Уведомления и сервисная логика
│
├── public/                  # Статические файлы
└── README.md
```

## Основные API

| Метод | Путь | Назначение |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Вход |
| `POST` | `/api/auth/register` | Регистрация |
| `GET` | `/api/auth/me` | Текущий пользователь |
| `POST` | `/api/auth/setup-2fa` | Настройка 2FA |
| `POST` | `/api/auth/verify-2fa` | Подтверждение 2FA |
| `GET` | `/api/tickets` | Список заявок |
| `POST` | `/api/tickets` | Создать заявку |
| `GET` | `/api/tickets/:id` | Детали заявки |
| `PATCH` | `/api/tickets/:id` | Обновить заявку |
| `DELETE` | `/api/tickets/:id` | Удалить заявку |
| `DELETE` | `/api/tickets` | Массово удалить заявки |
| `POST` | `/api/tickets/:id/comments` | Добавить комментарий |
| `POST` | `/api/tickets/:id/attachments` | Загрузить вложение |
| `GET` | `/api/profiles` | Профили |
| `GET` | `/api/categories` | Категории |
| `GET` | `/api/departments` | Отделы |
| `GET` | `/api/groups` | Группы |
| `GET` | `/api/sla-policies` | SLA-политики |
| `GET` | `/api/performance-kpi` | Расчёт KPI сотрудников |
| `GET` | `/api/kb/articles` | Статьи базы знаний |
| `POST` | `/api/kb/articles` | Создать статью базы знаний |
| `POST` | `/api/ai-chat` | Чат с AI |
| `POST` | `/api/ai-chat/agent` | AI-действия с заявками |
| `POST` | `/api/ai-chat/tickets/:id/analyze` | AI-анализ тикета |
| `POST` | `/api/ai-chat/reports/file` | AI-отчет файлом |

## AI-функции

AI-помощник использует OpenAI-compatible API. Можно подключить OpenAI или локальный Ollama.

Примеры команд в чате:

```text
Создай тикет: не работает принтер, приоритет высокий
Назначь тикет 4f8... на user@example.com
Измени статус тикета 4f8... на resolved
```

В карточке заявки есть кнопка `AI анализ`, которая анализирует конкретный тикет. При ответах AI подтягивает релевантные статьи из базы знаний.

## Роли и доступ

| Роль | Возможности |
| --- | --- |
| `employee` | Создание и просмотр своих заявок, комментарии, база знаний |
| `agent` | Обработка заявок, комментарии, назначение, база знаний |
| `manager` | Управление заявками, массовое удаление, отчеты, администрирование |
| `admin` | Полный доступ к системе |

## Проверка перед сдачей

```bash
npm run build
cd server
npm run build
```

Если backend-сборка падает на TypeScript-ошибках вида `req.params.id: string | string[]`, это связано с типами Express 5 и старыми роутами. Фронтенд при этом собирается отдельно через `npm run build`.

## Лицензия

Проект разработан для учебного и демонстрационного использования.
