<?php
declare(strict_types=1);

/*
 * Скопируйте файл в config.php только на окружении разработки/сервера.
 * config.php не коммитится: в нём пароли, адреса интеграций и абсолютный путь
 * к закрытому хранилищу, которое не должно быть доступно из web-root.
 */
return [
    'app' => [
        'environment' => 'development',
        'session_name' => 'tile_tools_session',
        'auth_token_cookie' => 'tile_tools_auth',
        'auth_token_ttl_days' => 30,
        // Папка для PHP-сессий также должна быть недоступна из web-root.
        'session_save_path' => dirname(__DIR__) . '/private/tile-tools-sessions',
        'base_url' => '',
        'storage_root' => dirname(__DIR__) . '/private/tile-tools-storage',
        'max_upload_bytes' => 25 * 1024 * 1024,
        'allowed_image_mimes' => ['image/jpeg', 'image/png', 'image/webp'],
        'deleted_media_retention_days' => 30,
    ],
    'db' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'database' => 'tile_tools',
        'username' => 'change_me',
        'password' => 'change_me',
        'charset' => 'utf8mb4',
    ],
    'integrations' => [
        'visualizer' => 'http://127.0.0.1:8081/index.php',
        'calculator' => '/services/calculator/app/',
        'pdf' => '/services/pdf/app/',
    ],
    'notifications' => [
        'lead_email_to' => '',
        'telegram_bot_token' => '',
        'telegram_chat_id' => '',
    ],
];
