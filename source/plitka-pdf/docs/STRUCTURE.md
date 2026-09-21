# Structure

```txt
plitka-pdf/
  src/
    admin/
      analytics/
    analytics/
    app/
      App.tsx
      projectContactOperations.ts
      projectDesignOperations.ts
      projectHistory.ts
      projectPageOperations.ts
    components/
    data/
    landing/
    legal/
    styles/
    test/
    types/
    utils/
    main.tsx
  public/
    api/
    brand/
    landing/
    placeholders/
  docs/
    README.md
    STRUCTURE.md
    DEPLOY.md
    CHECKLIST.md
    CHANGELOG.md
    REFERENCE_PILOT_2026-06-12.md
    reference-pilot-2026-06-12.json
  app/
    index.html
  admin/
    analytics/
      index.html
  privacy/
    index.html
  terms/
    index.html
  index.html
  package.json
  package-lock.json
  vite.config.ts
  vitest.config.ts
  eslint.config.js
```

## File Classes

- `runtime source` — `src/`, `public/`, HTML-входы, конфиги и lockfile.
- `project docs` — актуальные документы в `docs/`, включая исследовательские материалы по референсам.
- `external archive` — старые ТЗ, промежуточные выгрузки, zip-архивы, PNG-референсы, browser-profile экспорты и прочие исторические материалы вне рабочей папки.

## Main Editing Areas

- `src/app/` — прикладная логика проекта: страницы, история, дизайн, контакты.
- `src/components/` — интерфейсные блоки редактора и библиотек.
- `src/data/` — шаблоны, тексты, схемы документов и встроенные данные.
- `src/styles/` — тема, layout и стили модальных/служебных экранов.
- `src/landing/` — публичный лендинг.
- `src/legal/` — legal-страницы.
- `src/admin/analytics/` и `public/api/admin/analytics/` — аналитический раздел.
- `docs/` — документация по продукту, аналитике и исследовательским материалам.

## Storage Policy

- Всё, что можно пересоздать командой `npm install`, `npm run build` или тестовым прогоном, не хранится как постоянная часть проекта.
- Всё, что не нужно для запуска, сборки, тестов или текущей продуктовой работы, переносится во внешний архив.
- Исследовательские документы, которые влияют на развитие библиотеки шаблонов, остаются внутри `docs/`.
