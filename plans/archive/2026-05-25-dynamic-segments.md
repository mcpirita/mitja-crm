# План: Динамические сегменты (таблица `segments` + создание из UI)

**Статус:** `завершён` (2026-05-25, коммит `5f582a8`)

**Родительский план:** `2026-05-19-mvp-fase-1.md` (приостановлен).
**Старт:** 2026-05-25
**Триггер:** в форме редактирования лида нужна возможность создавать совершенно новый сегмент, а не только выбирать из закрытого enum'а или сваливать в `other`.

---

## Контекст

Сейчас `segment` — закрытый список из 22 значений: zod-enum в [src/lib/schemas/enums.ts](../src/lib/schemas/enums.ts) + `CHECK (segment IN (...))` в [src/lib/db/schema.sql](../src/lib/db/schema.sql) + хардкод цветов в [src/components/leads/SegmentBadge.tsx](../src/components/leads/SegmentBadge.tsx). Чтобы добавить сегмент, надо менять код и перезаливать схему — это блокирует Дмитрия в момент работы с реальными лидами.

Выбран **вариант B**: отдельная таблица `segments(slug PK, label_ru, color, sort_order, is_archived, ...)`. Сегмент становится данными, а не кодом. В палитру цветов жёстко зашиваем 19 Tailwind-цветов (чтобы Tailwind v4 видел классы статически).

---

## Задача

В формах создания и редактирования лида:
- Селект сегмента подгружает список из БД.
- Последний пункт — `➕ Новый сегмент…` → inline-форма (label + color picker из 19 цветов) → POST `/api/segments` → новый сегмент сразу появляется в селекте и выбирается.
- Все остальные места (фильтры на `/leads` и `/today`, бейджи, шаблоны, импорт) подхватывают новые сегменты из БД, а не из захардкоженного списка.

---

## Фазы

### 3.1. Foundation (Wave 1, 1 агент)
- [ ] `src/lib/db/schema.sql` — таблица `segments` + INSERT OR IGNORE 22 текущих сегмента.
- [ ] `scripts/migrate.ts` — идемпотентный rebuild `leads` и `email_templates` (drop CHECK на segment через rename → create new → copy → drop → recreate indexes), запускается только если в `sqlite_master` ещё есть `CHECK (segment IN`.
- [ ] `src/lib/db/segments.ts` — `listSegments`, `getSegment`, `createSegment` (с автогенерацией slug из RU-лейбла через транслит), `updateSegment`, `archiveSegment`.
- [ ] `src/lib/schemas/enums.ts` — `Segment` → `z.string().trim().min(1).max(50)`, `SegmentWithAny` аналогично. `SEGMENT_COLOR_PALETTE` (19 значений) + `SegmentColor`. `SEGMENTS` / `SEGMENT_LABELS_RU` оставляем как seed на время миграции.
- [ ] `src/lib/schemas/segment.ts` — `SegmentRow`, `SegmentCreate`, `SegmentUpdate`.
- [ ] `src/lib/schemas/index.ts` — экспорты.
- [ ] `src/app/api/segments/route.ts` — `GET` (список) + `POST` (создание, 409 при коллизии slug).
- [ ] `npm run migrate` локально, `npm run build` зелёный.

### 3.2. UI форм лида (Wave 2, Agent C)
- [ ] [src/components/leads/LeadEditForm.tsx](../src/components/leads/LeadEditForm.tsx) — селект подгружает `/api/segments`, опция `➕ Новый сегмент…` раскрывает inline-форму с label + color picker.
- [ ] [src/components/leads/LeadCreateForm.tsx](../src/components/leads/LeadCreateForm.tsx) — то же.
- [ ] После создания — оптимистично добавляем в локальный список и выбираем.

### 3.3. UI отображения и фильтров (Wave 2, Agent D)
- [ ] [src/components/leads/SegmentBadge.tsx](../src/components/leads/SegmentBadge.tsx) — принимает `label` + `color` через props, мапа `color → Tailwind classes` хардкодом.
- [ ] [src/components/leads/LeadsListClient.tsx](../src/components/leads/LeadsListClient.tsx), [LeadRow.tsx](../src/components/leads/LeadRow.tsx), [LeadDetail.tsx](../src/components/leads/LeadDetail.tsx) — `segments` пропом.
- [ ] [src/components/today/ActiveLeadsTable.tsx](../src/components/today/ActiveLeadsTable.tsx), [TodayCard.tsx](../src/components/today/TodayCard.tsx) — то же.
- [ ] [src/app/leads/page.tsx](../src/app/leads/page.tsx), [src/app/leads/[id]/page.tsx](../src/app/leads/[id]/page.tsx), [src/app/today/page.tsx](../src/app/today/page.tsx) — server-side `listSegments()` и проброс.

### 3.4. UI шаблонов и импорта (Wave 2, Agent E)
- [ ] [src/components/templates/TemplateForm.tsx](../src/components/templates/TemplateForm.tsx), [TemplateFilters.tsx](../src/components/templates/TemplateFilters.tsx).
- [ ] [src/app/templates/page.tsx](../src/app/templates/page.tsx), [templates/new/page.tsx](../src/app/templates/new/page.tsx), [templates/[id]/page.tsx](../src/app/templates/[id]/page.tsx).
- [ ] [src/components/import/RowPreview.tsx](../src/components/import/RowPreview.tsx).
- [ ] API: [src/app/api/leads/route.ts](../src/app/api/leads/route.ts), [src/app/api/templates/route.ts](../src/app/api/templates/route.ts) — валидация `segment` query param через `z.string()` (а не enum).

### 3.5. Smoke-тест и коммит
- [ ] `npm run migrate` на чистой БД и на текущей.
- [ ] `npm run build` зелёный.
- [ ] Локальный запуск: создать новый сегмент из формы лида, убедиться, что он появляется на `/leads`, в фильтре, на `/today`, в выборе шаблона.
- [ ] Git commit.
- [ ] Снять статус `активный`, вернуть `2026-05-25-import-lumiera.md` в `активный`.

---

## Критерий завершения

- В формах создания и редактирования лида можно создать новый сегмент с любым цветом из палитры в 19 вариантов.
- Новый сегмент сразу появляется во всех местах (бейджи, фильтры, выбор шаблона), цвет и лейбл подхватываются из БД.
- Старый CHECK constraint на `segment` снят, БД-зеркало текущих сегментов лежит в таблице `segments`.

---

## Открытые вопросы

- **UI архивирования сегментов** — пока не делаем, только флаг в БД. Если понадобится — отдельный экран `/segments`.
- **Удаление сегмента** — не делаем (FK от leads/templates запрещает; используем архив).
