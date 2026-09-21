<?php
/* ================================================================
   catalog/functions.php — управление каталогом плитки.
   Источник истины: catalog/tiles.json + catalog/filters.json.
   Доступ ко всем страницам модуля — только администратор.
   Аналитику (analytics/) НЕ затрагивает.
================================================================ */
require_once __DIR__ . '/../auth/functions.php';

/* --- Пути --- */
function cat_root()        { return dirname(__DIR__); }                       // корень проекта
function cat_tiles_file()  { return __DIR__ . '/tiles.json'; }
function cat_filters_file(){ return __DIR__ . '/filters.json'; }
function cat_tiles_dir()   { return cat_root() . '/images/tiles'; }           // папки файлов плиток
function cat_renders_dir() { return cat_root() . '/images/renders'; }         // базовые рендеры R1–R5

/* --- Соответствие ракурс ↔ комната ↔ префикс --- */
function cat_rooms() {
    // Порядок синхронизирован с ROOMS в betavis.js.
    // Префикс следует ПОЗИЦИИ слота (1→R1_, 2→R2_, …). Рендер плитки связан с комнатой
    // по ключу-id (renders[id]), а не по префиксу, поэтому имя файла — лишь подпись.
    return [
        ['id' => 'bathroom_m',  'name' => 'Ванная M',       'prefix' => 'R1_', 'base' => 'images/renders/r1.jpg'],
        ['id' => 'bathroom_xl', 'name' => 'Ванная XL',      'prefix' => 'R2_', 'base' => 'images/renders/r2.jpg'],
        ['id' => 'bathroom_s',  'name' => 'Ванная S',       'prefix' => 'R3_', 'base' => 'images/renders/r3.jpg'],
        ['id' => 'hall',        'name' => 'Зал',            'prefix' => 'R4_', 'base' => 'images/renders/r4.jpg'],
        ['id' => 'kitchen',     'name' => 'Кухня-гостиная', 'prefix' => 'R5_', 'base' => 'images/renders/r5.jpg'],
    ];
}
function cat_filter_keys() { return ['color', 'size', 'surface', 'design']; }

/* ================================================================
   JSON: чтение/запись с блокировкой
================================================================ */
function cat_read_json($file, $default) {
    if (!is_file($file)) return $default;
    $raw = @file_get_contents($file);
    if ($raw === false || $raw === '') return $default;
    $data = json_decode($raw, true);
    return ($data === null && json_last_error() !== JSON_ERROR_NONE) ? $default : $data;
}
function cat_write_json($file, $data) {
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    if ($json === false) return false;
    $fp = @fopen($file, 'c+');
    if (!$fp) return false;
    $ok = false;
    if (flock($fp, LOCK_EX)) {
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, $json);
        fflush($fp);
        flock($fp, LOCK_UN);
        $ok = true;
    }
    fclose($fp);
    return $ok;
}
function cat_load_tiles()   { return cat_read_json(cat_tiles_file(), []); }
function cat_save_tiles($a) { return cat_write_json(cat_tiles_file(), array_values($a)); }
function cat_load_filters() { return cat_read_json(cat_filters_file(), []); }
function cat_save_filters($f){ return cat_write_json(cat_filters_file(), $f); }

/* --- Только реальные плитки (управляются админкой). Демо — не показываем. --- */
function cat_real_tiles($tiles) {
    return array_values(array_filter($tiles, function ($t) {
        return !empty($t['hasRealImg']);
    }));
}
function cat_find_index($tiles, $id) {
    foreach ($tiles as $i => $t) {
        if ((string)($t['id'] ?? '') === (string)$id) return $i;
    }
    return -1;
}

/* ================================================================
   Слаг (имя папки)
================================================================ */
function cat_valid_slug($s) {
    return is_string($s) && preg_match('/^[a-z0-9][a-z0-9-]{1,80}$/', $s) === 1;
}
function cat_slugify($s) {
    $s = mb_strtolower(trim((string)$s), 'UTF-8');
    $translit = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
    if ($translit !== false) $s = $translit;
    $s = strtolower($s);
    $s = preg_replace('/[^a-z0-9]+/', '-', $s);
    $s = trim($s, '-');
    return $s === '' ? '' : substr($s, 0, 81);
}
function cat_slug_taken($tiles, $slug, $exceptId = null) {
    foreach ($tiles as $t) {
        if ((string)($t['id'] ?? '') === (string)$slug && (string)$slug !== (string)$exceptId) return true;
    }
    // Папка уже существует (даже если в JSON её нет) — тоже занято.
    if (is_dir(cat_tiles_dir() . '/' . $slug) && (string)$slug !== (string)$exceptId) return true;
    return false;
}

/* ================================================================
   Загрузка файлов
================================================================ */
function cat_allowed_image($tmp, $name) {
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true)) return false;
    $mime = '';
    if (function_exists('finfo_open')) {
        $fi = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($fi, $tmp);
        finfo_close($fi);
    } elseif (function_exists('getimagesize')) {
        $info = @getimagesize($tmp);
        $mime = $info['mime'] ?? '';
    }
    return in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true);
}
function cat_safe_filename($name) {
    $ext  = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    $base = pathinfo($name, PATHINFO_FILENAME);
    $translit = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $base);
    if ($translit !== false) $base = $translit;
    $base = preg_replace('/[^A-Za-z0-9._-]+/', '_', $base);
    $base = trim($base, '._-');
    if ($base === '') $base = 'img';
    return substr($base, 0, 60) . ($ext ? '.' . $ext : '');
}
/* Идемпотентное добавление префикса: если уже есть — не дублируем. */
function cat_apply_prefix($prefix, $filename) {
    if (strpos($filename, $prefix) === 0) return $filename;
    return $prefix . $filename;
}
/* Перемещает загруженный файл в папку плитки с нужным префиксом.
   Возвращает относительный путь (images/tiles/slug/PREFIX_name) или ['error'=>...]. */
function cat_store_upload($file, $slug, $prefix) {
    if (!isset($file['error']) || $file['error'] === UPLOAD_ERR_NO_FILE) return null; // ничего не загружали
    if ($file['error'] !== UPLOAD_ERR_OK) return ['error' => 'Ошибка загрузки файла (код ' . $file['error'] . ').'];
    if ($file['size'] > 30 * 1024 * 1024)  return ['error' => 'Файл больше 30 МБ.'];
    if (!cat_allowed_image($file['tmp_name'], $file['name'])) return ['error' => 'Допустимы только JPG, PNG или WEBP.'];

    $dir = cat_tiles_dir() . '/' . $slug;
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) return ['error' => 'Не удалось создать папку плитки.'];

    // Детерминированное имя: <ПРЕФИКС><slug>.<ext> — уникально для каждого слота плитки,
    // не зависит от исходного имени (кириллица не выбрасывается, столкновения имён исключены),
    // повторная загрузка того же слота чисто перезаписывает файл.
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true)) $ext = 'jpg';
    $fname = $prefix . $slug . '.' . $ext;
    $dest  = $dir . '/' . $fname;

    if (!@move_uploaded_file($file['tmp_name'], $dest)) {
        if (!@rename($file['tmp_name'], $dest)) return ['error' => 'Не удалось сохранить файл на сервере.'];
    }
    @chmod($dest, 0644);
    return 'images/tiles/' . $slug . '/' . $fname;
}
/* Удаляет старый файл слота, если он отличается от нового (чтобы не плодить «сирот»). */
function cat_remove_old($oldRel, $newRel) {
    if (!$oldRel || $oldRel === $newRel) return;
    $abs = cat_root() . '/' . ltrim($oldRel, '/');
    $base = realpath(cat_tiles_dir());
    $real = realpath($abs);
    if ($real && $base && strpos($real, $base) === 0 && is_file($real)) @unlink($real);
}

/* ================================================================
   Средний цвет R0 (GD) → hex
================================================================ */
function cat_avg_hex($relPath) {
    $fallback = '#D9D5CE';
    if (!$relPath || !function_exists('imagecreatetruecolor')) return $fallback;
    $abs = cat_root() . '/' . ltrim($relPath, '/');
    if (!is_file($abs)) return $fallback;
    $ext = strtolower(pathinfo($abs, PATHINFO_EXTENSION));
    $src = null;
    if (($ext === 'jpg' || $ext === 'jpeg') && function_exists('imagecreatefromjpeg')) $src = @imagecreatefromjpeg($abs);
    elseif ($ext === 'png'  && function_exists('imagecreatefrompng'))  $src = @imagecreatefrompng($abs);
    elseif ($ext === 'webp' && function_exists('imagecreatefromwebp')) $src = @imagecreatefromwebp($abs);
    if (!$src) return $fallback;

    $w = imagesx($src); $h = imagesy($src);
    $small = imagecreatetruecolor(1, 1);
    imagecopyresampled($small, $src, 0, 0, 0, 0, 1, 1, $w, $h);
    $rgb = imagecolorat($small, 0, 0);
    imagedestroy($small); imagedestroy($src);
    $r = ($rgb >> 16) & 0xFF; $g = ($rgb >> 8) & 0xFF; $b = $rgb & 0xFF;
    return sprintf('#%02X%02X%02X', $r, $g, $b);
}
function cat_valid_hex($s) {
    return is_string($s) && preg_match('/^#[0-9A-Fa-f]{6}$/', $s) === 1;
}

/* ================================================================
   Удаление плитки (запись + папка)
================================================================ */
function cat_rrmdir_guarded($absDir) {
    $base = realpath(cat_tiles_dir());
    $real = realpath($absDir);
    if (!$real || !$base || strpos($real, $base) !== 0 || $real === $base) return false; // защита от обхода
    foreach (scandir($real) as $f) {
        if ($f === '.' || $f === '..') continue;
        $p = $real . '/' . $f;
        is_dir($p) ? cat_rrmdir_guarded($p) : @unlink($p);
    }
    return @rmdir($real);
}
function cat_delete_tile(&$tiles, $id) {
    $i = cat_find_index($tiles, $id);
    if ($i < 0) return false;
    if (empty($tiles[$i]['hasRealImg'])) return false;        // удаляем только реальные
    $slug = (string)$tiles[$i]['id'];
    array_splice($tiles, $i, 1);
    if (cat_valid_slug($slug)) cat_rrmdir_guarded(cat_tiles_dir() . '/' . $slug);
    return true;
}

/* ================================================================
   Изменение порядка реальных плиток.
   $orderedIds — id реальных плиток в нужном порядке. Плитки из списка
   встают первыми в заданном порядке; всё, что не попало в список
   (на всякий случай), дописывается следом в исходном порядке.
================================================================ */
function cat_reorder_tiles(&$tiles, $orderedIds) {
    $byId = [];
    foreach ($tiles as $t) {
        $id = (string)($t['id'] ?? '');
        if ($id !== '') $byId[$id] = $t;
    }
    $seen = [];
    $new  = [];
    foreach ((array)$orderedIds as $id) {
        $id = (string)$id;
        if (isset($byId[$id]) && !empty($byId[$id]['hasRealImg']) && !isset($seen[$id])) {
            $new[]      = $byId[$id];
            $seen[$id]  = true;
        }
    }
    foreach ($tiles as $t) {                       // дописываем не попавшее в список
        $id = (string)($t['id'] ?? '');
        if (!isset($seen[$id])) { $new[] = $t; $seen[$id] = true; }
    }
    $tiles = $new;
    return true;
}

/* ================================================================
   Сборка/слияние записи плитки из данных формы
================================================================ */
function cat_collect_attributes($postAttr) {
    // $postAttr: [ ['name'=>..,'values'=>[..]], ... ] → attribute1..attribute50
    $out = [];
    if (!is_array($postAttr)) return $out;
    $n = 0;
    foreach ($postAttr as $row) {
        if ($n >= 50) break;
        $name = trim((string)($row['name'] ?? ''));
        if ($name === '') continue;
        $vals = [];
        foreach ((array)($row['values'] ?? []) as $v) {
            $v = trim((string)$v);
            if ($v !== '' && count($vals) < 10) $vals[] = $v;
        }
        $n++;
        $out['attribute' . $n] = ['name' => $name, 'values' => $vals];
    }
    return $out;
}
