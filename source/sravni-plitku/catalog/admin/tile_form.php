<?php
/* ================================================================
   catalog/admin/tile_form.php — добавление / редактирование плитки.
   Доступ — только администратор.
================================================================ */
require_once __DIR__ . '/../functions.php';
$admin = require_admin();

$rooms       = cat_rooms();
$filterKeys  = cat_filter_keys();
$filterLabels = ['color' => 'Цвет', 'size' => 'Размер', 'surface' => 'Поверхность', 'design' => 'Дизайн'];

$tiles   = cat_load_tiles();
$filters = cat_load_filters();

$mode = ($_GET['mode'] ?? $_POST['mode'] ?? 'create') === 'edit' ? 'edit' : 'create';
$id   = trim((string)($_GET['id'] ?? $_POST['id'] ?? ''));
$errors = [];

/* ---- Текущая плитка (для edit) ---- */
$tile = null;
if ($mode === 'edit') {
    $idx = cat_find_index($tiles, $id);
    if ($idx < 0 || empty($tiles[$idx]['hasRealImg'])) { header('Location: tiles.php?msg=' . urlencode('Плитка не найдена.')); exit; }
    $tile = $tiles[$idx];
}

/* ================================================================
   POST — сохранение
================================================================ */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_check($_POST['csrf'] ?? '')) { $errors[] = 'Сессия устарела, обновите страницу.'; }

    $name      = trim((string)($_POST['name'] ?? ''));
    $shortName = trim((string)($_POST['shortName'] ?? ''));
    $brand     = trim((string)($_POST['brand'] ?? ''));

    /* --- слаг/папка --- */
    if ($mode === 'create') {
        $slug = strtolower(trim((string)($_POST['slug'] ?? '')));   // регистр приводим к нижнему
        if (!cat_valid_slug($slug))            $errors[] = 'Имя папки: только строчная латиница, цифры и дефис (2–81 символ), напр. italon-voyager-grey-60x60.';
        elseif (cat_slug_taken($tiles, $slug)) $errors[] = 'Папка с таким именем уже существует — выберите другое.';
    } else {
        $slug = (string)$tile['id'];
    }

    if ($name === '') $errors[] = 'Укажите имя плитки.';

    /* --- фильтры: выбранные + новые значения (с дозаписью в filters.json) --- */
    $tileFilterVals = [];
    foreach ($filterKeys as $k) {
        if (!isset($filters[$k]) || !is_array($filters[$k])) $filters[$k] = ['label' => $filterLabels[$k], 'values' => []];
        if (!isset($filters[$k]['values']) || !is_array($filters[$k]['values'])) $filters[$k]['values'] = [];

        $sel = array_map('strval', (array)($_POST['f_' . $k] ?? []));
        $sel = array_filter(array_map('trim', $sel), function($v){ return $v !== ''; });

        // новые значения: через запятую или с новой строки
        $newRaw = (string)($_POST['newf_' . $k] ?? '');
        $newVals = array_filter(array_map('trim', preg_split('/[,\n\r]+/', $newRaw)), function($v){ return $v !== ''; });
        foreach ($newVals as $nv) {
            $nv = mb_substr($nv, 0, 40);
            if (!in_array($nv, $filters[$k]['values'], true)) {
                $filters[$k]['values'][] = $nv;
                if ($k === 'color') {
                    if (!isset($filters[$k]['swatches']) || !is_array($filters[$k]['swatches'])) $filters[$k]['swatches'] = [];
                    if (!isset($filters[$k]['swatches'][$nv])) $filters[$k]['swatches'][$nv] = '#CCCCCC';
                }
            }
        }
        $tileFilterVals[$k] = array_values(array_unique(array_merge($sel, $newVals)));
    }

    /* --- кастомные атрибуты --- */
    $attrs = cat_collect_attributes($_POST['attr'] ?? []);

    /* --- загрузка файлов (после прохождения базовых проверок) --- */
    $uploadedR0  = null;
    $uploadedRen = [];  // roomId => relpath
    if (!$errors) {
        // R0 — фото самой плитки
        $r0 = cat_store_upload($_FILES['img_r0'] ?? [], $slug, 'R0_');
        if (is_array($r0) && isset($r0['error'])) $errors[] = 'R0 (фото плитки): ' . $r0['error'];
        elseif ($r0) $uploadedR0 = $r0;

        // R1–R5 — рендеры по комнатам
        foreach ($rooms as $room) {
            $f = $_FILES['img_' . $room['id']] ?? [];
            $res = cat_store_upload($f, $slug, $room['prefix']);
            if (is_array($res) && isset($res['error'])) $errors[] = $room['name'] . ' (' . rtrim($room['prefix'], '_') . '): ' . $res['error'];
            elseif ($res) $uploadedRen[$room['id']] = $res;
        }
    }

    /* --- обязательность изображений --- */
    if (!$errors) {
        $haveR0  = $uploadedR0 || ($mode === 'edit' && !empty($tile['tileImg']));
        $existingRen = ($mode === 'edit' && !empty($tile['renders'])) ? $tile['renders'] : [];
        $haveRender = !empty($uploadedRen) || !empty($existingRen);
        if (!$haveR0)     $errors[] = 'Загрузите фото самой плитки (R0).';
        if (!$haveRender) $errors[] = 'Загрузите хотя бы один ракурс (R1–R5).';
    }

    /* --- собрать запись и сохранить --- */
    if (!$errors) {
        $rec = ($mode === 'edit') ? $tile : ['id' => $slug, 'folder' => $slug, 'hasRealImg' => true];
        $rec['id']         = $slug;
        $rec['folder']     = $slug;
        $rec['hasRealImg'] = true;
        $rec['name']       = $name;
        $rec['shortName']  = $shortName !== '' ? $shortName : $name;
        $rec['brand']      = $brand;
        foreach ($filterKeys as $k) $rec[$k] = $tileFilterVals[$k];

        // Все новые пути этого сохранения — чтобы очистка старого файла одного слота
        // не удалила файл, только что записанный другим слотом.
        $newPaths = [];
        if ($uploadedR0) $newPaths[] = $uploadedR0;
        foreach ($uploadedRen as $rel) $newPaths[] = $rel;

        // R0
        if ($uploadedR0) {
            $old = $rec['tileImg'] ?? '';
            if ($old && !in_array($old, $newPaths, true)) cat_remove_old($old, $uploadedR0);
            $rec['tileImg'] = $uploadedR0;
        }
        if (empty($rec['tileImg'])) $rec['tileImg'] = '';

        // renders (merge: новые перекрывают, существующие сохраняются)
        if (!isset($rec['renders']) || !is_array($rec['renders'])) $rec['renders'] = [];
        foreach ($uploadedRen as $rid => $rel) {
            $old = $rec['renders'][$rid] ?? '';
            if ($old && !in_array($old, $newPaths, true)) cat_remove_old($old, $rel);
            $rec['renders'][$rid] = $rel;
        }

        // hex: если админ не трогал поле — берём авто-средний из (нового) R0
        $hexPosted   = (string)($_POST['hex'] ?? '');
        $hexOriginal = (string)($_POST['hex_original'] ?? '');
        $hex = cat_valid_hex($hexPosted) ? $hexPosted : '';
        if (($hex === '' || $hex === $hexOriginal) && $uploadedR0) $hex = cat_avg_hex($uploadedR0);
        if ($hex === '') $hex = $hexOriginal !== '' ? $hexOriginal : ($rec['hex'] ?? '#D9D5CE');
        $rec['hex'] = $hex;

        // атрибуты: удаляем прежние attributeN, пишем новые
        foreach (array_keys($rec) as $key) if (preg_match('/^attribute\d+$/', $key)) unset($rec[$key]);
        foreach ($attrs as $key => $val) $rec[$key] = $val;

        // запись в массив
        $idx = cat_find_index($tiles, $slug);
        if ($idx >= 0) $tiles[$idx] = $rec; else $tiles[] = $rec;

        $okT = cat_save_tiles($tiles);
        $okF = cat_save_filters($filters);
        if ($okT && $okF) { header('Location: tiles.php?msg=' . urlencode('Плитка сохранена: ' . $name)); exit; }
        $errors[] = 'Не удалось записать файлы каталога (проверьте права на запись catalog/*.json).';
    }

    // при ошибке — показать форму с введёнными значениями
    $tile = [
        'id' => $slug, 'folder' => $slug, 'name' => $name, 'shortName' => $shortName, 'brand' => $brand,
        'hex' => (string)($_POST['hex'] ?? ($tile['hex'] ?? '#D9D5CE')),
        'tileImg' => $tile['tileImg'] ?? '', 'renders' => $tile['renders'] ?? [],
    ];
    foreach ($filterKeys as $k) $tile[$k] = $tileFilterVals[$k] ?? [];
    $tile['_attrs'] = $attrs;
}

/* ---- значения для отображения ---- */
function cat_field_vals($tile, $k) { return isset($tile[$k]) && is_array($tile[$k]) ? $tile[$k] : []; }
$curHex = $tile['hex'] ?? '#D9D5CE';
$pageTitle = $mode === 'edit' ? 'Редактирование плитки' : 'Новая плитка';

// атрибуты для предзаполнения (edit или повтор после ошибки)
$attrRows = [];
if (isset($tile['_attrs'])) {
    foreach ($tile['_attrs'] as $a) $attrRows[] = $a;
} elseif ($tile) {
    for ($i = 1; $i <= 50; $i++) if (!empty($tile['attribute' . $i]['name'])) $attrRows[] = $tile['attribute' . $i];
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= h($pageTitle) ?> — Каталог</title>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../auth/auth.css">
<link rel="stylesheet" href="../catalog.css">
</head>
<body>
<header class="topbar">
  <div class="brand">Каталог · <?= $mode === 'edit' ? 'редактирование' : 'добавление' ?></div>
  <nav>
    <a class="btn btn--ghost btn--sm" href="tiles.php">← К списку плиток</a>
    <a class="btn btn--ghost btn--sm" href="../../auth/admin.php">Админка</a>
    <a class="btn btn--neutral btn--sm" href="../../auth/logout.php">Выйти</a>
  </nav>
</header>

<div class="page">
  <h1><?= h($pageTitle) ?></h1>
  <p class="muted"><?= $mode === 'edit' ? 'Папка: ' . h((string)$tile['id']) : 'Заполните параметры новой плитки. Поля со звёздочкой обязательны.' ?></p>

  <?php foreach ($errors as $e): ?>
    <div class="alert alert--err"><?= h($e) ?></div>
  <?php endforeach; ?>

  <form method="post" enctype="multipart/form-data" id="tileForm">
    <input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>">
    <input type="hidden" name="mode" value="<?= h($mode) ?>">
    <input type="hidden" name="id" value="<?= h((string)($tile['id'] ?? '')) ?>">
    <input type="hidden" name="hex_original" value="<?= h($curHex) ?>">

    <!-- ОСНОВНОЕ -->
    <div class="panel">
      <h2>Основное</h2>
      <div class="field">
        <label>Имя папки на сервере <span class="req">*</span> <span class="hint">строчная латиница/цифры/дефис; создаётся в images/tiles/</span></label>
        <?php if ($mode === 'edit'): ?>
          <input type="text" value="<?= h((string)$tile['id']) ?>" disabled>
          <div class="hint">Имя папки нельзя изменить после создания.</div>
        <?php else: ?>
          <input type="text" name="slug" id="slug" placeholder="italon-voyager-grey-60x60" value="<?= h((string)($tile['folder'] ?? '')) ?>" autocomplete="off">
        <?php endif; ?>
      </div>
      <div class="row2">
        <div class="field">
          <label>Имя плитки <span class="req">*</span></label>
          <input type="text" name="name" id="name" placeholder="Керамогранит ... 60x60" value="<?= h((string)($tile['name'] ?? '')) ?>">
        </div>
        <div class="field">
          <label>Короткое имя <span class="hint">(для карточки; по умолчанию = имя)</span></label>
          <input type="text" name="shortName" placeholder="Voyager Grey" value="<?= h((string)($tile['shortName'] ?? '')) ?>">
        </div>
      </div>
      <div class="field">
        <label>Бренд <span class="hint">(важный, но необязательный атрибут)</span></label>
        <input type="text" name="brand" placeholder="Italon" value="<?= h((string)($tile['brand'] ?? '')) ?>">
      </div>
    </div>

    <!-- ИЗОБРАЖЕНИЯ -->
    <div class="panel">
      <h2>Изображения</h2>
      <div class="field">
        <label>R0 — фото самой плитки <span class="req">*</span> <span class="hint">префикс R0_ добавится автоматически</span></label>
        <?php if (!empty($tile['tileImg'])): ?>
          <div class="cur-file">Текущий: <?= h(basename($tile['tileImg'])) ?> <span class="hint">(можно заменить)</span></div>
        <?php endif; ?>
        <input type="file" name="img_r0" accept=".jpg,.jpeg,.png,.webp">
      </div>

      <div class="hint" style="margin:10px 0 6px">Ракурсы R1–R5 (рендер плитки в интерьере). Хотя бы один обязателен; на остальных — градиентная заглушка.</div>
      <div class="render-grid">
        <?php foreach ($rooms as $room): $rid = $room['id']; $cur = $tile['renders'][$rid] ?? ''; ?>
          <div class="render-slot">
            <div class="render-thumb">
              <img src="../../<?= h($room['base']) ?>" alt="<?= h($room['name']) ?>" loading="lazy">
              <span class="render-tag"><?= rtrim($room['prefix'], '_') ?></span>
            </div>
            <div class="render-name"><?= h($room['name']) ?></div>
            <?php if ($cur): ?><div class="cur-file ok">✓ <?= h(basename($cur)) ?></div><?php endif; ?>
            <input type="file" name="img_<?= h($rid) ?>" accept=".jpg,.jpeg,.png,.webp">
          </div>
        <?php endforeach; ?>
      </div>

      <div class="field" style="margin-top:16px;max-width:280px">
        <label>Цвет-образец (hex) <span class="hint">авто из R0; можно поправить</span></label>
        <div class="hex-row">
          <input type="color" name="hex" id="hex" value="<?= h(cat_valid_hex($curHex) ? $curHex : '#D9D5CE') ?>">
          <span class="hex-val" id="hexVal"><?= h($curHex) ?></span>
        </div>
      </div>
    </div>

    <!-- ФИЛЬТРЫ -->
    <div class="panel">
      <h2>Фильтры</h2>
      <p class="hint" style="margin-bottom:14px">Можно выбрать несколько значений, либо ни одного. Если по фильтру ничего не выбрано — плитка попадает только в режим «Все значения» этого фильтра. Новые значения добавляются в общий список фильтров.</p>
      <div class="filters-grid">
        <?php foreach ($filterKeys as $k):
          $vals = isset($filters[$k]['values']) && is_array($filters[$k]['values']) ? $filters[$k]['values'] : [];
          $cur  = cat_field_vals($tile, $k); ?>
          <div class="filter-box">
            <div class="filter-box__title"><?= h($filterLabels[$k]) ?></div>
            <div class="chk-list">
              <?php foreach ($vals as $v): ?>
                <label class="chk"><input type="checkbox" name="f_<?= h($k) ?>[]" value="<?= h($v) ?>" <?= in_array($v, $cur, true) ? 'checked' : '' ?>> <span><?= h($v) ?></span></label>
              <?php endforeach; ?>
            </div>
            <input type="text" name="newf_<?= h($k) ?>" class="newf" placeholder="+ новые значения через запятую">
          </div>
        <?php endforeach; ?>
      </div>
    </div>

    <!-- АТРИБУТЫ -->
    <div class="panel">
      <h2>Доп. характеристики</h2>
      <p class="hint" style="margin-bottom:12px">До 50 параметров. У каждого — имя и до 10 значений. В базе сохраняются как attribute1, attribute2 … (можно править вручную в tiles.json). Выводятся в окне «инфо о плитке».</p>
      <div id="attrWrap"></div>
      <button type="button" class="btn btn--ghost btn--sm" id="addAttr">+ Добавить параметр</button>
      <span class="hint" id="attrCount" style="margin-left:10px"></span>
    </div>

    <div style="display:flex;gap:10px;margin:8px 0 40px">
      <button type="submit" class="btn btn--primary" style="width:auto;padding:11px 26px">Сохранить плитку</button>
      <a class="btn btn--neutral" href="tiles.php" style="padding:11px 22px">Отмена</a>
    </div>
  </form>
</div>

<script>
/* --- hex live --- */
const hexInput = document.getElementById('hex'), hexVal = document.getElementById('hexVal');
if (hexInput) hexInput.addEventListener('input', () => hexVal.textContent = hexInput.value.toUpperCase());

/* --- автоподсказка слага из имени (только create) --- */
const slugEl = document.getElementById('slug'), nameEl = document.getElementById('name');
function normSlug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+/, '');
}
if (slugEl && nameEl) {
  let touched = slugEl.value !== '';
  slugEl.addEventListener('input', () => {
    touched = true;
    const pos = slugEl.selectionStart;
    slugEl.value = normSlug(slugEl.value);   // приводим к допустимому виду прямо при вводе
    try { slugEl.setSelectionRange(pos, pos); } catch (_) {}
  });
  nameEl.addEventListener('input', () => {
    if (touched) return;
    slugEl.value = normSlug(nameEl.value).replace(/-+$/, '');
  });
}

/* --- динамические атрибуты --- */
const MAX_ATTR = 50, MAX_VAL = 10;
const wrap = document.getElementById('attrWrap');
const addAttrBtn = document.getElementById('addAttr');
const attrCount = document.getElementById('attrCount');

let attrSeq = 0;  // сквозной счётчик: индексы имён полей не переиспользуются после удаления
function attrCountNow() { return wrap.querySelectorAll('.attr-row').length; }
function refreshCount() {
  const n = attrCountNow();
  attrCount.textContent = n + ' / ' + MAX_ATTR;
  addAttrBtn.disabled = n >= MAX_ATTR;
}
function valueField(i, val) {
  const d = document.createElement('div');
  d.className = 'attr-val';
  d.innerHTML = '<input type="text" name="attr[' + i + '][values][]" placeholder="значение">'
    + '<button type="button" class="vrm" title="убрать">×</button>';
  d.querySelector('.vrm').addEventListener('click', () => d.remove());
  if (val != null) d.querySelector('input').value = val;
  return d;
}
function addAttr(name, values) {
  if (attrCountNow() >= MAX_ATTR) return;
  const i = attrSeq++;
  const row = document.createElement('div');
  row.className = 'attr-row';
  row.innerHTML =
    '<div class="attr-head">'
    + '<input type="text" name="attr[' + i + '][name]" class="attr-name" placeholder="параметр (напр. Морозостойкость)">'
    + '<button type="button" class="btn btn--neutral btn--sm attr-del">Удалить</button>'
    + '</div><div class="attr-vals"></div>'
    + '<button type="button" class="btn btn--ghost btn--sm add-val">+ значение</button>';
  if (name) row.querySelector('.attr-name').value = name;
  const vals = row.querySelector('.attr-vals');
  const list = (values && values.length) ? values : [''];
  list.slice(0, MAX_VAL).forEach(v => vals.appendChild(valueField(i, v)));
  row.querySelector('.add-val').addEventListener('click', () => {
    if (vals.querySelectorAll('.attr-val').length >= MAX_VAL) return;
    vals.appendChild(valueField(i, ''));
  });
  row.querySelector('.attr-del').addEventListener('click', () => { row.remove(); refreshCount(); });
  wrap.appendChild(row);
  refreshCount();
}
addAttrBtn.addEventListener('click', () => addAttr('', ['']));

/* предзаполнение существующими атрибутами */
const PRESET = <?= json_encode(array_map(function($a){ return ['name' => $a['name'] ?? '', 'values' => $a['values'] ?? []]; }, $attrRows), JSON_UNESCAPED_UNICODE) ?>;
PRESET.forEach(a => addAttr(a.name, a.values));
refreshCount();
</script>
</body>
</html>
