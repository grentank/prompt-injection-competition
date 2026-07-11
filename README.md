# Prompt Injection Competition (PIC)

Платформа для обучения и соревнований по взлому AI-агентов. Каждый участник получает изолированную Docker-песочницу с интернет-магазином и AI-чатом.

## Архитектура

- **master** — оркестратор, auth, admin dashboard, WebSocket
- **sandbox** — Docker-контейнер на участника (Node + SQLite + LangChain agents)
- **client** — React SPA (тёмная тема, Tailwind)

## Быстрый старт (локально)

```bash
# 1. Установить зависимости
cd master && npm install
cd ../sandbox && npm install
cd ../client && npm install

# 2. Настроить env
cp deploy/.env.example master/.env
# Заполнить LLM_PROVIDER_API_KEY

# 3. Собрать sandbox image
docker build -f docker/sandbox.Dockerfile -t pic-sandbox:latest .

# 4. Запустить master
cd master && npm run db:setup && npm run dev

# 5. Запустить client (dev)
cd client && npm run dev
```

Для production: `cd client && npm run build` — сборка попадает в `master/dist`.

## Задания (8 фиксированных)

1. Обход guardrail (Llama Guard 4)
2. Модификация БД
3. Утечка `user_sessions`
4. Удаление БД
5. Indirect injection → покупка
6. XSS в чате
7. Unbounded tool consumption
8. Выполнение кода

## Деплой на сервер

```bash
# На сервере (/root/prompt-injection-competition)
git clone <repo> .
cp deploy/.env.example deploy/.env
# Заполнить секреты и LLM ключ

./deploy/deploy.sh   # или вручную:
docker build -f docker/sandbox.Dockerfile -t pic-sandbox:latest .
docker compose -f deploy/docker-compose.yml up -d --build
./deploy/setup-caddy.sh
./deploy/install-service.sh   # автозапуск после reboot
```

### Автозапуск после reboot сервера

```bash
./deploy/start.sh              # ручной старт (безопасно запускать повторно)
./deploy/install-service.sh    # один раз: systemd unit pic.service
```

Скрипт `start.sh` ждёт Docker и сеть `frontline`, поднимает `pic-master`, чинит Caddy-конфиг и перезапускает упавшие sandbox-контейнеры.


## Ресурсы

- ~150–300 MB RAM на sandbox-контейнер
- Рекомендуется 8+ GB RAM при 10+ одновременных участниках
- Сервер: `135.106.156.210`, домен `temp-frontline-agent.ignorelist.com`

## Учётные записи по умолчанию

- Admin: `admin` / `admin123` (задаётся через `ADMIN_USERNAME` / `ADMIN_PASSWORD`)

## API

- `POST /api/auth/register|login` — участник
- `POST /api/auth/admin/login` — админ
- `GET /api/admin/participants` — статистика
- `WS /ws/admin?token=...` — live events
- `/instance/:id/api/*` — прокси в песочницу
