# Аналитика Плитка PDF: настройка PHP/MySQL

Эта аналитика рассчитана на обычный PHP-хостинг: Reg.ru, PHP 8+, MySQL и PHPMyAdmin.

## 1. Создать таблицы

1. Откройте PHPMyAdmin в ISPmanager.
2. Выберите базу данных проекта.
3. Откройте вкладку SQL.
4. Выполните содержимое файла `docs/analytics_schema.sql`.

## 2. Настроить PHP config

После сборки проекта файл `public/api/_analytics_config.example.php` попадет в `dist/api/_analytics_config.example.php`.

На хостинге рядом с ним создайте файл:

```txt
dist/api/_analytics_config.php
```

Содержимое:

```php
<?php
$analyticsConfig = [
  'db_host' => 'localhost',
  'db_name' => 'ИМЯ_БАЗЫ',
  'db_user' => 'ПОЛЬЗОВАТЕЛЬ_БАЗЫ',
  'db_pass' => 'ПАРОЛЬ_БАЗЫ',
  'admin_token' => 'ДЛИННЫЙ_СЛУЧАЙНЫЙ_ТОКЕН'
];
```

Реальный пароль базы и admin token не храните в репозитории и не вставляйте в React-код.

## 3. Проверить endpoints

Публичные endpoints:

- `/api/analytics/event.php`
- `/api/analytics/batch.php`

Закрытые endpoints, нужен заголовок `X-Admin-Token`:

- `/api/admin/analytics/summary.php`
- `/api/admin/analytics/funnel.php`
- `/api/admin/analytics/templates.php`
- `/api/admin/analytics/users.php`
- `/api/admin/analytics/events.php`

Админка находится по адресу:

```txt
/admin/analytics/
```

При первом открытии она попросит admin token и сохранит его только в localStorage браузера администратора.

## 4. Что собирается

Собираются технические и продуктовые события: переходы, открытие редактора, добавление страниц, тип документа, количество страниц, количество изображений, PDF-экспорт, ошибки и клики Vilray.

Не собираются тексты документа, изображения, PDF-файлы, base64-картинки, коммерческие цены и строки таблиц.

