# План: Деплой на Railway + база Turso + защита паролем

**Статус:** `завершён` (2026-05-29)

**Старт:** 2026-05-29

**Итог:** сайт живёт на https://mitja-crm.vercel.app (Vercel, prod), база — Turso
(`mitja-crm-mcpirita`, данные перенесены), вход закрыт basic auth (логин `dmitry`).
GitHub: https://github.com/mcpirita/mitja-crm (приватный).

**Проблема:** сайт жил только на локальном `next dev` (порт 3002) — падал при закрытии
терминала/VS Code. Нужен постоянный хостинг 24/7 + облачная база (локальный `local.db`
не переживает редеплой).

**Решения (согласовано с Дмитрием):** хостинг — Vercel (Railway free больше не
провизионит сервис, нужен платный план; Turso работает с Vercel так же); база —
Turso (libsql); сайт закрыт basic auth.

---

## Фаза 1 — Код
- [x] `src/middleware.ts` — basic auth (логин/пароль из `BASIC_AUTH_USER`/`BASIC_AUTH_PASS`)
- [x] Проверить продакшн-сборку `next build`
- [x] Закоммитить, создать GitHub repo, запушить

## Фаза 2 — База Turso
- [x] Установить turso CLI, залогиниться
- [x] Создать БД, получить URL + auth token
- [x] Перенести данные из `local.db` (дамп → 89 лидов, 119 событий, 24 сегмента, 9 помещений)

## Фаза 3 — Vercel
- [x] ~~Railway~~ — free-тариф не провизионит сервис, спрыгнули на Vercel
- [x] Установить vercel CLI
- [x] Залогиниться, привязать проект
- [x] Прописать env: `LIBSQL_URL`, `LIBSQL_AUTH_TOKEN`, `ANTHROPIC_API_KEY`, `BASIC_AUTH_USER`, `BASIC_AUTH_PASS`
- [x] Задеплоить (`--prod`) → https://mitja-crm.vercel.app, проверено: 401 без пароля, данные из Turso отдаются

## Осталось вручную (опционально)
- [ ] Подключить GitHub→Vercel в дашборде для авто-деплоя при push (сейчас деплой через `vercel --prod`).
      Нужно добавить GitHub login connection в Vercel-аккаунте.
