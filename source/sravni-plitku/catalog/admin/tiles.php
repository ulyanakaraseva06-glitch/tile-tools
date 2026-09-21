<?php
/* ================================================================
   catalog/admin/tiles.php — список реальных плиток.
   Поиск по имени + фильтры (как на сайте) + редактирование + удаление.
   Удаление и массовое удаление требуют подтверждения.
   Доступ — только администратор.
================================================================ */
require_once __DIR__ . '/../functions.php';
$admin = require_admin();

$filterKeys   = cat_filter_keys();
$filterLabels = ['color' => 'Цвет', 'size' => 'Размер', 'surface' => 'Поверхность', 'design' => 'Дизайн'];

/* ---- POST: удаление / массовое удаление ---- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_check($_POST['csrf'] ?? '')) { header('Location: tiles.php?msg=' . urlencode('Сессия устарела.')); exit; }
    $action = $_POST['action'] ?? '';
    $tiles  = cat_load_tiles();

    if ($action === 'delete') {
        $ok = cat_delete_tile($tiles, (string)($_POST['id'] ?? ''));
        cat_save_tiles($tiles);
        header('Location: tiles.php?msg=' . urlencode($ok ? 'Плитка удалена.' : 'Не удалось удалить плитку.'));
        exit;
    }
    if ($action === 'bulk_delete') {
        $ids = (array)($_POST['ids'] ?? []);
        $n = 0;
        foreach ($ids as $id) if (cat_delete_tile($tiles, (string)$id)) $n++;
        cat_save_tiles($tiles);
        header('Location: tiles.php?msg=' . urlencode("Удалено плиток: $n."));
        exit;
    }
    if ($action === 'reorder') {
        $ids = [];
        foreach (explode(',', (string)($_POST['order_ids'] ?? '')) as $x) {
            $x = trim($x);
            if ($x !== '') $ids[] = $x;
        }
        cat_reorder_tiles($tiles, $ids);
        cat_save_tiles($tiles);
        header('Location: tiles.php?msg=' . urlencode('Порядок плиток сохранён.'));
        exit;
    }
    header('Location: tiles.php'); exit;
}

/* ---- данные + фильтрация ---- */
$tiles   = cat_real_tiles(cat_load_tiles());
$filters = cat_load_filters();

$q = trim((string)($_GET['q'] ?? ''));
$active = [];
foreach ($filterKeys as $k) { $v = trim((string)($_GET[$k] ?? '')); if ($v !== '') $active[$k] = $v; }

$list = array_filter($tiles, function ($t) use ($q, $active, $filterKeys) {
    if ($q !== '' && mb_stripos((string)($t['name'] ?? ''), $q) === false
                  && mb_stripos((string)($t['shortName'] ?? ''), $q) === false) return false;
    foreach ($active as $k => $v) {
        $vals = isset($t[$k]) && is_array($t[$k]) ? $t[$k] : (isset($t[$k]) ? [$t[$k]] : []);
        if (!in_array($v, $vals, true)) return false;
    }
    return true;
});
$list = array_values($list);
$msg  = trim((string)($_GET['msg'] ?? ''));
?>
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Каталог плитки — управление</title>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../auth/auth.css">
<link rel="stylesheet" href="../catalog.css">
</head>
<body>
<header class="topbar">
  <div class="brand">Каталог плитки</div>
  <nav>
    <a class="btn btn--ghost btn--sm" href="../../auth/admin.php">Админка</a>
    <a class="btn btn--ghost btn--sm" href="../../analytics/admin/dashboard.php">Аналитика</a>
    <a class="btn btn--ghost btn--sm" href="../../index.php">← К визуализатору</a>
    <a class="btn btn--neutral btn--sm" href="../../auth/logout.php">Выйти</a>
  </nav>
</header>

<div class="page">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
    <div>
      <h1>Плитки <span class="count-badge"><?= count($tiles) ?></span></h1>
      <p class="muted">Только реальные плитки. Демо-плитки каталога здесь не отображаются.</p>
    </div>
    <a class="btn btn--primary" href="tile_form.php?mode=create" style="width:auto;padding:11px 22px">+ Добавить плитку</a>
  </div>

  <?php if ($msg): ?><div class="alert alert--ok"><?= h($msg) ?></div><?php endif; ?>

  <!-- ПОИСК + ФИЛЬТРЫ -->
  <div class="panel">
    <form method="get" class="search-bar">
      <input type="text" name="q" value="<?= h($q) ?>" placeholder="Поиск по названию…" class="search-input">
      <?php foreach ($filterKeys as $k):
        $vals = isset($filters[$k]['values']) && is_array($filters[$k]['values']) ? $filters[$k]['values'] : []; ?>
        <select name="<?= h($k) ?>">
          <option value=""><?= h($filterLabels[$k]) ?>: все</option>
          <?php foreach ($vals as $v): ?>
            <option value="<?= h($v) ?>" <?= (($active[$k] ?? '') === $v) ? 'selected' : '' ?>><?= h($v) ?></option>
          <?php endforeach; ?>
        </select>
      <?php endforeach; ?>
      <button type="submit" class="btn btn--ghost btn--sm">Найти</button>
      <a class="btn btn--neutral btn--sm" href="tiles.php">Сброс</a>
    </form>
  </div>

  <!-- СПИСОК -->
  <form method="post" id="bulkForm">
    <input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>">
    <input type="hidden" name="action" value="bulk_delete">

    <div class="panel">
      <div class="list-toolbar">
        <label class="chk" id="selAllWrap"><input type="checkbox" id="selAll"> <span>Выбрать все</span></label>
        <button type="button" class="btn btn--danger btn--sm" id="bulkBtn" disabled>Удалить выбранные (<span id="selCount">0</span>)</button>
        <button type="button" class="btn btn--ghost btn--sm" id="reorderBtn">Изменить порядок плитки</button>
        <span class="reorder-hint" id="reorderHint">Отметьте галочками плитки и перетащите за ⠿. Без галочек тянется одна.</span>
        <button type="button" class="btn btn--primary btn--sm" id="saveOrderBtn">Сохранить порядок</button>
        <button type="button" class="btn btn--neutral btn--sm" id="cancelOrderBtn">Отмена</button>
      </div>

      <?php if (!$list): ?>
        <p class="muted" style="margin:14px 0 0">Плитки не найдены. <a href="tile_form.php?mode=create">Добавить первую →</a></p>
      <?php else: ?>
        <div class="tile-list" id="tileList">
          <?php foreach ($list as $t):
            $img = !empty($t['tileImg']) ? '../../' . $t['tileImg'] : '';
            $meta = trim((isset($t['size']) && $t['size'] ? implode(', ', (array)$t['size']) : '')
                  . ((isset($t['surface']) && $t['surface']) ? ' · ' . implode(', ', (array)$t['surface']) : '')); ?>
            <div class="tile-row" data-id="<?= h((string)$t['id']) ?>">
              <span class="drag-handle" title="Перетащить" aria-hidden="true">
                <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor"><circle cx="4" cy="4" r="1.6"/><circle cx="10" cy="4" r="1.6"/><circle cx="4" cy="10" r="1.6"/><circle cx="10" cy="10" r="1.6"/><circle cx="4" cy="16" r="1.6"/><circle cx="10" cy="16" r="1.6"/></svg>
              </span>
              <label class="chk row-chk"><input type="checkbox" name="ids[]" value="<?= h((string)$t['id']) ?>" class="rowSel"></label>
              <div class="tile-mini" style="background:<?= h($t['hex'] ?? '#E0DDD8') ?>">
                <?php if ($img): ?><img src="<?= h($img) ?>" alt="" loading="lazy" onerror="this.style.display='none'"><?php endif; ?>
              </div>
              <div class="tile-meta">
                <strong><?= h((string)($t['shortName'] ?? $t['name'])) ?></strong>
                <span class="muted-sm"><?= h((string)($t['brand'] ?? '')) ?><?= $meta ? ' · ' . h($meta) : '' ?></span>
                <span class="slug-tag"><?= h((string)$t['id']) ?></span>
              </div>
              <div class="tile-actions">
                <a class="btn btn--ghost btn--sm" href="tile_form.php?mode=edit&id=<?= h(urlencode((string)$t['id'])) ?>">Редактировать</a>
                <button type="button" class="btn btn--danger btn--sm js-del"
                        data-id="<?= h((string)$t['id']) ?>"
                        data-name="<?= h((string)($t['shortName'] ?? $t['name'])) ?>">Удалить</button>
              </div>
            </div>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
    </div>
  </form>
</div>

<!-- скрытая форма одиночного удаления -->
<form method="post" id="delForm" style="display:none">
  <input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>">
  <input type="hidden" name="action" value="delete">
  <input type="hidden" name="id" id="delId">
</form>

<!-- скрытая форма сохранения порядка -->
<form method="post" id="reorderForm" style="display:none">
  <input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>">
  <input type="hidden" name="action" value="reorder">
  <input type="hidden" name="order_ids" id="orderIds">
</form>

<script src="vendor/Sortable.min.js"></script>

<script>
/* одиночное удаление — с подтверждением */
document.querySelectorAll('.js-del').forEach(btn => {
  btn.addEventListener('click', () => {
    const name = btn.dataset.name || 'плитку';
    if (confirm('Удалить «' + name + '»?\nБудут удалены запись из каталога и все файлы плитки на сервере. Действие необратимо.')) {
      document.getElementById('delId').value = btn.dataset.id;
      document.getElementById('delForm').submit();
    }
  });
});

/* массовое удаление */
const selAll = document.getElementById('selAll');
const rowSels = () => Array.from(document.querySelectorAll('.rowSel'));
const bulkBtn = document.getElementById('bulkBtn');
const selCount = document.getElementById('selCount');
function refreshSel() {
  const n = rowSels().filter(c => c.checked).length;
  selCount.textContent = n;
  bulkBtn.disabled = n === 0;
}
if (selAll) selAll.addEventListener('change', () => { rowSels().forEach(c => c.checked = selAll.checked); refreshSel(); });
rowSels().forEach(c => c.addEventListener('change', refreshSel));
if (bulkBtn) bulkBtn.addEventListener('click', () => {
  const n = rowSels().filter(c => c.checked).length;
  if (n === 0) return;
  if (confirm('Удалить выбранные плитки: ' + n + ' шт.?\nБудут удалены записи и все файлы этих плиток на сервере. Действие необратимо.')) {
    document.getElementById('bulkForm').submit();
  }
});
refreshSel();

/* ---- режим изменения порядка (SortableJS + MultiDrag) ---- */
let sortable = null;
const tileList     = document.getElementById('tileList');
const reorderBtn   = document.getElementById('reorderBtn');
const saveOrderBtn = document.getElementById('saveOrderBtn');
const cancelOrderBtn = document.getElementById('cancelOrderBtn');

/* Галочки всегда отражают реальный выбор Sortable (класс is-sel) —
   единый источник правды, без рассинхрона по любым путям выбора. */
function syncChecks() {
  if (!tileList) return;
  tileList.querySelectorAll('.tile-row').forEach(r => {
    const c = r.querySelector('.rowSel');
    if (c) c.checked = r.classList.contains('is-sel');
  });
}

function enterReorder() {
  document.body.classList.add('reorder-on');
  rowSels().forEach(c => { c.checked = false; });   // начинаем с чистого выбора
  refreshSel();
  if (!sortable && tileList && window.Sortable) {
    // В полной сборке SortableJS плагин MultiDrag уже примонтирован — mount() не нужен.
    sortable = new Sortable(tileList, {
      draggable: '.tile-row',
      handle: '.drag-handle',     // перетаскивание только за «ручку»
      multiDrag: true,
      selectedClass: 'is-sel',
      animation: 150,
      fallbackTolerance: 4,
      // Свой движок перетаскивания вместо нативного DnD:
      // браузер не блокирует колесо мыши и автоскролл работает плавно.
      forceFallback: true,
      // Автопрокрутка окна у краёв. Большая зона срабатывания (110px),
      // чтобы триггер сверху доставал из-под залипающей шапки.
      scroll: true,
      bubbleScroll: true,
      forceAutoScrollFallback: true,
      scrollSensitivity: 110,
      scrollSpeed: 18,
      onSelect: syncChecks,
      onDeselect: syncChecks,
      onEnd: syncChecks,
    });
  }
}

if (reorderBtn) reorderBtn.addEventListener('click', enterReorder);
if (cancelOrderBtn) cancelOrderBtn.addEventListener('click', () => window.location.reload());

/* Галочка управляет групповым выбором перетаскивания */
rowSels().forEach(c => c.addEventListener('change', () => {
  if (!document.body.classList.contains('reorder-on') || !sortable || !window.Sortable) return;
  const row = c.closest('.tile-row');
  if (!row) return;
  if (c.checked) Sortable.utils.select(row);
  else Sortable.utils.deselect(row);
}));

if (saveOrderBtn) saveOrderBtn.addEventListener('click', () => {
  const ids = Array.from(tileList.querySelectorAll('.tile-row')).map(r => r.dataset.id).filter(Boolean);
  document.getElementById('orderIds').value = ids.join(',');
  document.getElementById('reorderForm').submit();
});

</script>
</body>
</html>
